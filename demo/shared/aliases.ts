/**
 * Shared Vite resolve aliases for both demo apps.
 *
 * The demo consumes `@stardust-cms/iframe-adapter` (this repo, one directory up)
 * directly from its TypeScript source for a clean dev experience — no rebuild of
 * the library needed while iterating on the demo. The `/host`, `/protocol`, and
 * root (`/iframe`) subpaths map to the library's barrel entry files.
 *
 * The frame-link peers are symlinked into the repo's node_modules from sibling
 * source repos that ship no `dist`; alias them to their source entry points and
 * dedupe React so the whole tree shares one React instance (mirrors the
 * library's own vitest config).
 */

import { fileURLToPath } from "node:url";

/** repo root = two levels up from demo/shared. */
function repo(rel: string): string {
  return fileURLToPath(new URL(`../../${rel}`, import.meta.url));
}

/** sibling peer repos live three levels up from demo/shared. */
function sibling(rel: string): string {
  return fileURLToPath(new URL(`../../../../${rel}`, import.meta.url));
}

export const demoAliases: Record<string, string> = {
  // Library subpaths (order matters: more specific first).
  "@stardust-cms/iframe-adapter/host": repo("src/host.ts"),
  "@stardust-cms/iframe-adapter/protocol": repo("src/protocol.ts"),
  "@stardust-cms/iframe-adapter/iframe": repo("src/iframe.ts"),
  "@stardust-cms/iframe-adapter": repo("src/iframe.ts"),
  // Shared demo modules.
  "@demo/shared/content-model": fileURLToPath(
    new URL("./src/content-model.ts", import.meta.url),
  ),
  "@demo/shared/store": fileURLToPath(
    new URL("./src/store/index.ts", import.meta.url),
  ),
  // frame-link peers from sibling prebuilt dist (they ship dist js + d.ts).
  "frame-link-react": sibling("frame-link-react/dist/index.js"),
  "frame-link": sibling("frame-link/dist/index.js"),
};

export const demoDedupe: string[] = ["react", "react-dom"];
