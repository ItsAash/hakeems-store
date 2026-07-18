'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Portal } from '@/components/ui/portal';

/**
 * The single overlay primitive behind every floating panel on the site — the cart drawer,
 * the search sheet, the mobile menu. It owns the things each of those used to (variably)
 * re-implement or skip entirely:
 *
 *   • enter/exit transition (mount is kept alive through the leave animation),
 *   • focus trap + focus restore to the trigger on close,
 *   • Escape-to-close and backdrop-click-to-close,
 *   • body scroll-lock while open,
 *   • dialog semantics (`role="dialog"` + `aria-modal` + a labelled title).
 *
 * The panel's *shape* (right drawer, top sheet, full-screen) is passed in by the caller via
 * `panelClassName` plus the closed/open transition classes, so the primitive stays layout-agnostic.
 */

const TRANSITION_MS = 300;

export function Overlay({
  open,
  onClose,
  label,
  panelClassName,
  panelClosedClassName,
  panelOpenClassName,
  panelTransitionClassName = 'transition-transform duration-300 ease-out',
  children,
}: {
  open: boolean;
  onClose: () => void;
  /** Accessible name for the dialog (announced to screen readers). */
  label: string;
  /** Positioning + size of the panel, e.g. `absolute right-0 top-0 h-full w-full max-w-sm`. */
  panelClassName: string;
  /** Transform in the closed/leaving state, e.g. `translate-x-full` or `-translate-y-full`. */
  panelClosedClassName: string;
  /** Transform in the open/entered state, e.g. `translate-x-0`. */
  panelOpenClassName: string;
  /** Transition classes applied to the panel; override to tune duration/easing. */
  panelTransitionClassName?: string;
  children: React.ReactNode;
}) {
  // `mounted` keeps the DOM alive through the leave transition; `entered` drives the
  // open/closed transform (flipped one frame after mount so the browser animates the change).
  const [mounted, setMounted] = useState(open);
  const [entered, setEntered] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const titleId = useId();

  useEffect(() => {
    if (open) {
      restoreFocusRef.current = document.activeElement as HTMLElement | null;
      setMounted(true);
      // Next frame: flip to the entered state so the transform transitions in.
      const raf = requestAnimationFrame(() => setEntered(true));
      return () => cancelAnimationFrame(raf);
    }
    setEntered(false);
    const timeout = setTimeout(() => setMounted(false), TRANSITION_MS);
    return () => clearTimeout(timeout);
  }, [open]);

  // Move focus into the panel on open; restore it to the trigger on close.
  useEffect(() => {
    if (!entered) return;
    const first = panelRef.current?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? panelRef.current)?.focus();
    return () => restoreFocusRef.current?.focus?.();
  }, [entered]);

  // Escape to close + Tab focus trap, scoped to while the overlay is mounted.
  useEffect(() => {
    if (!mounted) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = Array.from(panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) {
        event.preventDefault();
        return;
      }
      const active = document.activeElement;
      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [mounted, onClose]);

  // Lock body scroll while mounted; restore the prior value (supports nested/rapid opens).
  useEffect(() => {
    if (!mounted) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [mounted]);

  if (!mounted) return null;

  return (
    <Portal>
      <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={label} aria-labelledby={titleId}>
        <button
          type="button"
          aria-label={`Close ${label}`}
          onClick={onClose}
          className={`absolute inset-0 bg-[var(--color-ink)]/40 transition-opacity duration-300 ${
            entered ? 'opacity-100' : 'opacity-0'
          }`}
        />
        <div
          ref={panelRef}
          tabIndex={-1}
          className={`${panelClassName} ${panelTransitionClassName} outline-none ${
            entered ? panelOpenClassName : panelClosedClassName
          }`}
        >
          {/* Hidden accessible title target; visible headings inside children can also carry it. */}
          <span id={titleId} className="sr-only">
            {label}
          </span>
          {children}
        </div>
      </div>
    </Portal>
  );
}

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';
