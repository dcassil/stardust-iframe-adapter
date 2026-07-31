/**
 * Vitest setup for React component tests.
 *
 * `IS_REACT_ACT_ENVIRONMENT` tells React that we are in a unit-test environment
 * so `act(...)` batching and warnings work correctly under jsdom.
 */
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

/**
 * jsdom ships neither `ResizeObserver` nor `MutationObserver`-with-observe in a
 * usable form for our needs, and does not implement `requestAnimationFrame`
 * ergonomically for coalescing. Provide inert defaults so components that set up
 * the observer bundle can mount. Tests that assert observer behavior stub their
 * own controllable mocks over these via `vi.stubGlobal`.
 */
class InertObserver {
  observe = (): void => undefined;
  unobserve = (): void => undefined;
  disconnect = (): void => undefined;
  takeRecords(): [] {
    return [];
  }
}

const globalWithObservers = globalThis as {
  ResizeObserver?: unknown;
  MutationObserver?: unknown;
};
if (typeof globalWithObservers.ResizeObserver === "undefined") {
  globalWithObservers.ResizeObserver = InertObserver;
}
if (typeof globalWithObservers.MutationObserver === "undefined") {
  globalWithObservers.MutationObserver = InertObserver;
}

export {};
