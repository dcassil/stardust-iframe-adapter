/**
 * Vitest setup for React component tests.
 *
 * `IS_REACT_ACT_ENVIRONMENT` tells React that we are in a unit-test environment
 * so `act(...)` batching and warnings work correctly under jsdom.
 */
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

export {};
