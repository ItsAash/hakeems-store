import { NextRequest, NextResponse } from 'next/server';
import { assertChannel } from '@/lib/channels';
import { vendureFetch } from '@/lib/vendure';

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const channel = assertChannel(String(formData.get('channel')));
  const variantId = String(formData.get('variantId'));
  const quantity = Number(formData.get('quantity') || 1);

  const { setCookie } = await vendureFetch(
    channel,
    `mutation AddItem($variantId: ID!, $quantity: Int!) {
      addItemToOrder(productVariantId: $variantId, quantity: $quantity) {
        ... on Order { id totalWithTax }
        ... on ErrorResult { errorCode message }
      }
    }`,
    { variantId, quantity },
    request.headers.get('cookie') || undefined,
  );

  const response = NextResponse.redirect(new URL(`/${channel}/cart`, request.url), 303);
  if (setCookie) response.headers.set('set-cookie', setCookie);
  return response;
}
