import { defineConfig } from "vitest/config";

export default defineConfig({
  // React (`.tsx`) test files opt into the jsdom environment with a
  // `// @vitest-environment jsdom` docblock; the default stays `node` so the
  // framework-agnostic protocol/host unit tests keep running in `node`.
  esbuild: {
    jsx: "automatic",
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
});
