import { Body, Controller, Headers, Logger, OnApplicationBootstrap, Post } from '@nestjs/common';
import {
  EventBus,
  LanguageCode,
  PluginCommonModule,
  ProductEvent,
  ProductService,
  RequestContextService,
  VendurePlugin,
} from '@vendure/core';

type StrapiSyncPluginOptions = {
  url: string;
  secret: string;
};

type StrapiProductWebhook = {
  event?: string;
  entry?: {
    vendureId?: string;
    enrichedDescription?: string | null;
    seoTitle?: string | null;
    seoDescription?: string | null;
  };
};

let options: StrapiSyncPluginOptions = {
  url: '',
  secret: '',
};

@Controller('webhooks/strapi')
export class StrapiWebhookController {
  private readonly logger = new Logger('StrapiWebhookController');

  constructor(
    private requestContextService: RequestContextService,
    private productService: ProductService,
  ) {}

  @Post()
  async handle(@Headers('x-hakeems-sync-secret') secret: string, @Body() body: StrapiProductWebhook) {
    if (!options.secret || secret !== options.secret) {
      return { ok: false, status: 'unauthorized' };
    }

    const entry = body.entry;
    const vendureId = entry?.vendureId;

    if (!vendureId) {
      return { ok: true, status: 'ignored', reason: 'missing vendureId' };
    }

    const ctx = await this.requestContextService.create({
      apiType: 'admin',
      languageCode: LanguageCode.en,
    });
    const product = await this.productService.findOne(ctx, vendureId);

    if (!product) {
      return { ok: true, status: 'ignored', reason: 'product not found' };
    }

    const nextCustomFields = {
      ...(product.customFields || {}),
      enrichedDescription: entry.enrichedDescription || '',
      seoTitle: entry.seoTitle || '',
      seoDescription: entry.seoDescription || '',
    };

    const unchanged =
      (product.customFields?.enrichedDescription || '') === nextCustomFields.enrichedDescription &&
      (product.customFields?.seoTitle || '') === nextCustomFields.seoTitle &&
      (product.customFields?.seoDescription || '') === nextCustomFields.seoDescription;

    if (unchanged) {
      return { ok: true, status: 'skipped' };
    }

    await this.productService.update(ctx, {
      id: product.id,
      customFields: nextCustomFields,
    });

    this.logger.log(`Updated CMS custom fields for Vendure product ${product.id}`);
    return { ok: true, status: 'updated' };
  }
}

@VendurePlugin({
  imports: [PluginCommonModule],
  providers: [],
  controllers: [StrapiWebhookController],
})
export class StrapiSyncPlugin implements OnApplicationBootstrap {
  private readonly logger = new Logger('StrapiSyncPlugin');

  constructor(
    private eventBus: EventBus,
    private productService: ProductService,
  ) {}

  static init(pluginOptions: StrapiSyncPluginOptions) {
    options = pluginOptions;
    return StrapiSyncPlugin;
  }

  onApplicationBootstrap() {
    this.eventBus.ofType(ProductEvent).subscribe(async (event) => {
      if (!options.url || !options.secret) return;

      try {
        const ctx = event.ctx;

        // event.entity is the raw (untranslated) row EventBus emits — product.name would
        // be undefined off of it directly. findOne() resolves translations plus the
        // featuredAsset/channels relations we need below in one go.
        const product =
          event.type === 'deleted'
            ? event.entity
            : await this.productService.findOne(ctx, event.entity.id, ['featuredAsset', 'channels']);
        if (!product) return;

        const channelCodes = (product.channels || []).map((channel) => channel.code);
        const channel =
          channelCodes.includes('nepal') && channelCodes.includes('hongkong')
            ? 'both'
            : channelCodes.includes('hongkong')
              ? 'hongkong'
              : channelCodes.includes('nepal')
                ? 'nepal'
                : 'both';

        const payload = {
          action: event.type === 'deleted' ? 'delete' : 'upsert',
          products: [
            {
              vendureId: String(product.id),
              title: product.name,
              handle: product.slug,
              thumbnailUrl: product.featuredAsset?.preview || null,
              channel,
            },
          ],
        };

        const response = await fetch(options.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Hakeems-Sync-Secret': options.secret,
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          this.logger.warn(`Strapi sync failed for product ${product.id}: ${response.status} ${await response.text()}`);
        }
      } catch (error: any) {
        this.logger.warn(`Strapi sync failed: ${error?.message || error}`);
      }
    });
  }
}
