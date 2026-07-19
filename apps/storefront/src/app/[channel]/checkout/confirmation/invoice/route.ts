import { createElement } from 'react';
import { NextRequest, NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { getChannel, isChannelCode } from '@/lib/channel';
import { fetchOrderAction } from '@/lib/medusa/payment-actions';
import { getSiteSetting } from '@/lib/strapi/queries';
import { SITE_NAME } from '@/lib/seo/site';
import { buildInvoiceData } from '@/lib/invoice/build-invoice-data';
import { InvoicePdfDocument } from '@/lib/invoice/invoice-pdf-document';

/** Streams the same order a shopper just placed back as a real PDF — see
 * components/checkout/invoice.tsx (the on-page/print twin) and
 * lib/invoice/build-invoice-data.ts (the shared data shape both render from). */
export async function GET(request: NextRequest, { params }: { params: Promise<{ channel: string }> }) {
  const { channel: channelParam } = await params;
  if (!isChannelCode(channelParam)) {
    return new NextResponse('Not found', { status: 404 });
  }
  const channel = getChannel(channelParam);

  const orderId = request.nextUrl.searchParams.get('order_id');
  if (!orderId) {
    return new NextResponse('Missing order_id', { status: 400 });
  }

  const [result, setting] = await Promise.all([fetchOrderAction(channel.code, orderId), getSiteSetting()]);
  if (!result.success) {
    return new NextResponse('Order not found', { status: 404 });
  }

  const brandName = setting?.siteName || SITE_NAME;
  const invoice = buildInvoiceData(result.order, channel.code, brandName);
  // @react-pdf/renderer's renderToBuffer types require its argument's element type to be
  // literally `Document`, not a component that renders one — a known rough edge in its
  // TS defs (react-pdf/react-pdf#2136). The runtime accepts any element that resolves to
  // a Document tree, which InvoicePdfDocument does.
  const buffer = await renderToBuffer(createElement(InvoicePdfDocument, { data: invoice }) as Parameters<typeof renderToBuffer>[0]);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="invoice-${invoice.invoiceNumber}.pdf"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
