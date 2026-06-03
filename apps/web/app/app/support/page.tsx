import { Zap, Book, Scale, MessageSquare } from 'lucide-react';
import { Topbar } from '@/components/app/Topbar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/ui/icons';

const QUICK_LINKS = [
  {
    title: 'Démarrage rapide',
    description: 'Lancez votre premier audit en 7 minutes',
    icon: Zap,
  },
  {
    title: 'Guide méthodologique',
    description: 'Comprendre les métriques de fairness',
    icon: Book,
  },
  {
    title: 'Cadre réglementaire',
    description: 'AI Act, RGPD, et obligations légales',
    icon: Scale,
  },
];

export default function SupportPage() {
  return (
    <>
      <Topbar
        crumbs={[
          { label: 'AuditIQ' },
          { label: 'Support' },
        ]}
      />

      <div className="mx-auto max-w-[760px] space-y-10">
        <div className="space-y-5 text-center py-4">
          <div>
            <h1 className="text-2xl font-medium tracking-[-0.03em] text-fg">
              Comment pouvons-nous vous aider ?
            </h1>
            <p className="mt-2 text-[14.5px] text-fg-muted">
              Documentation, guides méthodologiques et accompagnement par nos experts fairness.
            </p>
          </div>

          <div className="flex justify-center">
            <div className="relative w-full max-w-sm">
              <div className="searchbox flex items-center gap-2 rounded-lg border border-border-default bg-surface px-4 py-2.5 focus-within:border-border-strong focus-within:ring-1 focus-within:ring-[var(--focus-ring)]">
                <Icons.search size={15} className="text-fg-muted" />
                <input
                  type="search"
                  placeholder="Rechercher dans l'aide…"
                  className="flex-1 bg-transparent text-sm text-fg placeholder:text-fg-muted outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {QUICK_LINKS.map((link) => {
            const Icon = link.icon;
            return (
              <Card
                key={link.title}
                className="cursor-pointer transition-all hover:border-border-strong hover:bg-surface-2"
              >
                <div className="flex flex-col gap-3">
                  <div className="inline-flex size-9 items-center justify-center rounded-md bg-accent-soft border border-accent-border">
                    <Icon size={18} className="text-accent" />
                  </div>
                  <h3 className="text-sm font-medium text-fg">{link.title}</h3>
                  <p className="text-xs leading-relaxed text-fg-muted">{link.description}</p>
                </div>
              </Card>
            );
          })}
        </div>

        <Card className="flex items-center gap-4">
          <div className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg bg-surface-2 border border-border-default">
            <MessageSquare size={20} className="text-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-fg">
              Besoin d'un accompagnement personnalisé ?
            </h3>
            <p className="mt-0.5 text-xs text-fg-muted">
              Nos experts conformité répondent sous 4 h ouvrées.
            </p>
          </div>
          <Button variant="primary" size="sm">
            <MessageSquare size={14} />
            Contacter le support
          </Button>
        </Card>
      </div>
    </>
  );
}
