import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { isChannelCode } from '@/lib/channel';
import { getLegalPage } from '@/lib/strapi/queries';
import { CONTAINER } from '@/lib/ui';
import { Markdown } from '@/components/legal/markdown';

type LegalParams = Promise<{ channel: string }>;

function formatUpdated(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('en', { year: 'numeric', month: 'long', day: 'numeric' }).format(date);
}

/**
 * SEO metadata for a legal page — prefers the Strapi SEO component, falls back to the title.
 * Legal copy is channel-agnostic, so the channel param isn't needed here.
 */
export async function legalPageMetadata(slug: string): Promise<Metadata> {
  const page = await getLegalPage(slug);
  if (!page) return {};
  const title = page.seo?.metaTitle || page.title;
  const description = page.seo?.metaDescription || undefined;
  return {
    title,
    description,
    openGraph: { title, description, type: 'article' },
  };
}

/**
 * Reusable, fully-dynamic renderer for any Strapi legal page. Each route (privacy, terms,
 * shipping-returns, …) just passes its slug — the title, "last updated" date, and Markdown
 * body all come from Strapi, so admins add/edit pages with no code changes. 404s cleanly
 * when the slug has no published entry.
 */
export async function LegalPageView({ slug, params }: { slug: string; params: LegalParams }) {
  const { channel } = await params;
  if (!isChannelCode(channel)) notFound();

  const page = await getLegalPage(slug);
  if (!page) notFound();

  const updated = formatUpdated(page.updatedAt);

  return (
    <main className={`flex-1 py-section ${CONTAINER}`}>
      <article className="mx-auto max-w-3xl">
        <header className="mb-10 border-b border-[var(--color-hairline)] pb-8">
          <h1 className="font-serif text-4xl text-[var(--color-ink)] md:text-5xl">{page.title}</h1>
          {updated && <p className="mt-4 text-sm text-[var(--color-ink-muted)]">Last updated {updated}</p>}
        </header>
        <div className="text-[15px]">
          <Markdown content={page.content} />
        </div>
      </article>
    </main>
  );
}
