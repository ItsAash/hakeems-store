import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Hakeems',
  description: 'Community streetwear from Nepal and Hong Kong.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
