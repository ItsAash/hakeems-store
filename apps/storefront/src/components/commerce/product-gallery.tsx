'use client';

import { useState } from 'react';

export function ProductGallery({ images, alt }: { images: string[]; alt: string }) {
  const [activeIndex, setActiveIndex] = useState(0);

  if (images.length === 0) {
    return <div className="aspect-[4/5] w-full bg-[var(--color-hairline)]" />;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="aspect-[4/5] w-full overflow-hidden bg-[var(--color-hairline)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={images[activeIndex]} alt={alt} className="h-full w-full object-cover" />
      </div>

      {images.length > 1 && (
        <div className="flex gap-2">
          {images.map((src, index) => (
            <button
              key={src}
              type="button"
              onClick={() => setActiveIndex(index)}
              aria-label={`View image ${index + 1} of ${images.length}`}
              aria-current={index === activeIndex}
              className={`h-16 w-14 shrink-0 overflow-hidden border transition-colors ${
                index === activeIndex ? 'border-[var(--color-ink)]' : 'border-transparent hover:border-[var(--color-hairline)]'
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
