import Medusa from "@medusajs/js-sdk"

/**
 * Shared JS SDK instance for admin customizations (widgets, routes).
 *
 * The admin dashboard is served from the Medusa backend, so a relative baseUrl
 * ("/") targets the same origin, and session auth reuses the admin login cookie.
 * Always import this `sdk` in admin UI code instead of reaching for a global —
 * there is no `window.__sdk`, so that pattern resolves to `undefined` and every
 * request throws.
 */
export const sdk = new Medusa({
  baseUrl: import.meta.env.VITE_MEDUSA_BACKEND_URL || "/",
  debug: import.meta.env.DEV,
  auth: {
    type: "session",
  },
})
