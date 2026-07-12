import { LanguageCode, PluginCommonModule, VendurePlugin } from '@vendure/core';

@VendurePlugin({
  imports: [PluginCommonModule],
  configuration: config => {
    config.customFields.ProductOption.push({
      name: 'swatch',
      type: 'string',
      nullable: true,
      public: true,
      pattern: '^#[0-9A-Fa-f]{6}$',
      label: [{ languageCode: LanguageCode.en, value: 'Color swatch' }],
      description: [
        {
          languageCode: LanguageCode.en,
          value: 'Hex color shown as a swatch for this option, e.g. on Color option values',
        },
      ],
      ui: { component: 'color-picker' },
    });
    return config;
  },
  dashboard: './dashboard/index.tsx',
  compatibility: '^3.7.0',
})
export class ProductOptionSwatchPlugin {}
