/**
 * Motion layer 2 — the route transition (see ENTERPRISE_OVERHAUL_LOG.md Part IV).
 * Next remounts a template on every navigation (Link, router.push, back/forward), so
 * each page enters with the same soft rise-and-settle — one gesture, everywhere, with
 * zero custom routing code. The chrome (nav/footer) lives in layout.tsx above this and
 * never re-animates. Reduced motion collapses it via the global kill-switch.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="animate-page-enter">{children}</div>;
}
