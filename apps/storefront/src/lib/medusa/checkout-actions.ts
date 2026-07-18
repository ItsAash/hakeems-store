'use server';

import type { ChannelCode } from '@/lib/channel';
import { getChannel } from '@/lib/channel';
import { createMedusaClient } from '@/lib/medusa/client';
import { getMedusaConfig } from '@/lib/medusa/config';
import { getCartId } from '@/lib/medusa/cart-cookie';

export type CheckoutActionResult = { success: true } | { success: false; message: string };

export type CheckoutAddressInput = {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  address1: string;
  /** Deepest matched shipping-zone level ("area") — see shipping-zone-fulfillment's
   * calculatePrice, which reads this back off the cart's shipping address. */
  address2?: string;
  city?: string;
  province?: string;
  postalCode?: string;
};

/** Sets the cart's email + shipping/billing address in one call (checkout has no
 * separate billing flow yet, so billing always mirrors shipping). */
export async function setCheckoutAddressAction(
  channelCode: ChannelCode,
  input: CheckoutAddressInput,
): Promise<CheckoutActionResult> {
  try {
    const cartId = await getCartId(channelCode);
    if (!cartId) return { success: false, message: 'Your cart could not be found.' };

    const client = createMedusaClient(channelCode);
    const address = {
      first_name: input.firstName,
      last_name: input.lastName,
      phone: input.phone || undefined,
      address_1: input.address1,
      address_2: input.address2 || undefined,
      city: input.city || undefined,
      province: input.province || undefined,
      postal_code: input.postalCode || undefined,
      country_code: getChannel(channelCode).countryCode.toLowerCase(),
    };

    await client.store.cart.update(cartId, {
      email: input.email,
      shipping_address: address,
      billing_address: address,
    });

    return { success: true };
  } catch (err) {
    console.error('setCheckoutAddressAction failed', err);
    return { success: false, message: 'Could not save your address. Please check the form and try again.' };
  }
}

export type ShippingOption = {
  id: string;
  name: string;
  /** Minor units, matching every other price in the app — see toMinorUnits in cart-mapper.ts. */
  amount: number;
};

export type ShippingOptionsResult = { success: true; options: ShippingOption[] } | { success: false; message: string };

export async function listShippingOptionsAction(channelCode: ChannelCode): Promise<ShippingOptionsResult> {
  try {
    const cartId = await getCartId(channelCode);
    if (!cartId) return { success: false, message: 'Your cart could not be found.' };

    const client = createMedusaClient(channelCode);
    const { shipping_options } = await client.store.fulfillment.listCartOptions({ cart_id: cartId });

    // The list route only returns a real `amount` for flat-rate options — a
    // price_type "calculated" option (like our zone-based "Standard Shipping") comes
    // back with `calculated_price: null` there and needs its own dedicated call to
    // actually invoke the fulfillment provider's calculatePrice (see
    // apps/medusa/src/modules/shipping-zone-fulfillment/service.ts).
    const options = await Promise.all(
      shipping_options.map(async (option) => {
        if (option.price_type !== 'calculated') {
          return { id: option.id, name: option.name, amount: Math.round((option.amount ?? 0) * 100) };
        }
        const { shipping_option } = await client.store.fulfillment.calculate(option.id, { cart_id: cartId });
        return { id: option.id, name: option.name, amount: Math.round((shipping_option.amount ?? 0) * 100) };
      }),
    );

    return { success: true, options };
  } catch (err) {
    console.error('listShippingOptionsAction failed', err);
    return { success: false, message: 'Could not load shipping options.' };
  }
}

export async function addShippingMethodAction(channelCode: ChannelCode, optionId: string): Promise<CheckoutActionResult> {
  try {
    const cartId = await getCartId(channelCode);
    if (!cartId) return { success: false, message: 'Your cart could not be found.' };

    const client = createMedusaClient(channelCode);
    await client.store.cart.addShippingMethod(cartId, { option_id: optionId });

    return { success: true };
  } catch (err) {
    console.error('addShippingMethodAction failed', err);
    return { success: false, message: 'Could not set the shipping method. Please try again.' };
  }
}

export async function applyPromoCodeAction(channelCode: ChannelCode, code: string): Promise<CheckoutActionResult> {
  try {
    const cartId = await getCartId(channelCode);
    if (!cartId) return { success: false, message: 'Your cart could not be found.' };

    const client = createMedusaClient(channelCode);
    await client.store.cart.addPromotions(cartId, { promo_codes: [code] });

    return { success: true };
  } catch (err) {
    console.error('applyPromoCodeAction failed', err);
    return { success: false, message: 'That code is invalid or has expired.' };
  }
}

export async function removePromoCodeAction(channelCode: ChannelCode, code: string): Promise<CheckoutActionResult> {
  try {
    const cartId = await getCartId(channelCode);
    if (!cartId) return { success: false, message: 'Your cart could not be found.' };

    const client = createMedusaClient(channelCode);
    await client.store.cart.removePromotions(cartId, { promo_codes: [code] });

    return { success: true };
  } catch (err) {
    console.error('removePromoCodeAction failed', err);
    return { success: false, message: 'Could not remove that code.' };
  }
}

/** Mirrors apps/medusa's ShippingZoneNode tree (see shipping-zone module) — matches the
 * shape components/checkout/shipping-zone-picker.tsx already expects. */
export type ZoneNode = {
  id: string;
  name: string;
  code: string;
  rate: number | null;
  parent_id: string | null;
  children: ZoneNode[];
};

export async function fetchShippingZoneTreeAction(channelCode: ChannelCode): Promise<ZoneNode[]> {
  try {
    const client = createMedusaClient(channelCode);
    const { stockLocationId } = getMedusaConfig(channelCode);
    const { shipping_zones } = await client.client.fetch<{ shipping_zones: ZoneNode[] }>('/store/shipping-zones', {
      query: { stock_location_id: stockLocationId },
    });
    return shipping_zones;
  } catch (err) {
    console.error('fetchShippingZoneTreeAction failed', err);
    return [];
  }
}
