import { cookies } from 'next/headers';
import { GraphQLClient } from 'graphql-request';
import type { DocumentNode } from 'graphql';
import { print } from 'graphql';
import { getChannel, type ChannelCode } from '@/lib/channel';
import {
  VENDURE_SESSION_COOKIE,
  VENDURE_SESSION_SIG_COOKIE,
  buildCookieHeader,
  getVendureSessionCookies,
  parseSessionCookiesFromSetCookie,
} from '@/lib/session';

const SHOP_API_URL = process.env.VENDURE_SHOP_API_URL || 'http://localhost:3000/shop-api';
const SESSION_MAX_AGE = 60 * 60 * 24 * 365;

/**
 * Executes a mutation (or query) against the Shop API from a Server Action, forwarding
 * the caller's Vendure session cookies and persisting any new/rotated ones Vendure
 * sends back. Used for every cart/checkout Server Action instead of each one
 * re-implementing the cookie dance — see lib/session.ts for why both `session` and
 * `session.sig` matter.
 *
 * Not for use in Server Components: writing cookies is only permitted from a Server
 * Action or Route Handler, so this must only be called from a `'use server'` function.
 */
export async function callVendureWithSession<TData, TVariables extends Record<string, unknown>>(
  channelCode: ChannelCode,
  document: DocumentNode,
  variables: TVariables,
): Promise<TData> {
  const cookieStore = await cookies();
  const sessionCookies = await getVendureSessionCookies();
  const channel = getChannel(channelCode);

  const client = new GraphQLClient(SHOP_API_URL, {
    headers: {
      'vendure-token': channel.vendureToken,
      ...buildCookieHeader(sessionCookies),
    },
  });

  const { data, headers } = await client.rawRequest<TData>(print(document), variables);

  const { session, sessionSig } = parseSessionCookiesFromSetCookie(headers.getSetCookie());
  if (session) {
    cookieStore.set(VENDURE_SESSION_COOKIE, session, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_MAX_AGE,
    });
  }
  if (sessionSig) {
    cookieStore.set(VENDURE_SESSION_SIG_COOKIE, sessionSig, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_MAX_AGE,
    });
  }

  return data;
}

/** Shared shape for the `<Success-ish> | ErrorResult` unions most Shop API mutations return. */
export type MutationResult = { success: true } | { success: false; message: string };

/** `successTypenames` lists which `__typename`(s) count as success — e.g. `['Order']` for
 * checkout mutations, `['CurrentUser']` for login/verify, `['Success']` for the rest. */
export function toMutationResult(
  result: { __typename?: string; message?: string } | null | undefined,
  successTypenames: string[],
): MutationResult {
  if (result && successTypenames.includes(result.__typename ?? '')) return { success: true };
  return { success: false, message: result?.message ?? 'Something went wrong. Please try again.' };
}

export function toOrderMutationResult(
  result: { __typename?: string; message?: string } | null | undefined,
): MutationResult {
  return toMutationResult(result, ['Order']);
}
