'use server';

import { FetchError } from '@medusajs/js-sdk';
import type { ChannelCode } from '@/lib/channel';
import { createMedusaClient } from '@/lib/medusa/client';
import { getMedusaConfig } from '@/lib/medusa/config';
import { getCartId, setCartId } from '@/lib/medusa/cart-cookie';

export type CartActionResult = { success: true } | { success: false; message: string };

async function createCart(channelCode: ChannelCode, variantId: string, quantity: number) {
  const config = getMedusaConfig(channelCode);
  const client = createMedusaClient(channelCode);
  const { cart } = await client.store.cart.create({
    region_id: config.regionId,
    sales_channel_id: config.salesChannelId,
    items: [{ variant_id: variantId, quantity }],
  });
  await setCartId(channelCode, cart.id);
}

export async function addItemToCartAction(
  channelCode: ChannelCode,
  variantId: string,
  quantity: number = 1,
): Promise<CartActionResult> {
  try {
    const client = createMedusaClient(channelCode);
    const cartId = await getCartId(channelCode);

    if (!cartId) {
      await createCart(channelCode, variantId, quantity);
      return { success: true };
    }

    try {
      await client.store.cart.createLineItem(cartId, { variant_id: variantId, quantity });
    } catch (err) {
      // Only a genuinely missing/expired cart (404) should silently start a new one —
      // any other error (inventory, validation, network) must surface to the caller
      // instead of quietly discarding whatever was already in the shopper's cart.
      if (err instanceof FetchError && err.status === 404) {
        await createCart(channelCode, variantId, quantity);
      } else {
        throw err;
      }
    }

    return { success: true };
  } catch (err) {
    console.error('addItemToCartAction failed', err);
    return { success: false, message: 'Could not add item to cart.' };
  }
}

export async function adjustCartLineAction(
  channelCode: ChannelCode,
  lineItemId: string,
  quantity: number,
): Promise<CartActionResult> {
  try {
    const cartId = await getCartId(channelCode);
    if (!cartId) return { success: false, message: 'Cart not found.' };

    const client = createMedusaClient(channelCode);
    await client.store.cart.updateLineItem(cartId, lineItemId, { quantity });

    return { success: true };
  } catch (err) {
    console.error('adjustCartLineAction failed', err);
    return { success: false, message: 'Could not update cart.' };
  }
}

export async function removeCartLineAction(
  channelCode: ChannelCode,
  lineItemId: string,
): Promise<CartActionResult> {
  try {
    const cartId = await getCartId(channelCode);
    if (!cartId) return { success: false, message: 'Cart not found.' };

    const client = createMedusaClient(channelCode);
    await client.store.cart.deleteLineItem(cartId, lineItemId);

    return { success: true };
  } catch (err) {
    console.error('removeCartLineAction failed', err);
    return { success: false, message: 'Could not remove item.' };
  }
}

export async function fetchCartAction(channelCode: ChannelCode) {
  const cartId = await getCartId(channelCode);
  if (!cartId) return null;

  try {
    const client = createMedusaClient(channelCode);
    const { cart } = await client.store.cart.retrieve(cartId, {
      fields:
        'id,email,currency_code,subtotal,total,shipping_total,' +
        'items.id,items.quantity,items.thumbnail,items.product_title,items.product_handle,items.variant_title,items.unit_price,items.total,items.subtotal,' +
        'shipping_address.*,shipping_methods.*,promotions.*',
    });
    return cart;
  } catch {
    return null;
  }
}
