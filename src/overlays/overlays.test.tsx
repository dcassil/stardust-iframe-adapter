// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { mapGeometry, type GeometryTransform } from "../host/mapGeometry.js";

/**
 * The overlays are thin adapters over colab's roster + Cursor/EditLock
 * interactions. We drive them by mocking colab's two React read hooks so the
 * geometry/mapping behavior can be asserted deterministically WITHOUT standing
 * up a live colab session — the presence CORE is colab's own tested concern;
 * what the adapter owns (mapGeometry projection + data-cms↔scopeId keying +
 * markup) is what these tests pin.
 */

const rosterState = { current: [] as { id: string; name: string; color: string }[] };
const cursorState = {
  current: [] as { participantId: string; point: { x: number; y: number } }[],
};
const lockState = { current: new Map<string, string>() };

vi.mock("colab-ui/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("colab-ui/react")>();
  return {
    ...actual,
    usePresence: () => rosterState.current,
    useInteraction: (interaction: { type?: string }) => {
      if (interaction.type === "edit-lock") {
        return {
          state: undefined,
          send: () => undefined,
          selectors: {
            isLocked: (scopeId: string) => lockState.current.has(scopeId),
            lockedBy: (scopeId: string) => lockState.current.get(scopeId) ?? null,
          },
        };
      }
      return {
        state: undefined,
        send: () => undefined,
        selectors: {
          remoteCursors: cursorState.current,
          presentCursors: () => cursorState.current,
        },
      };
    },
  };
});

const { RemoteCursors } = await import("./RemoteCursors.js");
const { EditLockIndicators } = await import("./EditLockIndicators.js");
type LockTarget = import("./EditLockIndicators.js").LockTarget;

beforeEach(() => {
  rosterState.current = [];
  cursorState.current = [];
  lockState.current = new Map();
});

describe("RemoteCursors (colab-backed)", () => {
  it("positions a cursor through mapGeometry, not raw normalized coords", () => {
    rosterState.current = [{ id: "A", name: "Ada", color: "#f00" }];
    cursorState.current = [{ participantId: "A", point: { x: 200, y: 300 } }];
    const transform: GeometryTransform = { scale: 0.5, scrollOffset: { x: 40, y: 60 } };

    const { container } = render(<RemoteCursors transform={transform} />);
    const cursor = container.querySelector<HTMLElement>('[data-presence-cursor="A"]');
    expect(cursor).not.toBeNull();

    const expected = mapGeometry(
      { top: 300, left: 200, right: 200, bottom: 300, width: 0, height: 0, x: 200, y: 300 },
      transform,
    );
    expect(cursor?.style.left).toBe(`${String(expected.left)}px`);
    expect(cursor?.style.top).toBe(`${String(expected.top)}px`);
    expect(cursor?.style.left).not.toBe("200px");
    expect(cursor?.textContent).toContain("Ada");
  });

  it("renders nothing for a participant with no colab cursor point", () => {
    rosterState.current = [{ id: "A", name: "Ada", color: "#f00" }];
    cursorState.current = [];
    const { container } = render(
      <RemoteCursors transform={{ scale: 1, scrollOffset: { x: 0, y: 0 } }} />,
    );
    expect(container.querySelector("[data-presence-cursor]")).toBeNull();
  });
});

const TARGETS: LockTarget[] = [
  {
    targetId: "t-hero",
    geometry: { top: 10, left: 20, right: 220, bottom: 110, width: 200, height: 100, x: 20, y: 10 },
  },
  {
    targetId: "t-list",
    geometry: { top: 200, left: 20, right: 220, bottom: 400, width: 200, height: 200, x: 20, y: 200 },
  },
];

describe("EditLockIndicators (colab-backed)", () => {
  const transform: GeometryTransform = { scale: 1, scrollOffset: { x: 0, y: 0 } };

  it("badges the locked target keyed by scopeId and never claims a merge", () => {
    rosterState.current = [{ id: "A", name: "Ada", color: "#f00" }];
    lockState.current = new Map([["t-hero", "A"]]);

    const { container } = render(
      <EditLockIndicators transform={transform} targets={TARGETS} />,
    );
    const heroLock = container.querySelector<HTMLElement>('[data-presence-lock="t-hero"]');
    expect(heroLock).not.toBeNull();
    expect(heroLock?.textContent).toBe("Ada is editing");
    expect(heroLock?.textContent).not.toMatch(/collaborat|co-edit|merge|conflict/i);
    expect(container.querySelector('[data-presence-lock="t-list"]')).toBeNull();
  });

  it("ignores a locked scope with no matching known target (no throw)", () => {
    rosterState.current = [{ id: "A", name: "Ada", color: "#f00" }];
    lockState.current = new Map([["t-missing", "A"]]);
    const { container } = render(
      <EditLockIndicators transform={transform} targets={TARGETS} />,
    );
    expect(container.querySelector("[data-presence-lock]")).toBeNull();
  });
});
