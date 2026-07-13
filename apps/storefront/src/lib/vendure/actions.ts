'use server';

import type { ChannelCode } from '@/lib/channel';
import { callVendureWithSession, toOrderMutationResult, type MutationResult } from '@/lib/vendure/session-client';
import {
  AddItemToOrderDocument,
  AdjustOrderLineDocument,
  RemoveOrderLineDocument,
  SetOrderShippingAddressDocument,
  SetCustomerForOrderDocument,
  SetOrderShippingMethodDocument,
  TransitionOrderToStateDocument,
  AddPaymentToOrderDocument,
  CreateStripePaymentIntentDocument,
  type AddItemToOrderMutation,
  type AdjustOrderLineMutation,
  type RemoveOrderLineMutation,
  type SetOrderShippingAddressMutation,
  type SetCustomerForOrderMutation,
  type SetOrderShippingMethodMutation,
  type TransitionOrderToStateMutation,
  type AddPaymentToOrderMutation,
  type CreateStripePaymentIntentMutation,
  type CreateAddressInput,
  type CreateCustomerInput,
} from '@/lib/vendure/generated';

export type AddItemToOrderResult = { success: true; totalQuantity: number } | { success: false; message: string };

export async function addItemToOrderAction(
  channelCode: ChannelCode,
  productVariantId: string,
  quantity: number = 1,
): Promise<AddItemToOrderResult> {
  const data = await callVendureWithSession<AddItemToOrderMutation, { productVariantId: string; quantity: number }>(
    channelCode,
    AddItemToOrderDocument,
    { productVariantId, quantity },
  );
  const result = data.addItemToOrder;
  if (result.__typename === 'Order') return { success: true, totalQuantity: result.totalQuantity };
  return { success: false, message: result.message };
}

export async function adjustOrderLineAction(
  channelCode: ChannelCode,
  orderLineId: string,
  quantity: number,
): Promise<MutationResult> {
  const data = await callVendureWithSession<AdjustOrderLineMutation, { orderLineId: string; quantity: number }>(
    channelCode,
    AdjustOrderLineDocument,
    { orderLineId, quantity },
  );
  return toOrderMutationResult(data.adjustOrderLine);
}

export async function removeOrderLineAction(channelCode: ChannelCode, orderLineId: string): Promise<MutationResult> {
  const data = await callVendureWithSession<RemoveOrderLineMutation, { orderLineId: string }>(
    channelCode,
    RemoveOrderLineDocument,
    { orderLineId },
  );
  return toOrderMutationResult(data.removeOrderLine);
}

export async function setOrderShippingAddressAction(
  channelCode: ChannelCode,
  input: CreateAddressInput,
): Promise<MutationResult> {
  const data = await callVendureWithSession<SetOrderShippingAddressMutation, { input: CreateAddressInput }>(
    channelCode,
    SetOrderShippingAddressDocument,
    { input },
  );
  return toOrderMutationResult(data.setOrderShippingAddress);
}

export async function setCustomerForOrderAction(
  channelCode: ChannelCode,
  input: CreateCustomerInput,
): Promise<MutationResult> {
  const data = await callVendureWithSession<SetCustomerForOrderMutation, { input: CreateCustomerInput }>(
    channelCode,
    SetCustomerForOrderDocument,
    { input },
  );
  return toOrderMutationResult(data.setCustomerForOrder);
}

export async function setOrderShippingMethodAction(
  channelCode: ChannelCode,
  shippingMethodId: string,
): Promise<MutationResult> {
  const data = await callVendureWithSession<SetOrderShippingMethodMutation, { shippingMethodId: string[] }>(
    channelCode,
    SetOrderShippingMethodDocument,
    { shippingMethodId: [shippingMethodId] },
  );
  return toOrderMutationResult(data.setOrderShippingMethod);
}

export async function transitionToArrangingPaymentAction(channelCode: ChannelCode): Promise<MutationResult> {
  const data = await callVendureWithSession<TransitionOrderToStateMutation, { state: string }>(
    channelCode,
    TransitionOrderToStateDocument,
    { state: 'ArrangingPayment' },
  );
  return toOrderMutationResult(data.transitionOrderToState);
}

export type AddPaymentResult = { success: true; orderCode: string } | { success: false; message: string };

/** Nepal's payment method (see fonepay-placeholder.handler.ts) settles synchronously —
 * there's no redirect or client-side gateway SDK involved, unlike Stripe below. */
export async function addFonepayPlaceholderPaymentAction(channelCode: ChannelCode): Promise<AddPaymentResult> {
  const data = await callVendureWithSession<AddPaymentToOrderMutation, { input: { method: string; metadata: object } }>(
    channelCode,
    AddPaymentToOrderDocument,
    { input: { method: 'nepal-fonepay-placeholder', metadata: {} } },
  );
  const result = data.addPaymentToOrder;
  if (result.__typename === 'Order') return { success: true, orderCode: result.code };
  return { success: false, message: result.message };
}

export type StripePaymentIntentResult = { success: true; clientSecret: string } | { success: false; message: string };

export async function createStripePaymentIntentAction(channelCode: ChannelCode): Promise<StripePaymentIntentResult> {
  try {
    const data = await callVendureWithSession<CreateStripePaymentIntentMutation, Record<string, never>>(
      channelCode,
      CreateStripePaymentIntentDocument,
      {},
    );
    return { success: true, clientSecret: data.createStripePaymentIntent };
  } catch (error) {
    console.error('createStripePaymentIntent failed', error);
    return { success: false, message: 'Could not start payment. Please try again in a moment.' };
  }
}
