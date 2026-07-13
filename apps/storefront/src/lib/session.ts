import { cookies } from 'next/headers';

/**
 * Vendure issues its own session cookie (authOptions.tokenMethod includes 'cookie' in
 * apps/vendure/src/vendure-config.ts) and uses it for both the guest cart and, after
 * login, the customer session — Vendure merges the guest order into the customer
 * automatically. The storefront never mints its own session; it only reads/forwards
 * these cookies between the browser and the Shop API.
 *
 * Vendure's cookieOptions.secret is set, so the session cookie is a *signed* cookie:
 * Vendure always sets it as a pair — `session` (the value) and `session.sig` (its
 * signature) — and rejects the session if `session.sig` is missing, even if `session`
 * itself is present and correct. Both must be read and forwarded together.
 */
export const VENDURE_SESSION_COOKIE = 'session';
export const VENDURE_SESSION_SIG_COOKIE = 'session.sig';

export type VendureSessionCookies = {
  session?: string;
  sessionSig?: string;
};

export function buildCookieHeader({ session, sessionSig }: VendureSessionCookies): Record<string, string> {
  const parts: string[] = [];
  if (session) parts.push(`${VENDURE_SESSION_COOKIE}=${session}`);
  if (sessionSig) parts.push(`${VENDURE_SESSION_SIG_COOKIE}=${sessionSig}`);
  return parts.length > 0 ? { cookie: parts.join('; ') } : {};
}

/** Reads both halves of the signed session cookie from the current request. */
export async function getVendureSessionCookies(): Promise<VendureSessionCookies> {
  const cookieStore = await cookies();
  return {
    session: cookieStore.get(VENDURE_SESSION_COOKIE)?.value,
    sessionSig: cookieStore.get(VENDURE_SESSION_SIG_COOKIE)?.value,
  };
}

/** Parses the `name=value` pairs Vendure sets for the session cookie out of the
 * response's raw Set-Cookie headers (there are two: `session` and `session.sig`). */
export function parseSessionCookiesFromSetCookie(setCookieHeaders: string[]): VendureSessionCookies {
  const result: VendureSessionCookies = {};
  for (const header of setCookieHeaders) {
    const pair = header.split(';')[0] ?? '';
    const separatorIndex = pair.indexOf('=');
    if (separatorIndex === -1) continue;
    const name = pair.slice(0, separatorIndex);
    const value = pair.slice(separatorIndex + 1);
    if (name === VENDURE_SESSION_COOKIE) result.session = value;
    if (name === VENDURE_SESSION_SIG_COOKIE) result.sessionSig = value;
  }
  return result;
}
