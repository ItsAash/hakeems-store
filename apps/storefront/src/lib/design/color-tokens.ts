/**
 * Brand section-background palette. Editors pick a **token key** in Strapi (a constrained
 * enum) instead of typing a free hex value — this removes the "arbitrary color painted into
 * a live section" risk flagged in the CMS audit, and keeps section backgrounds themeable
 * (each token resolves to a CSS custom property defined in globals.css).
 *
 * Keep the keys here in sync with the `enum` on any Strapi `backgroundToken` field and with
 * `colorTokenSchema` in lib/strapi/schemas.ts.
 */
export const COLOR_TOKENS = {
  paper: 'var(--color-paper)',
  'paper-raised': 'var(--color-paper-raised)',
  blush: 'var(--color-blush)',
  sand: 'var(--color-sand)',
  hairline: 'var(--color-hairline)',
} as const;

export type ColorToken = keyof typeof COLOR_TOKENS;

export const COLOR_TOKEN_KEYS = Object.keys(COLOR_TOKENS) as [ColorToken, ...ColorToken[]];

/** Resolve a token key to its CSS value, or `null` for an unknown/empty token so callers
 * can fall back (e.g. to a legacy hex or a default). Never throws. */
export function resolveColorToken(token: string | null | undefined): string | null {
  if (!token) return null;
  return COLOR_TOKENS[token as ColorToken] ?? null;
}
