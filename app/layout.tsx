import type { Metadata, Viewport } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { GeistPixelSquare } from 'geist/font/pixel';
import './globals.css';

/**
 * The description leads with what the thing is for rather than with the protocol it
 * implements: someone arriving here wants to know that their notes become searchable
 * evidence on their own machine, and "Protocol implementation of an Index and a
 * QueryPlanner" is the README's opening, not a landing page's.
 */
const TITLE = 'vitruvio — knowledge you can check';
const DESCRIPTION =
  'The engine behind a Boltzmann Brain: portable, verifiable, model-agnostic knowledge. Six index kinds, text and vision embeddings, and a cost-based planner that can explain why it chose them. Every command speaks JSON, and the brain returns evidence, never prose.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  metadataBase: new URL('https://vitruvio.sfumato.sh'),
  icons: { icon: '/favicon.svg' },
  openGraph: {
    type: 'website',
    url: 'https://vitruvio.sfumato.sh/',
    title: TITLE,
    description: DESCRIPTION,
  },
  // `summary_large_image` without an og:image renders as a bare text card on X and
  // gets no preview at all in some clients. `summary` is honest until a real card
  // image exists.
  twitter: { card: 'summary' },
};

export const viewport: Viewport = {
  themeColor: '#0b0908',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable} ${GeistPixelSquare.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
