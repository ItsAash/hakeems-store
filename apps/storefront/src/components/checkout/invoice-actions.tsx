'use client';

/**
 * `.no-print` (globals.css) hides this row when printing, since the invoice itself
 * (#invoice) is what actually gets isolated on the page for window.print() — no separate
 * print route needed. "Download PDF" is a plain link to the invoice Route Handler, which
 * streams a real generated PDF (Content-Disposition: attachment), not a print-to-PDF hint.
 */
export function InvoiceActions({ downloadHref }: { downloadHref: string }) {
  return (
    <div className="no-print flex flex-wrap items-center justify-center gap-4">
      <button
        type="button"
        onClick={() => window.print()}
        className="border border-[var(--color-ink)] px-6 py-3 text-sm font-medium tracking-label text-[var(--color-ink)] uppercase transition-opacity hover:opacity-70"
      >
        Print Invoice
      </button>
      <a
        href={downloadHref}
        className="bg-[var(--color-ink)] px-6 py-3 text-sm font-medium tracking-label text-[var(--color-paper)] uppercase transition-opacity hover:opacity-90"
      >
        Download PDF
      </a>
    </div>
  );
}
