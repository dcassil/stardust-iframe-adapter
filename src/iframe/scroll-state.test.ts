import { describe, expect, it } from "vitest";
import { readScrollState } from "./scroll-state.js";

function fakeWindow(opts: {
  scrollX: number;
  scrollY: number;
  innerHeight: number;
  scrollHeight: number;
}): Window {
  return {
    scrollX: opts.scrollX,
    scrollY: opts.scrollY,
    innerHeight: opts.innerHeight,
    document: { body: { scrollHeight: opts.scrollHeight } },
  } as unknown as Window;
}

describe("readScrollState", () => {
  it("reports top when scrollY is 0 and carries scrollX in h", () => {
    const state = readScrollState(
      fakeWindow({ scrollX: 42, scrollY: 0, innerHeight: 500, scrollHeight: 2000 })
    );
    expect(state).toEqual({ h: 42, y: 0, isTop: true, isBottom: false });
  });

  it("reports bottom when scrolled to the end", () => {
    const state = readScrollState(
      fakeWindow({ scrollX: 0, scrollY: 1500, innerHeight: 500, scrollHeight: 2000 })
    );
    expect(state.isBottom).toBe(true);
    expect(state.isTop).toBe(false);
  });

  it("reports neither top nor bottom in the middle", () => {
    const state = readScrollState(
      fakeWindow({ scrollX: 0, scrollY: 300, innerHeight: 500, scrollHeight: 2000 })
    );
    expect(state.isTop).toBe(false);
    expect(state.isBottom).toBe(false);
  });
});
