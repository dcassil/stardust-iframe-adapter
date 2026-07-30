/**
 * Explicit localhost origins for the demo pair (NFR-002 — never `"*"`).
 *
 * The site's frame-link `targetOrigin` must equal the admin's origin (the window
 * that embeds it). Overridable via Vite env for alternate ports, but always an
 * explicit origin string.
 */

/** The admin (host) origin this site expects to be embedded by. */
export const ADMIN_ORIGIN: string =
  (import.meta.env.VITE_ADMIN_ORIGIN as string | undefined) ??
  "http://localhost:5173";
