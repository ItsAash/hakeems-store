import type { Schema, Struct } from '@strapi/strapi';

export interface LayoutAnnouncement extends Struct.ComponentSchema {
  collectionName: 'components_layout_announcements';
  info: {
    description: 'One line in the top marquee. Optionally scheduled.';
    displayName: 'Announcement';
    icon: 'bullhorn';
  };
  attributes: {
    endsAt: Schema.Attribute.DateTime;
    href: Schema.Attribute.String;
    startsAt: Schema.Attribute.DateTime;
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

export interface LayoutHeroSlide extends Struct.ComponentSchema {
  collectionName: 'components_layout_hero_slides';
  info: {
    description: 'One slide in the homepage hero image slider.';
    displayName: 'Hero Slide';
    icon: 'images';
  };
  attributes: {
    align: Schema.Attribute.Enumeration<['start', 'center']> &
      Schema.Attribute.DefaultTo<'start'>;
    alt: Schema.Attribute.String;
    ctaHref: Schema.Attribute.String;
    ctaLabel: Schema.Attribute.String;
    eyebrow: Schema.Attribute.String;
    heading: Schema.Attribute.String & Schema.Attribute.Required;
    image: Schema.Attribute.Media<'images'> & Schema.Attribute.Required;
    subheading: Schema.Attribute.Text;
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
      'layout.hero-slide': LayoutHeroSlide;
      'layout.value-item': LayoutValueItem;
      'shared.link': SharedLink;
      'shared.paragraph': SharedParagraph;
      'shared.seo': SharedSeo;
      'shared.social-link': SharedSocialLink;
    }
  }
}
