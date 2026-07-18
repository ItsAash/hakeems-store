import { cookies } from 'next/headers';
import type { ChannelCode } from '@/lib/channel';

// Medusa carts are bound to a region + sales_channel at creation time (unlike Vendure,
// where one session cookie works across channels because the channel is resolved
// server-side per request via a header). A single shared cart id would silently hand a
// Hong Kong cart to a Nepal checkout (wrong currency/region) if a shopper switched
// channels — so the cookie is namespaced per channel.
const cartCookieName = (channelCode: ChannelCode) => `medusa_cart_id_${channelCode}`;

export async function getCartId(channelCode: ChannelCode): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(cartCookieName(channelCode))?.value ?? null;
}

export async function setCartId(channelCode: ChannelCode, cartId: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(cartCookieName(channelCode), cartId, {
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
  });
}

export async function removeCartId(channelCode: ChannelCode): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(cartCookieName(channelCode));
}
