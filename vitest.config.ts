import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Peer packages `frame-link` and `frame-link-react` are consumed from their
 * sibling source repos (symlinked into node_modules) which ship no prebuilt
 * `dist`. We alias the bare specifiers to their TypeScript source entry points
 * so Vite/Vitest can transform them directly. This keeps those repos read-only
 * (no build artifacts required) while giving the iframe adapter its real peers.
 */
const frameLinkSrc = fileURLToPath(
  new URL("../../frame-link/src/index.ts", import.meta.url)
);
const frameLinkReactSrc = fileURLToPath(
  new URL("../../frame-link-react/src/index.ts", import.meta.url)
);

export default defineConfig({
  resolve: {
    alias: {
      "frame-link-react": frameLinkReactSrc,
      "frame-link": frameLinkSrc,
    },
    // The aliased peer sources live in sibling repos that carry their own
    // (React 18) node_modules. Without deduping, Vite would load a second React
    // copy for them, breaking context/hook identity. Force a single React from
    // this package's node_modules.
    dedupe: ["react", "react-dom"],
  },
  test: {
    environment: "jsdom",
    globals: false,
    setupFiles: ["src/iframe/testing/setup.ts"],
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
});
