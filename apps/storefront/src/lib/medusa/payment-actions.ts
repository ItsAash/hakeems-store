'use server';

import type { ChannelCode } from '@/lib/channel';
import { createMedusaClient } from '@/lib/medusa/client';
import { getCartId, removeCartId } from '@/lib/medusa/cart-cookie';

// Derived from the SDK client's own method signature, same convention as MedusaCart in
// cart-mapper.ts — no direct dependency on @medusajs/types, which isn't installed here.
type MedusaClient = ReturnType<typeof createMedusaClient>;
export type MedusaOrder = Awaited<ReturnType<MedusaClient['store']['order']['retrieve']>>['order'];

export type InitiatePaymentResult =
  | { success: true; clientSecret: string | null }
  | { success: false; message: string };

/** Creates (or reuses) the cart's payment collection and starts a session with the
 * given provider. Stripe's session carries a `client_secret` in `data` for the
 * PaymentElement; Fonepay's placeholder session has none — completeCartAction is
 * called directly once it's initiated. */
export async function initiatePaymentSessionAction(
  channelCode: ChannelCode,
  providerId: string,
): Promise<InitiatePaymentResult> {
  try {
    const cartId = await getCartId(channelCode);
    if (!cartId) return { success: false, message: 'Your cart could not be found.' };

    const client = createMedusaClient(channelCode);
    const { cart } = await client.store.cart.retrieve(cartId);
    const { payment_collection } = await client.store.payment.initiatePaymentSession(cart, {
      provider_id: providerId,
    });

    const session = payment_collection.payment_sessions?.find((s) => s.provider_id === providerId);
    const clientSecret =
      typeof session?.data?.client_secret === 'string' ? (session.data.client_secret as string) : null;

    return { success: true, clientSecret };
  } catch (err) {
    console.error('initiatePaymentSessionAction failed', err);
    return { success: false, message: 'Could not start payment. Please try again in a moment.' };
  }
}

export type CompleteCartResult =
  | { success: true; order: { id: string } }
  | { success: false; message: string };

export async function completeCartAction(channelCode: ChannelCode): Promise<CompleteCartResult> {
  try {
    const cartId = await getCartId(channelCode);
    if (!cartId) return { success: false, message: 'Your cart could not be found.' };

    const client = createMedusaClient(channelCode);
    const result = await client.store.cart.complete(cartId);

    if (result.type === 'order') {
      await removeCartId(channelCode);
      return { success: true, order: { id: result.order.id } };
    }

    return { success: false, message: result.error.message || 'Could not place your order. Please try again.' };
  } catch (err) {
    console.error('completeCartAction failed', err);
    return { success: false, message: 'Could not place your order. Please try again.' };
  }
}

export type FetchOrderResult = { success: true; order: MedusaOrder } | { success: false; message: string };

export async function fetchOrderAction(channelCode: ChannelCode, orderId: string): Promise<FetchOrderResult> {
  try {
    const client = createMedusaClient(channelCode);
    const { order } = await client.store.order.retrieve(orderId, {
      fields: '*items,*shipping_address,*billing_address,*shipping_methods,*payment_collections.payments,*customer',
    });
    return { success: true, order };
  } catch (err) {
    console.error('fetchOrderAction failed', err);
    return { success: false, message: 'Order not found.' };
  }
}
