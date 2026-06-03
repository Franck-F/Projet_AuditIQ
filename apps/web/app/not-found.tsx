import Link from 'next/link';
import { MarketingHeader } from '@/components/layout/MarketingHeader';
import { MarketingFooter } from '@/components/layout/MarketingFooter';
import { Container } from '@/components/layout/Container';
import { Button } from '@/components/ui/button';
import { Eyebrow } from '@/components/marketing/Eyebrow';

const SHORTCUTS = [
  { label: 'Découvrir', title: 'Le produit en 3 modules →', href: '/produit' },
  { label: 'Conformité', title: 'AI Act & obligations PME →', href: '/ai-act' },
  { label: 'Pricing', title: 'Voir les tarifs →', href: '/tarifs' },
  { label: 'Lecture', title: 'Blog & ressources →', href: '/blog' },
];

export default function NotFound() {
  return (
    <>
      <MarketingHeader />
      <main>
        <Container>
          <div className="grid min-h-[calc(100vh-var(--nav-h)-120px)] grid-cols-1 items-center gap-10 py-[clamp(64px,10vw,120px)] lg:grid-cols-2 lg:gap-16">
            <div>
              <Eyebrow accent>Erreur · 404</Eyebrow>
              <div
                className="mb-6 mt-4 bg-gradient-to-b from-accent to-transparent bg-clip-text font-mono font-semibold leading-none tracking-[-0.05em] text-transparent"
                style={{ fontSize: 'clamp(120px, 18vw, 240px)' }}
                aria-hidden
              >
                404
              </div>
            </div>
            <div>
              <h1 className="mb-4 text-[clamp(28px,3vw,36px)] font-display font-medium tracking-[-0.02em] text-fg">
                Cette page n&apos;existe pas — ou n&apos;existe plus.
              </h1>
              <p className="mb-8 max-w-[50ch] leading-relaxed text-fg-secondary">
                L&apos;URL que vous avez suivie ne correspond à aucune page de notre site. Peut-être
                un lien obsolète, une faute de frappe, ou un déplacement de contenu. Voici quelques
                pistes pour retrouver votre chemin.
              </p>
              <div className="mb-10 flex flex-wrap gap-3">
                <Button asChild variant="primary">
                  <Link href="/">Retour à l&apos;accueil</Link>
                </Button>
                <Button asChild variant="secondary">
                  <Link href="/contact">Contacter notre équipe</Link>
                </Button>
              </div>
              <div className="grid max-w-[480px] grid-cols-1 gap-3 sm:grid-cols-2">
                {SHORTCUTS.map((s) => (
                  <Link
                    key={s.href}
                    href={s.href}
                    className="flex flex-col gap-1 rounded-md border border-border-default bg-surface p-4 transition-colors hover:border-border-strong"
                  >
                    <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-muted">
                      {s.label}
                    </span>
                    <span className="text-sm font-medium text-fg">{s.title}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </Container>
      </main>
      <MarketingFooter />
    </>
  );
}
