import { Injector, LanguageCode, RequestContext, ShippingCalculator, ShippingEligibilityChecker } from '@vendure/core';
import { ShippingZoneService } from './service/shipping-zone.service';

let shippingZoneService: ShippingZoneService;

export const zoneShippingEligibilityChecker = new ShippingEligibilityChecker({
  code: 'hakeems-zone-eligibility-checker',
  description: [
    { languageCode: LanguageCode.en, value: 'Eligible whenever a province/city has been entered on the shipping address' },
  ],
  args: {},
  init: (injector: Injector) => {
    shippingZoneService = injector.get(ShippingZoneService);
  },
  check: (_ctx, order) => Boolean(order.shippingAddress?.province),
});

export const zoneShippingCalculator = new ShippingCalculator({
  code: 'hakeems-zone-shipping-calculator',
  description: [
    { languageCode: LanguageCode.en, value: 'Prices shipping using this channel\'s tree-based shipping zones, set up under Shipping Zones' },
  ],
  args: {
    fallbackRate: {
      type: 'int',
      label: [{ languageCode: LanguageCode.en, value: 'Fallback rate' }],
      description: [
        {
          languageCode: LanguageCode.en,
          value: 'Used when the shipping address does not match any configured zone',
        },
      ],
      defaultValue: 35000,
      ui: { component: 'currency-form-input' },
    },
  },
  init: (injector: Injector) => {
    shippingZoneService = injector.get(ShippingZoneService);
  },
  calculate: async (ctx: RequestContext, order, args) => {
    const price = await shippingZoneService.resolveRate(ctx, order, args.fallbackRate);
    return {
      price,
      taxRate: 0,
      priceIncludesTax: ctx.channel.pricesIncludeTax,
    };
  },
});
