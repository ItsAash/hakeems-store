'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { Overlay } from '@/components/ui/overlay';
import { ArrowLeftIcon, ArrowRightIcon, CloseIcon, GridViewIcon, SingleViewIcon } from '@/components/ui/icons';

const SWIPE_THRESHOLD_PX = 40;

type GalleryLayout = 'single' | 'grid';

/**
 * The PDP gallery, designed per medium instead of shrunk:
 * — Mobile: a swipeable single image with a thumbnail rail (thumb-first interaction).
 * — Desktop: an editorial two-up grid of the active colorway's full gallery by default
 *   (the images ARE the page), with a toggle back to a focused single-image view.
 * Every image opens the shared full-screen lightbox; colour changes remount the component
 * (keyed upstream) so the crossfade re-runs and the index resets to the new colorway.
 */
export function ProductGallery({ images, alt }: { images: string[]; alt: string }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [layout, setLayout] = useState<GalleryLayout>('grid');
  const touchStartX = useRef<number | null>(null);

  if (images.length === 0) {
    return <div className="aspect-[3/4] w-full bg-[var(--color-hairline)]" />;
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

  const openLightboxAt = (index: number) => {
    setActiveIndex(index);
    setLightboxOpen(true);
  };

  const singleView = (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => setLightboxOpen(true)}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        aria-label="Zoom image"
        aria-haspopup="dialog"
        className="relative block aspect-[3/4] w-full cursor-zoom-in overflow-hidden bg-[var(--color-hairline)]"
      >
        {/* Keyed on src so selecting a thumbnail re-triggers the crossfade instead of hard-cutting. */}
        <Image
          key={images[activeIndex]}
          src={images[activeIndex] ?? ''}
          alt={alt}
          fill
          priority={activeIndex === 0}
          sizes="(min-width: 1024px) 55vw, 100vw"
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
              className={`relative h-16 w-12 shrink-0 overflow-hidden border transition-colors duration-200 ${
                index === activeIndex ? 'border-[var(--color-ink)]' : 'border-transparent hover:border-[var(--color-hairline)]'
              }`}
            >
              <Image src={src} alt="" fill sizes="48px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="relative">
      {/* Mobile — always the swipe view. */}
      <div className="lg:hidden">{singleView}</div>

      {/* Desktop — editorial grid by default, single-focus on demand. */}
      <div className="hidden lg:block">
        {images.length > 1 && (
          <div className="absolute top-3 right-3 z-10 flex gap-1" role="group" aria-label="Gallery layout">
            <GalleryLayoutButton
              label="Grid view"
              active={layout === 'grid'}
              onClick={() => setLayout('grid')}
              Icon={GridViewIcon}
            />
            <GalleryLayoutButton
              label="Single image view"
              active={layout === 'single'}
              onClick={() => setLayout('single')}
              Icon={SingleViewIcon}
            />
          </div>
        )}

        {layout === 'grid' && images.length > 1 ? (
          <div className="grid grid-cols-2 gap-2">
            {images.map((src, index) => (
              <button
                key={src}
                type="button"
                onClick={() => openLightboxAt(index)}
                aria-label={`Zoom image ${index + 1} of ${images.length}`}
                aria-haspopup="dialog"
                className="relative aspect-[3/4] cursor-zoom-in overflow-hidden bg-[var(--color-hairline)]"
              >
                <Image
                  src={src}
                  alt={`${alt} — image ${index + 1}`}
                  fill
                  priority={index < 2}
                  sizes="(min-width: 1024px) 28vw, 50vw"
                  className="animate-fade-in object-cover"
                />
              </button>
            ))}
          </div>
        ) : (
          singleView
        )}
      </div>

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

function GalleryLayoutButton({
  label,
  active,
  onClick,
  Icon,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  Icon: (props: { className?: string }) => React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={`flex h-9 w-9 items-center justify-center backdrop-blur transition-colors duration-200 ${
        active
          ? 'bg-[var(--color-ink)] text-[var(--color-paper)]'
          : 'bg-[var(--color-paper)]/85 text-[var(--color-ink)] hover:bg-[var(--color-paper)]'
      }`}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}
