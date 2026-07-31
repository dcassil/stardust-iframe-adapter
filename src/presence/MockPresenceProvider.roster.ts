/**
 * Remote-participant roster for {@link MockPresenceProvider}. Split out of
 * `MockPresenceProvider.ts` to respect the module size budget; not part of the
 * public `./presence` surface.
 *
 * Tracks the last-seen time and participant snapshot for every remote peer, and
 * owns the stale-pruning sweep. Announcing our own identity in response to a
 * newly-seen peer is delegated back to the provider via the `announceSelf`
 * callback so the roster stays transport-agnostic.
 */

import type { Identity } from "./MockPresenceProvider.transport.js";
import type { Participant } from "./PresenceProvider.js";

interface RemoteRecord {
  participant: Participant;
  lastSeen: number;
}

export class PresenceRoster {
  private readonly remotes = new Map<string, RemoteRecord>();

  constructor(private readonly announceSelf: () => void) {}

  has(id: string): boolean {
    return this.remotes.has(id);
  }

  delete(id: string): boolean {
    return this.remotes.delete(id);
  }

  clear(): void {
    this.remotes.clear();
  }

  get(id: string): RemoteRecord | undefined {
    return this.remotes.get(id);
  }

  /** Ensure a record exists for an id we have not seen a `join` from yet. */
  ensure(id: string, now: number): RemoteRecord {
    let rec = this.remotes.get(id);
    if (!rec) {
      rec = { participant: { id, name: id, color: "#888888" }, lastSeen: now };
      this.remotes.set(id, rec);
      // Announce ourselves so the peer can fill in our identity too.
      this.announceSelf();
    } else {
      rec.lastSeen = now;
    }
    return rec;
  }

  /** Merge a peer's announced identity into its record (creating one if new). */
  touch(identity: Identity, now: number): void {
    const existing = this.remotes.get(identity.id);
    if (existing) {
      existing.participant = {
        ...existing.participant,
        name: identity.name,
        color: identity.color,
      };
      existing.lastSeen = now;
    } else {
      this.remotes.set(identity.id, {
        participant: {
          id: identity.id,
          name: identity.name,
          color: identity.color,
        },
        lastSeen: now,
      });
    }
  }

  /** Drop peers whose last message is older than `staleTimeoutMs`. */
  pruneStale(now: number, staleTimeoutMs: number): boolean {
    let changed = false;
    for (const [id, rec] of this.remotes) {
      if (now - rec.lastSeen > staleTimeoutMs) {
        this.remotes.delete(id);
        changed = true;
      }
    }
    return changed;
  }

  snapshot(): Participant[] {
    return [...this.remotes.values()].map((r) => ({ ...r.participant }));
  }
}
