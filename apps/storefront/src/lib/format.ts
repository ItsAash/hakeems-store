/** Vendure prices are integer minor units (e.g. paisa/cents). */
export function formatPrice(minorUnits: number, currencyCode: string, locale = 'en'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: minorUnits % 100 === 0 ? 0 : 2,
  }).format(minorUnits / 100);
}

/** "NPR 2,500" for a single price, "NPR 2,500–5,600" when a product's variants span
 * a range — used on PLP cards where only a min/max is known, not a selected variant. */
export function formatPriceRange(min: number, max: number, currencyCode: string, locale = 'en'): string {
  if (min === max) return formatPrice(min, currencyCode, locale);
  return `${formatPrice(min, currencyCode, locale)}–${formatPrice(max, currencyCode, locale)}`;
}
