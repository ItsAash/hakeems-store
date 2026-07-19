import { formatPrice } from '@/lib/format';
import type { InvoiceData } from '@/lib/invoice/build-invoice-data';

const dateFormatter = new Intl.DateTimeFormat('en', { year: 'numeric', month: 'long', day: 'numeric' });

/**
 * The order invoice — shown on the confirmation page, isolated for printing via the
 * `#invoice` / `.no-print` rules in globals.css (window.print() from InvoiceActions), and
 * mirrored (separately — @react-pdf/renderer can't render this markup) by the downloadable
 * PDF at invoice/route.ts. Both read from the same `InvoiceData` shape, so the two never
 * drift on what an invoice actually contains.
 */
export function Invoice({ data }: { data: InvoiceData }) {
  const hasDiscount = data.discountTotal > 0;
  const hasTax = data.taxTotal > 0;

  return (
    <div id="invoice" className="border hairline bg-[var(--color-paper-raised)] p-8 md:p-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-serif text-2xl text-[var(--color-ink)]">{data.brandName}</p>
          <p className="mt-1 text-2xs tracking-label text-[var(--color-ink-muted)] uppercase">{data.channelCountry}</p>
        </div>
        <div className="sm:text-right">
          <p className="text-2xs tracking-label text-[var(--color-ink-muted)] uppercase">Invoice</p>
          <p className="text-sm text-[var(--color-ink)]">No. {data.invoiceNumber}</p>
          <p className="text-sm text-[var(--color-ink-muted)]">{dateFormatter.format(data.date)}</p>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 border-y hairline py-6 sm:grid-cols-2">
        {data.billingSameAsShipping || !data.billingAddress ? (
          <AddressBlock label="Billed & Shipped To" address={data.shippingAddress} email={data.email} />
        ) : (
          <>
            <AddressBlock label="Billed To" address={data.billingAddress} email={data.email} />
            <AddressBlock label="Shipped To" address={data.shippingAddress} />
          </>
        )}
      </div>

      <div className="mt-8 overflow-x-auto">
        <table className="w-full min-w-[480px] text-sm">
          <thead>
            <tr className="border-b hairline text-left text-2xs tracking-label text-[var(--color-ink-muted)] uppercase">
              <th className="pb-3 font-medium">Item</th>
              <th className="pb-3 font-medium text-right">Qty</th>
              <th className="pb-3 font-medium text-right">Unit Price</th>
              <th className="pb-3 font-medium text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item) => (
              <tr key={item.id} className="border-b hairline">
                <td className="py-3 pr-4 text-[var(--color-ink)]">
                  {item.title}
                  {item.variantLabel && <span className="block text-xs text-[var(--color-ink-muted)]">{item.variantLabel}</span>}
                  {item.sku && <span className="block text-2xs text-[var(--color-ink-muted)]">SKU {item.sku}</span>}
                </td>
                <td className="py-3 text-right text-[var(--color-ink-muted)]">{item.quantity}</td>
                <td className="py-3 text-right whitespace-nowrap text-[var(--color-ink-muted)]">
                  {formatPrice(item.unitPrice, data.currencyCode)}
                </td>
                <td className="py-3 text-right whitespace-nowrap text-[var(--color-ink)]">
                  {formatPrice(item.total, data.currencyCode)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex justify-end">
        <div className="flex w-full max-w-xs flex-col gap-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-[var(--color-ink-muted)]">Subtotal</span>
            <span className="text-[var(--color-ink)]">{formatPrice(data.subtotal, data.currencyCode)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[var(--color-ink-muted)]">
              Shipping{data.shippingMethodName ? ` (${data.shippingMethodName})` : ''}
            </span>
            <span className="text-[var(--color-ink)]">{formatPrice(data.shippingTotal, data.currencyCode)}</span>
          </div>
          {hasTax && (
            <div className="flex items-center justify-between">
              <span className="text-[var(--color-ink-muted)]">Tax</span>
              <span className="text-[var(--color-ink)]">{formatPrice(data.taxTotal, data.currencyCode)}</span>
            </div>
          )}
          {hasDiscount && (
            <div className="flex items-center justify-between">
              <span className="text-[var(--color-ink-muted)]">Discount</span>
              <span className="text-[var(--color-sale)]">−{formatPrice(data.discountTotal, data.currencyCode)}</span>
            </div>
          )}
          <div className="flex items-center justify-between border-t hairline pt-3 text-base font-medium">
            <span className="text-[var(--color-ink)]">Total</span>
            <span className="text-[var(--color-ink)]">{formatPrice(data.total, data.currencyCode)}</span>
          </div>
        </div>
      </div>

      <div className="mt-8 flex flex-col gap-1 border-t hairline pt-6 text-xs text-[var(--color-ink-muted)] sm:flex-row sm:justify-between">
        <p>
          Payment: {data.paymentMethodLabel ?? '—'} · {data.paymentStatusLabel}
        </p>
        <p>Fulfillment: {data.fulfillmentStatusLabel}</p>
      </div>

      <p className="mt-10 text-center text-2xs tracking-label text-[var(--color-ink-muted)] uppercase">
        Thank you for shopping with {data.brandName}
      </p>
    </div>
  );
}

function AddressBlock({
  label,
  address,
  email,
}: {
  label: string;
  address: InvoiceData['shippingAddress'];
  email?: string;
}) {
  return (
    <div>
      <p className="mb-2 text-2xs tracking-label text-[var(--color-ink-muted)] uppercase">{label}</p>
      {address ? (
        <div className="text-sm text-[var(--color-ink)]">
          <p>{address.name}</p>
          <p className="text-[var(--color-ink-muted)]">{address.line1}</p>
          {address.line2 && <p className="text-[var(--color-ink-muted)]">{address.line2}</p>}
          <p className="text-[var(--color-ink-muted)]">{address.cityLine}</p>
          <p className="text-[var(--color-ink-muted)]">{address.country}</p>
          {email && <p className="mt-1 text-[var(--color-ink-muted)]">{email}</p>}
        </div>
      ) : (
        <p className="text-sm text-[var(--color-ink-muted)]">—</p>
      )}
    </div>
  );
}
