import { CreatePaymentResult, LanguageCode, PaymentMethodHandler, SettlePaymentResult } from '@vendure/core';

export const fonepayPlaceholderHandler = new PaymentMethodHandler({
  code: 'fonepay-placeholder',
  description: [
    {
      languageCode: LanguageCode.en,
      value: 'Fonepay placeholder for Nepal channel. Replace before production.',
    },
  ],
  args: {
    enabledNote: {
      type: 'string',
      defaultValue: 'Placeholder only. Implement Fonepay API signing and callbacks here.',
      readonly: true,
    },
  },
  createPayment: async (_ctx, order, amount): Promise<CreatePaymentResult> => {
    return {
      amount,
      state: 'Settled',
      transactionId: `fonepay-placeholder-${order.code}`,
      metadata: {
        public: {
          provider: 'fonepay-placeholder',
          note: 'This is a local test payment only.',
        },
      },
    };
  },
  settlePayment: async (): Promise<SettlePaymentResult> => ({ success: true }),
});
