/**
 * Shared Vite resolve aliases for both demo apps.
 *
 * The demo consumes `@stardust-cms/iframe-adapter` (this repo, one directory up)
 * directly from its TypeScript source for a clean dev experience — no rebuild of
 * the library needed while iterating on the demo. The `/host`, `/protocol`, and
 * root (`/iframe`) subpaths map to the library's barrel entry files.
 *
 * The frame-link peers resolve normally from node_modules (published npm
 * packages); we only dedupe React (below) so the whole tree shares one React
 * instance.
 */

import { fileURLToPath } from "node:url";

/** repo root = two levels up from demo/shared. */
function repo(rel: string): string {
  return fileURLToPath(new URL(`../../${rel}`, import.meta.url));
}

export const demoAliases: Record<string, string> = {
  // Library subpaths (order matters: more specific first).
  "@stardust-cms/iframe-adapter/host": repo("src/host.ts"),
  "@stardust-cms/iframe-adapter/presence": repo("src/presence.ts"),
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
};

export const demoDedupe: string[] = ["react", "react-dom"];
