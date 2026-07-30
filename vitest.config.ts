import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Pin React / react-dom (and the JSX runtime) to this package's single copy so
// the symlinked `frame-link-react` peer resolves the *same* React instance the
// tests render with. Without this, its dist would try to resolve `react` from
// its own (now deduped) node_modules and fail / load a second copy.
const react = fileURLToPath(new URL("./node_modules/react", import.meta.url));
const reactDom = fileURLToPath(
  new URL("./node_modules/react-dom", import.meta.url),
);
// Canonical single `frame-link` module id so a `vi.mock("frame-link")` in a
// test intercepts the same instance that `frame-link-react`'s dist imports.
const frameLink = fileURLToPath(
  new URL("./node_modules/frame-link/dist/index.js", import.meta.url),
);

export default defineConfig({
  resolve: {
    alias: {
      "react-dom/client": `${reactDom}/client.js`,
      "react-dom": reactDom,
      "react/jsx-dev-runtime": `${react}/jsx-dev-runtime.js`,
      "react/jsx-runtime": `${react}/jsx-runtime.js`,
      react,
      "frame-link": frameLink,
    },
  },
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
