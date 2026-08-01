/**
 * dependency-cruiser config for the LIBRARY (`src/`). Mirrors the ESLint
 * `eslint-plugin-boundaries` element edges:
 *   - protocol is a LEAF.
 *   - iframe and host may import protocol ONLY — never each other.
 *   - style (iframe side) may import protocol + iframe.
 *   - overlays may import protocol + host (geometry) + itself.
 *
 * Run: `npm run depcruise`.
 */

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "no-circular",
      severity: "error",
      comment: "Circular dependencies make modules impossible to reason about.",
      from: {},
      to: { circular: true },
    },
    {
      name: "no-orphans",
      severity: "error",
      comment: "Every module must be reachable from a public entry.",
      from: {
        orphan: true,
        pathNot: [
          "\\.d\\.ts$",
          "(^|/)src/[^/]+\\.ts$", // top-level public barrels are entry points
          "type-assertions\\.ts$", // compile-only assertion tooling
        ],
      },
      to: {},
    },
    {
      name: "iframe-not-host",
      severity: "error",
      comment:
        "iframe and host must not import each other — go through ./protocol.",
      from: { path: "^src/iframe/" },
      to: { path: "^src/host/" },
    },
    {
      name: "host-not-iframe",
      severity: "error",
      comment:
        "iframe and host must not import each other — go through ./protocol.",
      from: { path: "^src/host/" },
      to: { path: "^src/iframe/" },
    },
    {
      name: "protocol-is-leaf",
      severity: "error",
      comment:
        "protocol is a LEAF: it may not import iframe, host, style, or overlays.",
      from: { path: "^src/protocol/" },
      to: { path: "^src/(iframe|host|style|overlays)/" },
    },
    {
      name: "host-only-protocol",
      severity: "error",
      comment: "host may import protocol + host only.",
      from: { path: "^src/host/" },
      to: { path: "^src/(iframe|style|overlays)/" },
    },
    {
      name: "iframe-only-protocol",
      severity: "error",
      comment: "iframe may import protocol + iframe only.",
      from: { path: "^src/iframe/" },
      to: { path: "^src/(host|style|overlays)/" },
    },
    {
      name: "style-scope",
      severity: "error",
      comment: "style (iframe side) may import protocol + iframe + style only.",
      from: { path: "^src/style/" },
      to: { path: "^src/(host|overlays)/" },
    },
    {
      name: "overlays-scope",
      severity: "error",
      comment:
        "overlays may import protocol + host (geometry) + overlays only.",
      from: { path: "^src/overlays/" },
      to: { path: "^src/(iframe|style)/" },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    tsConfig: { fileName: "tsconfig.json" },
    tsPreCompilationDeps: true,
    exclude: {
      path: [
        "\\.test\\.tsx?$",
        "(^|/)__tests__/",
        "(^|/)testing/",
        "fixtures\\.ts$",
      ],
    },
  },
};
