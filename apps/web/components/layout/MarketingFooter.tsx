import * as React from 'react';
import Link from 'next/link';
import { Container } from './Container';
import { BrandMark } from './BrandMark';

interface FooterColumn {
  title: string;
  links: { label: string; href: string }[];
}

const COLUMNS: FooterColumn[] = [
  {
    title: 'Produit',
    links: [
      { label: "Vue d'ensemble", href: '/produit' },
      { label: 'Modules', href: '/modules' },
      { label: 'Comment ça marche', href: '/comment-ca-marche' },
      { label: 'Tarifs', href: '/tarifs' },
      { label: 'Comparatif', href: '/comparatif' },
    ],
  },
  {
    title: "Cas d'usage",
    links: [
      { label: 'RH & recrutement', href: '/cas-usage' },
      { label: 'Crédit & scoring', href: '/cas-usage' },
      { label: 'Service client / chatbot', href: '/cas-usage' },
      { label: 'Finance & assurance', href: '/cas-usage' },
      { label: 'PME : pourquoi maintenant', href: '/pme' },
    ],
  },
  {
    title: 'Ressources',
    links: [
      { label: 'AI Act & conformité', href: '/ai-act' },
      { label: 'Blog & ressources', href: '/ressources' },
      { label: 'FAQ', href: '/faq' },
      { label: 'Études de cas', href: '/temoignages' },
    ],
  },
  {
    title: 'Entreprise',
    links: [
      { label: 'À propos', href: '/a-propos' },
      { label: 'Contact', href: '/contact' },
      { label: 'Demander une démo', href: '/contact' },
      { label: 'Se connecter', href: '/connexion' },
      { label: 'Créer un compte', href: '/inscription' },
    ],
  },
];

export function MarketingFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-32 border-t border-border-default bg-surface pt-20 pb-12">
      <Container>
        <div className="mb-12 grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-[2fr_repeat(4,1fr)]">
          <div>
            <BrandMark />
            <p className="mt-4 max-w-[320px] text-sm leading-relaxed text-fg-muted">
              Audit de fairness IA pour les PME françaises et européennes. Détectez, expliquez et
              documentez les biais de vos systèmes d&apos;IA en moins d&apos;une heure, sans écrire
              une ligne de code.
            </p>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h5 className="mb-4 font-mono text-xs uppercase tracking-[0.12em] font-medium text-fg-muted">
                {col.title}
              </h5>
              <ul className="flex flex-col gap-2.5">
                {col.links.map((link) => (
                  <li key={link.label + link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-fg-secondary hover:text-fg transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-4 border-t border-border-subtle pt-6 text-xs text-fg-muted sm:flex-row sm:justify-between">
          <span>© {year} AuditIQ SAS · Tous droits réservés · Siège : Paris, France</span>
          <span className="flex flex-wrap gap-4">
            <Link href="/mentions-legales" className="hover:text-fg-secondary">
              Mentions légales
            </Link>
            <Link href="/cgu" className="hover:text-fg-secondary">
              CGU
            </Link>
            <Link href="/confidentialite" className="hover:text-fg-secondary">
              Politique de confidentialité
            </Link>
            <Link href="/rgpd" className="hover:text-fg-secondary">
              RGPD
            </Link>
            <Link href="/securite" className="hover:text-fg-secondary">
              Sécurité
            </Link>
          </span>
        </div>
      </Container>
    </footer>
  );
}
