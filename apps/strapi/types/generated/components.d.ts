import type { Schema, Struct } from '@strapi/strapi';

export interface FooterContact extends Struct.ComponentSchema {
  collectionName: 'components_footer_contacts';
  info: {
    description: 'Footer contact block: heading plus optional email, phone and postal address.';
    displayName: 'Footer Contact';
    icon: 'phone';
  };
  attributes: {
    address: Schema.Attribute.Text;
    email: Schema.Attribute.Email;
    heading: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 40;
      }>;
    phone: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 40;
      }>;
  };
}

export interface FooterLinkColumn extends Struct.ComponentSchema {
  collectionName: 'components_footer_link_columns';
  info: {
    description: 'One footer column: a heading plus an ordered list of links. Reusable for navigation, categories, support or policy groups \u2014 admins add/rename/reorder columns freely.';
    displayName: 'Footer Link Column';
    icon: 'bulletList';
  };
  attributes: {
    heading: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 40;
      }>;
    links: Schema.Attribute.Component<'shared.link', true>;
  };
}

export interface FooterNewsletter extends Struct.ComponentSchema {
  collectionName: 'components_footer_newsletters';
  info: {
    description: 'Newsletter sign-up block copy. All text is editor-managed; toggle `enabled` to show or hide the whole band.';
    displayName: 'Footer Newsletter';
    icon: 'envelop';
  };
  attributes: {
    buttonLabel: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 40;
      }> &
      Schema.Attribute.DefaultTo<'Subscribe'>;
    description: Schema.Attribute.Text;
    enabled: Schema.Attribute.Boolean &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<true>;
    heading: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 80;
      }>;
    placeholder: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 80;
      }> &
      Schema.Attribute.DefaultTo<'Enter your email'>;
    successMessage: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 160;
      }> &
      Schema.Attribute.DefaultTo<"Thanks \u2014 you're on the list.">;
  };
}

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
    alt: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 160;
      }>;
    ctaHref: Schema.Attribute.String;
    ctaLabel: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 40;
      }>;
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

export interface LayoutTestimonial extends Struct.ComponentSchema {
  collectionName: 'components_layout_testimonials';
  info: {
    description: "One customer quote for the section.testimonials wall: quote, author, and optional context (e.g. 'Kathmandu' or 'Verified buyer').";
    displayName: 'Testimonial';
    icon: 'quote';
  };
  attributes: {
    author: Schema.Attribute.String & Schema.Attribute.Required;
    context: Schema.Attribute.String;
    quote: Schema.Attribute.Text & Schema.Attribute.Required;
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

export interface SectionFaq extends Struct.ComponentSchema {
  collectionName: 'components_section_faqs';
  info: {
    description: 'Accordion of question/answer pairs (sizing, shipping, care\u2026). Answers are Markdown.';
    displayName: 'Section: FAQ';
    icon: 'question';
  };
  attributes: {
    header: Schema.Attribute.Component<'shared.section-header', false>;
    items: Schema.Attribute.Component<'shared.faq-item', true> &
      Schema.Attribute.Required;
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

export interface SectionProse extends Struct.ComponentSchema {
  collectionName: 'components_section_proses';
  info: {
    description: "Free-form Markdown content block rendered in the site's long-form typography \u2014 for editorial copy that doesn't fit a structured section.";
    displayName: 'Section: Prose';
    icon: 'align-left';
  };
  attributes: {
    content: Schema.Attribute.RichText & Schema.Attribute.Required;
    header: Schema.Attribute.Component<'shared.section-header', false>;
  };
}

export interface SectionTestimonials extends Struct.ComponentSchema {
  collectionName: 'components_section_testimonials';
  info: {
    description: 'Customer quote wall \u2014 a header plus repeatable Testimonial items.';
    displayName: 'Section: Testimonials';
    icon: 'quote';
  };
  attributes: {
    backgroundToken: Schema.Attribute.Enumeration<
      ['paper', 'paper-raised', 'blush', 'sand', 'hairline']
    > &
      Schema.Attribute.DefaultTo<'sand'>;
    header: Schema.Attribute.Component<'shared.section-header', false>;
    items: Schema.Attribute.Component<'layout.testimonial', true> &
      Schema.Attribute.Required;
  };
}

export interface SectionValueProps extends Struct.ComponentSchema {
  collectionName: 'components_section_value_props';
  info: {
    description: "Brand pillars strip (e.g. 'Small batches \u00B7 Technical fabrics \u00B7 Fair making') built from repeatable Value Items.";
    displayName: 'Section: Value Props';
    icon: 'star';
  };
  attributes: {
    backgroundToken: Schema.Attribute.Enumeration<
      ['paper', 'paper-raised', 'blush', 'sand', 'hairline']
    > &
      Schema.Attribute.DefaultTo<'paper'>;
    header: Schema.Attribute.Component<'shared.section-header', false>;
    items: Schema.Attribute.Component<'layout.value-item', true> &
      Schema.Attribute.Required;
  };
}

export interface SharedContentPanel extends Struct.ComponentSchema {
  collectionName: 'components_shared_content_panels';
  info: {
    description: "A titled Markdown panel (size guide, fabric table, care ritual\u2026) appended to a product page's detail tabs.";
    displayName: 'Content Panel';
    icon: 'file';
  };
  attributes: {
    content: Schema.Attribute.RichText & Schema.Attribute.Required;
    title: Schema.Attribute.String & Schema.Attribute.Required;
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

export interface SharedFaqItem extends Struct.ComponentSchema {
  collectionName: 'components_shared_faq_items';
  info: {
    description: 'One question/answer pair for a section.faq accordion. Answer is Markdown.';
    displayName: 'FAQ Item';
    icon: 'question';
  };
  attributes: {
    answer: Schema.Attribute.RichText & Schema.Attribute.Required;
    question: Schema.Attribute.String & Schema.Attribute.Required;
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
    label: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 80;
      }>;
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
    alt: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 160;
      }>;
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
      'footer.contact': FooterContact;
      'footer.link-column': FooterLinkColumn;
      'footer.newsletter': FooterNewsletter;
      'layout.announcement': LayoutAnnouncement;
      'layout.collection-tile': LayoutCollectionTile;
      'layout.facet-category-tile': LayoutFacetCategoryTile;
      'layout.hero-slide': LayoutHeroSlide;
      'layout.nav-item': LayoutNavItem;
      'layout.testimonial': LayoutTestimonial;
      'layout.value-item': LayoutValueItem;
      'section.brand-story': SectionBrandStory;
      'section.category-grid': SectionCategoryGrid;
      'section.editorial-banner': SectionEditorialBanner;
      'section.faq': SectionFaq;
      'section.hero-slider': SectionHeroSlider;
      'section.product-rail': SectionProductRail;
      'section.prose': SectionProse;
      'section.testimonials': SectionTestimonials;
      'section.value-props': SectionValueProps;
      'shared.content-panel': SharedContentPanel;
      'shared.cta': SharedCta;
      'shared.faq-item': SharedFaqItem;
      'shared.link': SharedLink;
      'shared.media': SharedMedia;
      'shared.paragraph': SharedParagraph;
      'shared.section-header': SharedSectionHeader;
      'shared.seo': SharedSeo;
      'shared.social-link': SharedSocialLink;
    }
  }
}
