import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { demoAliases, demoDedupe } from "../shared/aliases";

/**
 * Demo admin dev server. Fixed port 5173 = the explicit origin the demo site
 * expects to be embedded by (NFR-002). `strictPort` fails loudly on conflict.
 */
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
  },
  resolve: {
    alias: demoAliases,
    dedupe: demoDedupe,
  },
});
