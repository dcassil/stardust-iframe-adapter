import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // `frame-link` / `frame-link-react` resolve from node_modules (published
    // npm packages). Dedupe React so those peers share this package's single
    // React instance (context/hook identity across the tree).
    dedupe: ["react", "react-dom"],
  },
  esbuild: {
    jsx: "automatic",
  },
  test: {
    environment: "jsdom",
    globals: false,
    setupFiles: ["src/iframe/testing/setup.ts"],
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    server: {
      deps: {
        // v4 change: `frame-link-react`'s `FrameLinkProvider` imports
        // `createFrameLink` from the separate `frame-link` package and
        // constructs the instance itself. Inline `frame-link-react` so vitest
        // routes that import through its module graph, letting the host tests'
        // `vi.mock("frame-link", …)` intercept it and hand the provider a
        // controllable fake peer — instead of the real transport, whose
        // `connect()` blocks on a live ping handshake that never completes in
        // jsdom (making `targets` stay empty).
        inline: ["frame-link-react"],
      },
    },
  },
});
