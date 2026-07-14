import type { Metadata } from 'next';
import { LegalPageView, legalPageMetadata } from '@/components/legal/legal-page-view';

const SLUG = 'terms';

export function generateMetadata({ params }: { params: Promise<{ channel: string }> }): Promise<Metadata> {
  return legalPageMetadata(SLUG, params);
}

export default function TermsPage({ params }: { params: Promise<{ channel: string }> }) {
  return <LegalPageView slug={SLUG} params={params} />;
}
