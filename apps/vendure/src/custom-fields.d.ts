import '@vendure/core/dist/entity/custom-entity-fields';

declare module '@vendure/core/dist/entity/custom-entity-fields' {
  interface CustomProductFields {
    enrichedDescription?: string | null;
    seoTitle?: string | null;
    seoDescription?: string | null;
  }
}
