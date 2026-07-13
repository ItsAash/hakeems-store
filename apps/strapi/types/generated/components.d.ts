import type { Schema, Struct } from '@strapi/strapi';

export interface LayoutAnnouncement extends Struct.ComponentSchema {
  collectionName: 'components_layout_announcements';
  info: {
    description: 'One line in the top marquee.';
    displayName: 'Announcement';
    icon: 'bullhorn';
  };
  attributes: {
    href: Schema.Attribute.String;
    text: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface LayoutCollectionTile extends Struct.ComponentSchema {
  collectionName: 'components_layout_collection_tiles';
  info: {
    description: "A 'Shop by Collection' tile linking to a Vendure collection by slug.";
    displayName: 'Collection Tile';
    icon: 'grid';
  };
  attributes: {
    image: Schema.Attribute.Media<'images'>;
    label: Schema.Attribute.String & Schema.Attribute.Required;
    tagline: Schema.Attribute.String;
    vendureCollectionSlug: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface LayoutFacetCategoryTile extends Struct.ComponentSchema {
  collectionName: 'components_layout_facet_category_tiles';
  info: {
    description: "A visual category grid tile linking to a Vendure facet value by its stable code (e.g. 'categories:tops'), not a brittle database id.";
    displayName: 'Facet Category Tile';
    icon: 'grid';
  };
  attributes: {
    image: Schema.Attribute.Media<'images'>;
    label: Schema.Attribute.String & Schema.Attribute.Required;
    tagline: Schema.Attribute.String;
    vendureFacetValueCode: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface LayoutHeroSlide extends Struct.ComponentSchema {
  collectionName: 'components_layout_hero_slides';
  info: {
    description: 'One slide in the homepage hero image slider.';
    displayName: 'Hero Slide';
    icon: 'images';
  };
  attributes: {
    alt: Schema.Attribute.String;
    ctaHref: Schema.Attribute.String;
    ctaLabel: Schema.Attribute.String;
    heading: Schema.Attribute.String & Schema.Attribute.Required;
    image: Schema.Attribute.Media<'images'> & Schema.Attribute.Required;
    imageMobile: Schema.Attribute.Media<'images'>;
    subheading: Schema.Attribute.Text;
  };
}

export interface LayoutNavItem extends Struct.ComponentSchema {
  collectionName: 'components_layout_nav_items';
  info: {
    description: 'One primary nav link, optionally with one level of flyout children.';
    displayName: 'Nav Item';
    icon: 'bulletList';
  };
  attributes: {
    children: Schema.Attribute.Component<'shared.link', true>;
    href: Schema.Attribute.String & Schema.Attribute.Required;
    label: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface LayoutValueItem extends Struct.ComponentSchema {
  collectionName: 'components_layout_value_items';
  info: {
    description: "One entry in the brand values strip, e.g. 'Small batches'.";
    displayName: 'Value Item';
    icon: 'star';
  };
  attributes: {
    body: Schema.Attribute.Text & Schema.Attribute.Required;
    heading: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface SectionBrandStory extends Struct.ComponentSchema {
  collectionName: 'components_section_brand_stories';
  info: {
    description: 'Editorial brand-story block: header, prose paragraphs, and an optional image.';
    displayName: 'Section: Brand Story';
    icon: 'quote';
  };
  attributes: {
    header: Schema.Attribute.Component<'shared.section-header', false>;
    image: Schema.Attribute.Media<'images'>;
    paragraphs: Schema.Attribute.Component<'shared.paragraph', true>;
  };
}

export interface SectionCategoryGrid extends Struct.ComponentSchema {
  collectionName: 'components_section_category_grids';
  info: {
    description: '"Shop by category" grid of facet-value tiles.';
    displayName: 'Section: Category Grid';
    icon: 'grid';
  };
  attributes: {
    header: Schema.Attribute.Component<'shared.section-header', false>;
    tiles: Schema.Attribute.Component<'layout.facet-category-tile', true>;
  };
}

export interface SectionEditorialBanner extends Struct.ComponentSchema {
  collectionName: 'components_section_editorial_banners';
  info: {
    description: 'Full-bleed split banner: editorial text panel + product-image montage for a Vendure collection (by slug).';
    displayName: 'Section: Editorial Banner';
    icon: 'layout';
  };
  attributes: {
    backgroundToken: Schema.Attribute.Enumeration<
      ['paper', 'paper-raised', 'blush', 'sand', 'hairline']
    > &
      Schema.Attribute.DefaultTo<'blush'>;
    cta: Schema.Attribute.Component<'shared.cta', false>;
    header: Schema.Attribute.Component<'shared.section-header', false>;
    vendureCollectionSlug: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface SectionHeroSlider extends Struct.ComponentSchema {
  collectionName: 'components_section_hero_sliders';
  info: {
    description: "Full-bleed hero image slider block for a page's dynamic zone.";
    displayName: 'Section: Hero Slider';
    icon: 'images';
  };
  attributes: {
    slides: Schema.Attribute.Component<'layout.hero-slide', true>;
  };
}

export interface SectionProductRail extends Struct.ComponentSchema {
  collectionName: 'components_section_product_rails';
  info: {
    description: 'Horizontal product carousel for a Vendure collection (referenced by slug), with an editorial header and CTA.';
    displayName: 'Section: Product Rail';
    icon: 'bulletList';
  };
  attributes: {
    cta: Schema.Attribute.Component<'shared.cta', false>;
    header: Schema.Attribute.Component<'shared.section-header', false>;
    vendureCollectionSlug: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface SharedCta extends Struct.ComponentSchema {
  collectionName: 'components_shared_ctas';
  info: {
    description: 'A standardized call-to-action: label, href, visual variant, and target. The single, reusable way to model any button/link across pages and blocks.';
    displayName: 'CTA';
    icon: 'cursor';
  };
  attributes: {
    href: Schema.Attribute.String & Schema.Attribute.Required;
    label: Schema.Attribute.String & Schema.Attribute.Required;
    openInNewTab: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    variant: Schema.Attribute.Enumeration<['primary', 'secondary', 'link']> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'primary'>;
  };
}

export interface SharedLink extends Struct.ComponentSchema {
  collectionName: 'components_shared_links';
  info: {
    displayName: 'Link';
    icon: 'link';
  };
  attributes: {
    href: Schema.Attribute.String & Schema.Attribute.Required;
    label: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface SharedMedia extends Struct.ComponentSchema {
  collectionName: 'components_shared_medias';
  info: {
    description: 'A single responsive image with an optional mobile variant and alt text. Standardizes image handling across blocks.';
    displayName: 'Media';
    icon: 'picture';
  };
  attributes: {
    alt: Schema.Attribute.String;
    image: Schema.Attribute.Media<'images'> & Schema.Attribute.Required;
    imageMobile: Schema.Attribute.Media<'images'>;
  };
}

export interface SharedParagraph extends Struct.ComponentSchema {
  collectionName: 'components_shared_paragraphs';
  info: {
    displayName: 'Paragraph';
    icon: 'align-left';
  };
  attributes: {
    text: Schema.Attribute.Text & Schema.Attribute.Required;
  };
}

export interface SharedSectionHeader extends Struct.ComponentSchema {
  collectionName: 'components_shared_section_headers';
  info: {
    description: 'Reusable section header: eyebrow, heading, optional subheading and alignment. Replaces the repeated eyebrow/heading/paragraph triples across sections.';
    displayName: 'Section Header';
    icon: 'heading';
  };
  attributes: {
    align: Schema.Attribute.Enumeration<['left', 'center']> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'left'>;
    eyebrow: Schema.Attribute.String;
    heading: Schema.Attribute.String & Schema.Attribute.Required;
    subheading: Schema.Attribute.Text;
  };
}

export interface SharedSeo extends Struct.ComponentSchema {
  collectionName: 'components_shared_seos';
  info: {
    description: 'Search engine and social share metadata.';
    displayName: 'SEO';
    icon: 'search';
  };
  attributes: {
    metaDescription: Schema.Attribute.Text &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 160;
      }>;
    metaTitle: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 70;
      }>;
    ogImage: Schema.Attribute.Media<'images'>;
  };
}

export interface SharedSocialLink extends Struct.ComponentSchema {
  collectionName: 'components_shared_social_links';
  info: {
    displayName: 'Social Link';
    icon: 'earth';
  };
  attributes: {
    platform: Schema.Attribute.Enumeration<
      ['instagram', 'tiktok', 'facebook', 'youtube', 'x', 'whatsapp']
    > &
      Schema.Attribute.Required;
    url: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

declare module '@strapi/strapi' {
  export namespace Public {
    export interface ComponentSchemas {
      'layout.announcement': LayoutAnnouncement;
      'layout.collection-tile': LayoutCollectionTile;
      'layout.facet-category-tile': LayoutFacetCategoryTile;
      'layout.hero-slide': LayoutHeroSlide;
      'layout.nav-item': LayoutNavItem;
      'layout.value-item': LayoutValueItem;
      'section.brand-story': SectionBrandStory;
      'section.category-grid': SectionCategoryGrid;
      'section.editorial-banner': SectionEditorialBanner;
      'section.hero-slider': SectionHeroSlider;
      'section.product-rail': SectionProductRail;
      'shared.cta': SharedCta;
      'shared.link': SharedLink;
      'shared.media': SharedMedia;
      'shared.paragraph': SharedParagraph;
      'shared.section-header': SharedSectionHeader;
      'shared.seo': SharedSeo;
      'shared.social-link': SharedSocialLink;
    }
  }
}
