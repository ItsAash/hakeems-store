'use client';

import { useEffect } from 'react';

/**
 * "The House Opening" — the one-time-per-session cinematic brand intro (motion layer 1,
 * see ENTERPRISE_OVERHAUL_LOG.md Part IV).
 *
 * A full-viewport paper field over the already-rendered page: the serif wordmark rises
 * letter-by-letter out of a masked line, a hairline rule draws beneath it, the micro
 * eyebrow fades up, a beat, and the whole field lifts like a curtain. Entirely CSS-driven
 * (compositor-only properties); this component only owns the completion bookkeeping.
 *
 * Visibility is decided BEFORE first paint by the inline script in the root layout, which
 * stamps `data-intro` on <html> (play = first visit this session AND no reduced-motion;
 * done = everything else — including no-JS, where the overlay stays display:none). The
 * hard timeout below is a failsafe: a dropped animation event can never trap the user
 * behind the veil.
 *
 * Configurable and business-logic-free: brand strings arrive as props (fed from Strapi's
 * site-setting by the layout) — nothing CMS-managed is hardcoded here.
 */

const SESSION_KEY = 'hakeems-intro-seen';

/** Timeline (ms) — also mirrored in the CSS custom properties set inline below. */
const LETTER_STAGGER = 45;
const LETTER_DURATION = 650;
const LIFT_AT = 2050;
const LIFT_DURATION = 750;
const FAILSAFE_AT = 4000;

export function IntroOverlay({ brandName, eyebrow }: { brandName: string; eyebrow: string }) {
  useEffect(() => {
    if (document.documentElement.dataset.intro !== 'play') return;

    const finish = () => {
      document.documentElement.dataset.intro = 'done';
      try {
        window.sessionStorage.setItem(SESSION_KEY, '1');
      } catch {
        // Storage unavailable (private mode) — the intro may replay next load; harmless.
      }
    };

    const done = window.setTimeout(finish, LIFT_AT + LIFT_DURATION + 50);
    const failsafe = window.setTimeout(finish, FAILSAFE_AT);
    return () => {
      window.clearTimeout(done);
      window.clearTimeout(failsafe);
    };
  }, []);

  const letters = Array.from(brandName);

  return (
    <div
      aria-hidden="true"
      className="intro-overlay fixed inset-0 z-70 flex-col items-center justify-center gap-7 bg-[var(--color-paper)]"
      style={{ animation: `intro-lift ${LIFT_DURATION}ms var(--ease-luxe) ${LIFT_AT}ms forwards` }}
    >
      {/* Wordmark — each letter rises out of its own overflow mask. */}
      <p className="flex overflow-hidden font-serif text-display-xl text-[var(--color-ink)]">
        {letters.map((letter, i) => (
          <span
            key={`${letter}-${i}`}
            className="inline-block will-change-transform"
            style={{
              animation: `intro-letter ${LETTER_DURATION}ms var(--ease-luxe) ${150 + i * LETTER_STAGGER}ms both`,
            }}
          >
            {letter === ' ' ? ' ' : letter}
          </span>
        ))}
      </p>

      {/* Hairline rule drawing outward from center. */}
      <span
        aria-hidden
        className="block h-px w-40 origin-center bg-[var(--color-ink)]/30"
        style={{ animation: `intro-rule 600ms var(--ease-luxe) ${150 + letters.length * LETTER_STAGGER + 250}ms both` }}
      />

      {/* Micro eyebrow — the house's two cities (app-level channel config). */}
      <p
        className="text-3xs font-medium tracking-hero text-[var(--color-ink-muted)] uppercase"
        style={{ animation: `intro-fade-up 500ms var(--ease-luxe) ${150 + letters.length * LETTER_STAGGER + 450}ms both` }}
      >
        {eyebrow}
      </p>
    </div>
  );
}
