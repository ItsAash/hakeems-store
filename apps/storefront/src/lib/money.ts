export function formatMoney(amount: number, currencyCode: string) {
  return new Intl.NumberFormat('en', {
    style: 'currency',
    currency: currencyCode,
    maximumFractionDigits: currencyCode === 'NPR' ? 0 : 2,
  }).format(amount / 100);
}
