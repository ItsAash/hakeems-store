import { LanguageCode, ShippingCalculator, ShippingEligibilityChecker } from '@vendure/core';

const parseRates = (value: string | undefined): Record<string, number> => {
  if (!value) return {};
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
};

const normalize = (value: string | undefined | null) => (value || '').trim().toLowerCase();

export const districtShippingEligibilityChecker = new ShippingEligibilityChecker({
  code: 'hakeems-district-eligibility-checker',
  description: [{ languageCode: LanguageCode.en, value: 'Eligible when a district/city is present in the province field' }],
  args: {},
  check: (_ctx, order) => Boolean(normalize(order.shippingAddress?.province)),
});

export const districtShippingCalculator = new ShippingCalculator({
  code: 'hakeems-district-shipping-calculator',
  description: [{ languageCode: LanguageCode.en, value: 'Prices shipping by order.shippingAddress.province using a JSON rate map' }],
  args: {
    ratesJson: {
      type: 'string',
      label: [{ languageCode: LanguageCode.en, value: 'District/city rates JSON' }],
      description: [{ languageCode: LanguageCode.en, value: 'Example: {"kathmandu":25000,"lalitpur":28000}' }],
      defaultValue: '{}',
      ui: { component: 'textarea-form-input' },
    },
    fallbackRate: {
      type: 'int',
      label: [{ languageCode: LanguageCode.en, value: 'Fallback rate' }],
      defaultValue: 35000,
      ui: { component: 'currency-form-input' },
    },
    taxRate: {
      type: 'int',
      label: [{ languageCode: LanguageCode.en, value: 'Shipping tax rate' }],
      defaultValue: 0,
      ui: { component: 'number-form-input', suffix: '%' },
    },
  },
  calculate: (ctx, order, args) => {
    const province = normalize(order.shippingAddress?.province);
    const rates = parseRates(args.ratesJson);
    const price = rates[province] ?? args.fallbackRate;

    return {
      price,
      taxRate: args.taxRate,
      priceIncludesTax: ctx.channel.pricesIncludeTax,
      metadata: {
        province: province || null,
        matchedRate: Object.prototype.hasOwnProperty.call(rates, province),
      },
    };
  },
});
