import Link from 'next/link';
import { Construction, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Placeholder shown for the dashboard pages that have a slot in the Sidebar
 * but no implementation yet (phase 2 / hors-scope mémoire). Keeps the user
 * inside the app shell rather than throwing a Next.js 404 and reassures
 * them the link wasn't broken — it's just not built yet.
 */
interface ComingSoonPanelProps {
  title: string;
  description: string;
  bullets?: string[];
  icon?: LucideIcon;
  cta?: { label: string; href: string };
  fallback?: { label: string; href: string };
}

export function ComingSoonPanel({
  title,
  description,
  bullets,
  icon: Icon = Construction,
  cta,
  fallback = { label: "← Retour au tableau de bord", href: '/app' },
}: ComingSoonPanelProps) {
  return (
    <main className="flex-1 px-8 py-8">
      <div className="mx-auto flex max-w-[640px] flex-col gap-6 rounded-2xl border border-border-default bg-surface p-10 text-center sm:p-14">
        <div
          aria-hidden
          className="mx-auto flex size-[72px] items-center justify-center rounded-2xl border border-accent-border bg-accent-soft text-accent"
        >
          <Icon size={32} strokeWidth={1.6} />
        </div>

        <div>
          <h1 className="text-h3 font-display font-medium tracking-[-0.015em] text-fg">
            {title}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-fg-secondary">
            {description}
          </p>
        </div>

        {bullets && bullets.length > 0 && (
          <ul className="flex flex-col gap-2.5 rounded-md border border-border-default bg-surface-2 p-5 text-left text-sm leading-relaxed text-fg-secondary">
            {bullets.map((b) => (
              <li key={b} className="flex items-start gap-2.5">
                <span aria-hidden className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent" />
                {b}
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          {cta && (
            <Button asChild variant="primary">
              <Link href={cta.href}>{cta.label}</Link>
            </Button>
          )}
          <Button asChild variant="ghost">
            <Link href={fallback.href}>{fallback.label}</Link>
          </Button>
        </div>

        <p className="text-xs text-fg-muted">
          Cette page fait partie de la roadmap post-MVP. Le scope mémoire couvre
          le lancement d'audits (M1/M2/M3) et la consultation des résultats —
          l'historique enrichi, la gestion d'équipe et les paramètres avancés
          arrivent en Phase 2.
        </p>
      </div>
    </main>
  );
}
