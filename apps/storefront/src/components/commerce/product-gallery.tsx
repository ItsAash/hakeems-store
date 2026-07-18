'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { Overlay } from '@/components/ui/overlay';
import { ArrowLeftIcon, ArrowRightIcon, CloseIcon } from '@/components/ui/icons';

const SWIPE_THRESHOLD_PX = 40;

export function ProductGallery({ images, alt }: { images: string[]; alt: string }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const touchStartX = useRef<number | null>(null);

  if (images.length === 0) {
    return <div className="aspect-[4/5] w-full bg-[var(--color-hairline)]" />;
  }

  const page = (direction: 1 | -1) =>
    setActiveIndex((current) => (current + direction + images.length) % images.length);

  const onTouchStart = (event: React.TouchEvent) => {
    touchStartX.current = event.touches[0]?.clientX ?? null;
  };
  const onTouchEnd = (event: React.TouchEvent) => {
    if (touchStartX.current === null || images.length < 2) return;
    const deltaX = (event.changedTouches[0]?.clientX ?? touchStartX.current) - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(deltaX) < SWIPE_THRESHOLD_PX) return;
    page(deltaX < 0 ? 1 : -1);
  };

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => setLightboxOpen(true)}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        aria-label="Zoom image"
        aria-haspopup="dialog"
        className="relative block aspect-[4/5] w-full cursor-zoom-in overflow-hidden bg-[var(--color-hairline)]"
      >
        {/* Keyed on src so selecting a thumbnail re-triggers the crossfade instead of hard-cutting. */}
        <Image
          key={images[activeIndex]}
          src={images[activeIndex] ?? ''}
          alt={alt}
          fill
          priority={activeIndex === 0}
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="animate-fade-in object-cover"
        />
      </button>

      {images.length > 1 && (
        <div className="scrollbar-none flex gap-2 overflow-x-auto">
          {images.map((src, index) => (
            <button
              key={src}
              type="button"
              onClick={() => setActiveIndex(index)}
              aria-label={`View image ${index + 1} of ${images.length}`}
              aria-current={index === activeIndex}
              className={`relative h-14 w-12 shrink-0 overflow-hidden border transition-colors sm:h-16 sm:w-14 ${
                index === activeIndex ? 'border-[var(--color-ink)]' : 'border-transparent hover:border-[var(--color-hairline)]'
              }`}
            >
              <Image src={src} alt="" fill sizes="48px" className="object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* Full-screen zoom — same Overlay primitive as every other dialog (focus trap,
          Escape, scroll lock). Arrows page within the current colour's gallery. */}
      <Overlay
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        label={`${alt} — enlarged image`}
        panelClassName="absolute inset-0 flex items-center justify-center p-4 md:p-10"
        panelClosedClassName="opacity-0"
        panelOpenClassName="opacity-100"
        panelTransitionClassName="transition-opacity duration-300"
      >
        <button
          type="button"
          onClick={() => setLightboxOpen(false)}
          aria-label="Close zoom"
          className="absolute top-4 right-4 flex h-11 w-11 items-center justify-center rounded-full bg-[var(--color-paper)]/90 text-[var(--color-ink)]"
        >
          <CloseIcon className="h-5 w-5" />
        </button>

        <div className="relative h-[90vh] w-[90vw] max-h-full max-w-full">
          <Image
            key={images[activeIndex]}
            src={images[activeIndex] ?? ''}
            alt={alt}
            fill
            sizes="90vw"
            className="animate-fade-in object-contain"
          />
        </div>

        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => page(-1)}
              aria-label="Previous image"
              className="absolute left-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-[var(--color-paper)]/90 text-[var(--color-ink)]"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => page(1)}
              aria-label="Next image"
              className="absolute right-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-[var(--color-paper)]/90 text-[var(--color-ink)]"
            >
              <ArrowRightIcon className="h-5 w-5" />
            </button>
          </>
        )}
      </Overlay>
    </div>
  );
}
