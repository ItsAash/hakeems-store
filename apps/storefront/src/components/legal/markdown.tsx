import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

/**
 * Renders Strapi Markdown / rich-text into the site's typographic system — serif headings,
 * muted body, generous line-height — so any policy page reads as premium long-form content
 * without a global typography plugin. Reusable anywhere long Markdown needs styling.
 *
 * Every element maps to explicit theme tokens (no `prose` dependency), and external links
 * get `target=_blank` + `rel=noopener` automatically.
 */
const components: Components = {
  h1: ({ children }) => <h2 className="mt-12 mb-4 font-serif text-2xl text-[var(--color-ink)]">{children}</h2>,
  h2: ({ children }) => <h2 className="mt-12 mb-4 font-serif text-2xl text-[var(--color-ink)]">{children}</h2>,
  h3: ({ children }) => <h3 className="mt-8 mb-3 font-serif text-xl text-[var(--color-ink)]">{children}</h3>,
  h4: ({ children }) => (
    <h4 className="mt-6 mb-2 text-xs font-semibold tracking-label text-[var(--color-ink)] uppercase">{children}</h4>
  ),
  p: ({ children }) => <p className="mb-5 leading-relaxed text-[var(--color-ink-muted)]">{children}</p>,
  ul: ({ children }) => (
    <ul className="mb-5 list-disc space-y-2 pl-5 text-[var(--color-ink-muted)] marker:text-[var(--color-ink-muted)]">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-5 list-decimal space-y-2 pl-5 text-[var(--color-ink-muted)] marker:text-[var(--color-ink-muted)]">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  a: ({ href, children }) => {
    const external = !!href && /^https?:\/\//.test(href);
    return (
      <a
        href={href}
        className="text-[var(--color-ink)] underline underline-offset-2 transition-opacity hover:opacity-70"
        {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      >
        {children}
      </a>
    );
  },
  strong: ({ children }) => <strong className="font-medium text-[var(--color-ink)]">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  blockquote: ({ children }) => (
    <blockquote className="my-6 border-l-2 border-[var(--color-hairline)] pl-4 text-[var(--color-ink-muted)] italic">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-10 border-[var(--color-hairline)]" />,
  code: ({ children }) => (
    <code className="rounded bg-[var(--color-hairline)] px-1.5 py-0.5 text-[0.85em] text-[var(--color-ink)]">
      {children}
    </code>
  ),
  table: ({ children }) => (
    <div className="mb-6 overflow-x-auto">
      <table className="w-full border-collapse text-left text-sm">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border-b border-[var(--color-hairline)] py-2 pr-4 font-medium text-[var(--color-ink)]">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border-b border-[var(--color-hairline)] py-2 pr-4 text-[var(--color-ink-muted)]">{children}</td>
  ),
};

export function Markdown({ content }: { content: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {content}
    </ReactMarkdown>
  );
}
