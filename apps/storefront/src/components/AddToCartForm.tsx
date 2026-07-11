'use client';

import { useState } from 'react';
import type { ChannelCode } from '@/lib/channels';
import type { VendureProduct } from '@/lib/vendure';

export function AddToCartForm({ channel, variants }: { channel: ChannelCode; variants: VendureProduct['variants'] }) {
  const [selectedId, setSelectedId] = useState(variants[0]?.id ?? '');

  return (
    <form className="variant-group" action="/api/cart" method="post">
      <input type="hidden" name="channel" value={channel} />
      <input type="hidden" name="quantity" value="1" />
      <input type="hidden" name="variantId" value={selectedId} />

      <p className="variant-label">Select Option</p>
      <div className="variant-pills">
        {variants.map((variant) => {
          const label = variant.options.map((option) => option.name).join(' / ') || variant.name;
          const outOfStock = variant.stockLevel === 'OUT_OF_STOCK';
          return (
            <button
              key={variant.id}
              type="button"
              className="variant-pill"
              data-selected={selectedId === variant.id}
              disabled={outOfStock}
              onClick={() => setSelectedId(variant.id)}
            >
              {label}
              {outOfStock ? ' · Sold Out' : ''}
            </button>
          );
        })}
      </div>

      <div className="pdp-actions">
        <button type="submit" className="button full" disabled={!selectedId}>
          Add to Bag
        </button>
      </div>
    </form>
  );
}
