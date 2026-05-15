import Link from 'next/link';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen grid-rows-[1fr_auto]">
      {children}
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border-subtle px-[clamp(24px,5vw,80px)] py-6 text-xs text-fg-muted">
        <span>© {new Date().getFullYear()} AuditIQ SAS</span>
        <span className="flex flex-wrap gap-4">
          <Link href="/mentions-legales" className="hover:text-fg-secondary">
            Mentions légales
          </Link>
          <Link href="/confidentialite" className="hover:text-fg-secondary">
            Confidentialité
          </Link>
          <Link href="/securite" className="hover:text-fg-secondary">
            Sécurité
          </Link>
        </span>
      </footer>
    </div>
  );
}
