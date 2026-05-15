import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'AuditIQ — Audit de fairness IA pour PME',
    template: '%s — AuditIQ',
  },
  description:
    'Détectez, expliquez et documentez les biais de vos systèmes d’IA en moins d’une heure, sans écrire une ligne de code. Aligné AI Act et droit français.',
  applicationName: 'AuditIQ',
  authors: [{ name: 'AuditIQ' }],
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    siteName: 'AuditIQ',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: '#0f0f0f',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
