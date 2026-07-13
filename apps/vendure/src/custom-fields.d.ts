import '@vendure/core/dist/entity/custom-entity-fields';

declare module '@vendure/core/dist/entity/custom-entity-fields' {
  interface CustomProductFields {
    enrichedDescription?: string | null;
    seoTitle?: string | null;
    seoDescription?: string | null;
    /** PDP "Fit & Fabric" tab (HTML). */
    fitAndFabric?: string | null;
    /** PDP "Shipping & Returns" tab (HTML). */
    shippingReturns?: string | null;
  }
}
