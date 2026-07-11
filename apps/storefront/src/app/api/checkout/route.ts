import { NextRequest, NextResponse } from 'next/server';
import { assertChannel, CHANNELS } from '@/lib/channels';
import { vendureFetch } from '@/lib/vendure';

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const channel = assertChannel(String(formData.get('channel')));
  const cookie = request.headers.get('cookie') || undefined;
  const countryCode = CHANNELS[channel].country;

  const input = {
    emailAddress: String(formData.get('emailAddress')),
    firstName: String(formData.get('firstName')),
    lastName: String(formData.get('lastName')),
    streetLine1: String(formData.get('streetLine1')),
    city: String(formData.get('province')),
    province: String(formData.get('province')),
    postalCode: String(formData.get('postalCode') || ''),
    countryCode,
  };

  await vendureFetch(
    channel,
    `mutation SetCustomer($input: CreateCustomerInput!) {
      setCustomerForOrder(input: $input) {
        ... on Order { id }
        ... on ErrorResult { errorCode message }
      }
    }`,
    {
      input: {
        emailAddress: input.emailAddress,
        firstName: input.firstName,
        lastName: input.lastName,
      },
    },
    cookie,
  );

  await vendureFetch(
    channel,
    `mutation SetAddress($input: CreateAddressInput!) {
      setOrderShippingAddress(input: $input) {
        ... on Order { id }
        ... on ErrorResult { errorCode message }
      }
    }`,
    { input },
    cookie,
  );

  if (channel === 'nepal') {
    return NextResponse.redirect(new URL('/nepal/cart?payment=fonepay-placeholder', request.url), 303);
  }

  await vendureFetch(
    channel,
    `mutation StripeIntent {
      createStripePaymentIntent
    }`,
    {},
    cookie,
  );

  return NextResponse.redirect(new URL('/hongkong/cart?payment=stripe-intent-created', request.url), 303);
}
