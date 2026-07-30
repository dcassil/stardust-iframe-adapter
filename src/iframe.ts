/**
 * Public `.` / `./iframe` entry — the iframe-side adapter surface.
 *
 * This is the entry a public/embedded site bundle imports. It re-exports the
 * framework-agnostic protocol so iframe consumers get the types, and will export
 * the iframe-side React provider/components delivered by SIFR-I-0002.
 *
 * IMPORTANT (bundle-separation invariant): this module must NEVER import from
 * `./host` — a public site bundle must not pull in host overlay code. Only the
 * protocol module and (later) iframe-side code may be re-exported here.
 */
export * from "./protocol/index.js";

/* -------------------------------------------------------------------------- */
/* Iframe-side adapter surface (SIFR-I-0002)                                  */
/* -------------------------------------------------------------------------- */

// Pure discovery (SIFR-T-0006).
export {
  CONTAINER_INSET,
  discoverTargets,
  toGeometry,
  type DiscoverTargetsOptions,
} from "./iframe/discovery.js";
