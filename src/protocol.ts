/**
 * Public `./protocol` entry — framework-agnostic types + registry marker.
 *
 * Imports zero React and zero DOM runtime code, so non-React and server-side
 * consumers (e.g. the SVER project) can depend on this subpath alone.
 */
export * from "./protocol/registry.js";
