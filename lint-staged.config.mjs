import path from "node:path";

/**
 * Root lint-staged config covering BOTH projects. The library (`src/**`) is
 * linted by the root `eslint.config.mjs`; the standalone demo (`demo/**`) has
 * its own `demo/eslint.config.mjs` with per-app tsconfigs, so those files are
 * linted from the `demo/` working directory (paths made relative to it).
 *
 * `--max-warnings=0` fails the commit on any warning, matching the CI gate.
 * `--no-warn-ignored` silently skips explicitly-passed files that ESLint's
 * config ignores (e.g. `*.config.*`), instead of emitting a "file ignored"
 * warning that would otherwise trip `--max-warnings=0`.
 */
export default {
  "src/**/*.{ts,tsx}": (files) => [
    `eslint --max-warnings=0 --no-warn-ignored ${files.map((f) => `"${f}"`).join(" ")}`,
  ],
  "demo/**/*.{ts,tsx}": (files) => {
    const demoRoot = path.resolve("demo");
    const rel = files
      .map((f) => path.relative(demoRoot, f))
      .map((f) => `"${f}"`)
      .join(" ");
    return [`bash -c 'cd demo && eslint --max-warnings=0 --no-warn-ignored ${rel}'`];
  },
};
