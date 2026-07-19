import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import { formatPrice } from '@/lib/format';
import type { InvoiceData } from '@/lib/invoice/build-invoice-data';

// Mirrors the storefront's design tokens (app/globals.css @theme) — @react-pdf/renderer
// can't read CSS custom properties, so the palette is duplicated here as plain hex.
const COLOR_INK = '#14120f';
const COLOR_INK_MUTED = '#55524c';
const COLOR_HAIRLINE = '#e5e1da';
const COLOR_PAPER = '#ffffff';
const COLOR_SALE = '#b91c1c';

const styles = StyleSheet.create({
  page: {
    padding: 48,
    fontSize: 10,
    color: COLOR_INK,
    backgroundColor: COLOR_PAPER,
    fontFamily: 'Helvetica',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  brandName: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 0.5,
  },
  eyebrow: {
    marginTop: 4,
    fontSize: 8,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: COLOR_INK_MUTED,
  },
  metaBlock: {
    alignItems: 'flex-end',
  },
  metaLabel: {
    fontSize: 8,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: COLOR_INK_MUTED,
  },
  metaValue: {
    fontSize: 10,
    marginTop: 2,
  },
  divider: {
    marginTop: 24,
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLOR_HAIRLINE,
  },
  addressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLOR_HAIRLINE,
  },
  addressBlock: {
    width: '48%',
  },
  addressName: {
    fontSize: 10,
    marginBottom: 2,
  },
  addressLine: {
    fontSize: 9,
    color: COLOR_INK_MUTED,
    marginBottom: 1,
  },
  table: {
    marginTop: 24,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLOR_INK,
    paddingBottom: 6,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLOR_HAIRLINE,
    paddingVertical: 8,
  },
  colItem: { width: '52%' },
  colQty: { width: '12%', textAlign: 'right' },
  colUnit: { width: '18%', textAlign: 'right' },
  colAmount: { width: '18%', textAlign: 'right' },
  th: {
    fontSize: 8,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: COLOR_INK_MUTED,
  },
  itemTitle: { fontSize: 10 },
  itemMeta: { fontSize: 8, color: COLOR_INK_MUTED, marginTop: 2 },
  cellMuted: { fontSize: 9, color: COLOR_INK_MUTED },
  cellValue: { fontSize: 9 },
  totals: {
    marginTop: 20,
    alignItems: 'flex-end',
  },
  totalsBlock: {
    width: '45%',
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  totalsLabel: { fontSize: 9, color: COLOR_INK_MUTED },
  totalsValue: { fontSize: 9 },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLOR_INK,
  },
  grandTotalLabel: { fontSize: 11, fontFamily: 'Helvetica-Bold' },
  grandTotalValue: { fontSize: 11, fontFamily: 'Helvetica-Bold' },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 28,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLOR_HAIRLINE,
  },
  footerText: { fontSize: 8, color: COLOR_INK_MUTED },
  thankYou: {
    marginTop: 36,
    textAlign: 'center',
    fontSize: 8,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: COLOR_INK_MUTED,
  },
});

const dateFormatter = new Intl.DateTimeFormat('en', { year: 'numeric', month: 'long', day: 'numeric' });

function AddressBlock({ label, address, email }: { label: string; address: InvoiceData['shippingAddress']; email?: string }) {
  return (
    <View style={styles.addressBlock}>
      <Text style={styles.metaLabel}>{label}</Text>
      {address ? (
        <View style={{ marginTop: 6 }}>
          <Text style={styles.addressName}>{address.name}</Text>
          <Text style={styles.addressLine}>{address.line1}</Text>
          {address.line2 ? <Text style={styles.addressLine}>{address.line2}</Text> : null}
          <Text style={styles.addressLine}>{address.cityLine}</Text>
          <Text style={styles.addressLine}>{address.country}</Text>
          {email ? <Text style={[styles.addressLine, { marginTop: 4 }]}>{email}</Text> : null}
        </View>
      ) : (
        <Text style={[styles.addressLine, { marginTop: 6 }]}>—</Text>
      )}
    </View>
  );
}

