// @vitest-environment jsdom
import { act } from "react";
import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { mapGeometry, type GeometryTransform } from "../host/mapGeometry.js";
import type {
  Participant,
  ParticipantsListener,
  PresenceProvider,
} from "./PresenceProvider.js";
import {
  EditLockIndicators,
  RemoteCursors,
  type LockTarget,
} from "./overlays.js";

/**
 * A controllable stub provider: `emit` pushes a participants array to all
 * subscribers synchronously so tests can drive the overlays deterministically.
 */
class StubProvider implements PresenceProvider {
  private readonly listeners = new Set<ParticipantsListener>();
  private current: Participant[] = [];

  publishPointer = (): void => undefined;
  publishEditContext = (): void => undefined;
  connect = (): void => undefined;
  disconnect = (): void => undefined;

  subscribe(cb: ParticipantsListener): () => void {
    this.listeners.add(cb);
    cb(this.current);
    return () => this.listeners.delete(cb);
  }

  emit(participants: Participant[]): void {
    this.current = participants;
    for (const cb of this.listeners) cb(participants);
  }
}

describe("RemoteCursors (TC-001)", () => {
  it("positions a cursor through the scale/scroll transform, not raw coords", () => {
    const provider = new StubProvider();
    let transform: GeometryTransform = {
      scale: 1,
      scrollOffset: { x: 0, y: 0 },
    };

    const { container, rerender } = render(
      <RemoteCursors provider={provider} transform={transform} />,
    );

    const pointer = { x: 200, y: 300 };
    act(() => {
      provider.emit([{ id: "A", name: "Ada", color: "#f00", pointer }]);
    });

    const cursor1 = container.querySelector<HTMLElement>(
      '[data-presence-cursor="A"]',
    );
    expect(cursor1).not.toBeNull();
    const expected1 = mapGeometry(
      { top: 300, left: 200, right: 200, bottom: 300, width: 0, height: 0, x: 200, y: 300 },
      transform,
    );
    expect(cursor1!.style.left).toBe(`${String(expected1.left)}px`);
    expect(cursor1!.style.top).toBe(`${String(expected1.top)}px`);

    // Change scale + scroll; the SAME pointer must move to the mapped position.
    transform = { scale: 0.5, scrollOffset: { x: 40, y: 60 } };
    rerender(<RemoteCursors provider={provider} transform={transform} />);
    act(() => {
      provider.emit([{ id: "A", name: "Ada", color: "#f00", pointer }]);
    });

    const cursor2 = container.querySelector<HTMLElement>(
      '[data-presence-cursor="A"]',
    );
    const expected2 = mapGeometry(
      { top: 300, left: 200, right: 200, bottom: 300, width: 0, height: 0, x: 200, y: 300 },
      transform,
    );
    expect(cursor2!.style.left).toBe(`${String(expected2.left)}px`);
    expect(cursor2!.style.top).toBe(`${String(expected2.top)}px`);
    // Confirm it is NOT the raw unscaled pointer.
    expect(cursor2!.style.left).not.toBe("200px");
  });

  it("removes a cursor when the participant leaves the list", () => {
    const provider = new StubProvider();
    const transform: GeometryTransform = { scale: 1, scrollOffset: { x: 0, y: 0 } };
    const { container } = render(
      <RemoteCursors provider={provider} transform={transform} />,
    );
    act(() => {
      provider.emit([
        { id: "A", name: "Ada", color: "#f00", pointer: { x: 1, y: 2 } },
      ]);
    });
    expect(container.querySelector('[data-presence-cursor="A"]')).not.toBeNull();
    act(() => { provider.emit([]); });
    expect(container.querySelector('[data-presence-cursor="A"]')).toBeNull();
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

describe("EditLockIndicators (TC-002)", () => {
  const transform: GeometryTransform = { scale: 1, scrollOffset: { x: 0, y: 0 } };

  it("renders an edit-lock indicator on the correct target and releases it", () => {
    const provider = new StubProvider();
    const { container } = render(
      <EditLockIndicators provider={provider} transform={transform} targets={TARGETS} />,
    );

    act(() => {
      provider.emit([
        { id: "A", name: "Ada", color: "#f00", editContext: { id: "c1", target: "t-hero" } },
      ]);
    });

    const heroLock = container.querySelector<HTMLElement>('[data-presence-lock="t-hero"]');
    expect(heroLock).not.toBeNull();
    expect(heroLock!.textContent).toBe("Ada is editing");
    expect(heroLock!.textContent).not.toMatch(/collaborat|co-edit|merge|conflict/i);
    expect(container.querySelector('[data-presence-lock="t-list"]')).toBeNull();

    // Grace edits t-list; Ada releases (editContext null -> absent).
    act(() => {
      provider.emit([
        { id: "B", name: "Grace", color: "#00f", editContext: { id: "c9", target: "t-list" } },
      ]);
    });

    const listLock = container.querySelector<HTMLElement>('[data-presence-lock="t-list"]');
    expect(listLock).not.toBeNull();
    expect(listLock!.textContent).toBe("Grace is editing");
    expect(container.querySelector('[data-presence-lock="t-hero"]')).toBeNull();
  });

  it("ignores an editContext pointing at an unknown target (no throw)", () => {
    const provider = new StubProvider();
    const { container } = render(
      <EditLockIndicators provider={provider} transform={transform} targets={TARGETS} />,
    );
    act(() => {
      provider.emit([
        { id: "A", name: "Ada", color: "#f00", editContext: { id: "c1", target: "t-missing" } },
      ]);
    });
    expect(container.querySelector("[data-presence-lock]")).toBeNull();
  });
});
