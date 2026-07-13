---
name: hakeems-architecture
description: Passive alignment for building a modular, high-aesthetic Skims/Athleta styled storefront using Strapi 5 and Vendure.
---

# Architecture Ground Rules

- **Storefront Concept:** High-fashion, conversion-focused, minimalist grid, robust media presentation (Skims/Athleta vibe).
- **Separation of Concerns:**
  - Strapi = Presentational content canvas, global configurations, banners, layout flags, responsive image components.
  - Vendure = All core transactional operations, product availability, real-time variants, facet arrays, and user authentication.
- **Data Integration:** Frontend orchestrates a "mesh fetch"—loading the visual shell from Strapi, and populating live transactional data natively via Vendure GraphQL queries.