/** The downloadable invoice PDF (invoice/route.ts), rendered server-side with
 * @react-pdf/renderer — real vector text, not a screenshot of the page. Uses the PDF
 * standard Helvetica family rather than the site's Fraunces/Inter web fonts (embedding
 * those would mean bundling font files and adds real failure risk for no visual gain in
 * a document meant to be printed/archived, not browsed) — layout and spacing still follow
 * the same minimal, generous-whitespace language as the rest of the storefront. */
export function InvoicePdfDocument({ data }: { data: InvoiceData }) {
  const hasDiscount = data.discountTotal > 0;
  const hasTax = data.taxTotal > 0;

  return (
    <Document title={`Invoice ${data.invoiceNumber} — ${data.brandName}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.brandName}>{data.brandName}</Text>
            <Text style={styles.eyebrow}>{data.channelCountry}</Text>
          </View>
          <View style={styles.metaBlock}>
            <Text style={styles.metaLabel}>Invoice</Text>
            <Text style={styles.metaValue}>No. {data.invoiceNumber}</Text>
            <Text style={[styles.metaValue, { color: COLOR_INK_MUTED }]}>{dateFormatter.format(data.date)}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.addressRow}>
          {data.billingSameAsShipping || !data.billingAddress ? (
            <AddressBlock label="Billed & Shipped To" address={data.shippingAddress} email={data.email} />
          ) : (
            <>
              <AddressBlock label="Billed To" address={data.billingAddress} email={data.email} />
              <AddressBlock label="Shipped To" address={data.shippingAddress} />
            </>
          )}
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.th, styles.colItem]}>Item</Text>
            <Text style={[styles.th, styles.colQty]}>Qty</Text>
            <Text style={[styles.th, styles.colUnit]}>Unit Price</Text>
            <Text style={[styles.th, styles.colAmount]}>Amount</Text>
          </View>
          {data.items.map((item) => (
            <View key={item.id} style={styles.tableRow}>
              <View style={styles.colItem}>
                <Text style={styles.itemTitle}>{item.title}</Text>
                {item.variantLabel ? <Text style={styles.itemMeta}>{item.variantLabel}</Text> : null}
                {item.sku ? <Text style={styles.itemMeta}>SKU {item.sku}</Text> : null}
              </View>
              <Text style={[styles.cellMuted, styles.colQty]}>{item.quantity}</Text>
              <Text style={[styles.cellMuted, styles.colUnit]}>{formatPrice(item.unitPrice, data.currencyCode)}</Text>
              <Text style={[styles.cellValue, styles.colAmount]}>{formatPrice(item.total, data.currencyCode)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totals}>
          <View style={styles.totalsBlock}>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Subtotal</Text>
              <Text style={styles.totalsValue}>{formatPrice(data.subtotal, data.currencyCode)}</Text>
            </View>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Shipping{data.shippingMethodName ? ` (${data.shippingMethodName})` : ''}</Text>
              <Text style={styles.totalsValue}>{formatPrice(data.shippingTotal, data.currencyCode)}</Text>
            </View>
            {hasTax && (
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>Tax</Text>
                <Text style={styles.totalsValue}>{formatPrice(data.taxTotal, data.currencyCode)}</Text>
              </View>
            )}
            {hasDiscount && (
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>Discount</Text>
                <Text style={[styles.totalsValue, { color: COLOR_SALE }]}>
                  −{formatPrice(data.discountTotal, data.currencyCode)}
                </Text>
              </View>
            )}
            <View style={styles.grandTotalRow}>
              <Text style={styles.grandTotalLabel}>Total</Text>
              <Text style={styles.grandTotalValue}>{formatPrice(data.total, data.currencyCode)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.footerRow}>
          <Text style={styles.footerText}>
            Payment: {data.paymentMethodLabel ?? '—'} · {data.paymentStatusLabel}
          </Text>
          <Text style={styles.footerText}>Fulfillment: {data.fulfillmentStatusLabel}</Text>
        </View>

        <Text style={styles.thankYou}>Thank you for shopping with {data.brandName}</Text>
      </Page>
    </Document>
  );
}
