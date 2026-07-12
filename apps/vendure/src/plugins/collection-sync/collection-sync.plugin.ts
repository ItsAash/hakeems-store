import { Logger, OnApplicationBootstrap } from '@nestjs/common';
import { CollectionEvent, CollectionService, EventBus, PluginCommonModule, VendurePlugin } from '@vendure/core';

type CollectionSyncPluginOptions = {
  url: string;
  secret: string;
};

let options: CollectionSyncPluginOptions = {
  url: '',
  secret: '',
};

/**
 * One-way sync: whenever a Collection is created, renamed, or deleted in Vendure, pushes
 * {vendureId, name, slug} to Strapi's `POST /api/collection-pages/sync`. Vendure remains the
 * sole source of truth for which collections exist and which channel(s) they sell in (via
 * assignCollectionsToChannel) — Strapi only owns presentation (banner, tagline, featured).
 * There is no reverse sync: nothing in Strapi ever needs to be written back into Vendure.
 */
@VendurePlugin({
  imports: [PluginCommonModule],
})
export class CollectionSyncPlugin implements OnApplicationBootstrap {
  private readonly logger = new Logger('CollectionSyncPlugin');

  constructor(
    private eventBus: EventBus,
    private collectionService: CollectionService,
  ) {}

  static init(pluginOptions: CollectionSyncPluginOptions) {
    options = pluginOptions;
    return CollectionSyncPlugin;
  }

  onApplicationBootstrap() {
    this.eventBus.ofType(CollectionEvent).subscribe(async (event) => {
      if (!options.url || !options.secret) return;

      try {
        const ctx = event.ctx;

        // event.entity is the raw (untranslated) row EventBus emits — findOne() resolves
        // the translated name/slug the same way the product sync used to need for name.
        const collection =
          event.type === 'deleted' ? event.entity : await this.collectionService.findOne(ctx, event.entity.id);
        if (!collection) return;

        const payload = {
          action: event.type === 'deleted' ? 'delete' : 'upsert',
          collections: [
            {
              vendureId: String(collection.id),
              name: collection.name,
              slug: collection.slug,
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
          this.logger.warn(`Strapi sync failed for collection ${collection.id}: ${response.status} ${await response.text()}`);
        }
      } catch (error: any) {
        this.logger.warn(`Strapi sync failed: ${error?.message || error}`);
      }
    });
  }
}
