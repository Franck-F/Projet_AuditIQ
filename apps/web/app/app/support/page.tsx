import { Zap, Book, Scale, LayoutDashboard, ShieldCheck, Settings2, MessageSquare } from 'lucide-react';
import { Topbar } from '@/components/app/Topbar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/ui/icons';

const TOPIC_CARDS = [
  {
    title: 'Bien démarrer',
    count: '22 articles',
    icon: Zap,
    links: [
      'Créer son premier audit en 5 minutes',
      'Préparer son dataset (M1)',
      'Choisir entre M1 et M2',
      'Inviter son équipe et attribuer les rôles',
    ],
  },
  {
    title: "Modules d'audit",
    count: '34 articles',
    icon: Book,
    links: [
      'Comprendre les 4 métriques fairness',
      'Module 2 : détecter un proxy',
      'Configurer une API LLM (M3)',
      'Interpréter le feu tricolore global',
    ],
  },
  {
    title: 'AI Act & conformité',
    count: '18 articles',
    icon: Scale,
    links: [
      "Calendrier d'application AI Act",
      'Article 10 : qualité des données',
      'Annexe IV : documentation technique',
      'Articulation avec le droit français',
    ],
  },
  {
    title: 'Rapports & exports',
    count: '12 articles',
    icon: LayoutDashboard,
    links: [
      'Vue executive vs vue réglementaire',
      'Signature électronique eIDAS',
      'Comparer 2 rapports',
      'Personnaliser le PDF',
    ],
  },
  {
    title: 'Sécurité & RGPD',
    count: '9 articles',
    icon: ShieldCheck,
    links: [
      'Où sont stockées mes données ?',
      'Chiffrement et certifications',
      "Demander l'export RGPD",
      'Activer la 2FA',
    ],
  },
  {
    title: 'Paramétrage avancé',
    count: '15 articles',
    icon: Settings2,
    links: [
      'Ajuster les seuils par défaut',
      'Audit récurrent automatique',
      'Configurer Slack ou Teams',
      'API & webhooks (MLOps)',
    ],
  },
];

const EXPERTS = [
  { initials: 'SL', name: 'Sophie Lévêque', role: 'Lead conformité · AI Act, RGPD' },
  { initials: 'YK', name: 'Yacine Kherbache', role: 'Expert fairness ML · M1 / M2' },
  { initials: 'FP', name: 'François Petit', role: 'Expert LLM / chatbots · M3' },
];

export default function SupportPage() {
  return (
    <>
      <Topbar
        title="Aide & support"
        crumbs={[
          { label: 'AuditIQ' },
          { label: 'Support' },
        ]}
      />

      <div className="space-y-8">
        {/* Search hero */}
        <div className="rounded-lg border border-border-default bg-surface p-9 text-center">
          <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.02em] text-fg">
            Comment pouvons-nous vous aider ?
          </h1>
          <p className="mt-3 text-[15px] text-fg-secondary">
            Documentation produit · réponses aux questions fréquentes · contact équipe experte AuditIQ
          </p>
          <div className="mx-auto mt-6 flex max-w-[600px] items-center gap-3 rounded-full border border-border-strong bg-surface-2 px-[18px] py-1.5">
            <Icons.search size={18} className="shrink-0 text-fg-muted" />
            <input
              type="search"
              placeholder="Tapez votre question · « Comment configurer un seuil ? »"
              className="flex-1 bg-transparent py-2 text-sm text-fg placeholder:text-fg-muted outline-none"
            />
            <Button variant="primary" size="sm">Rechercher</Button>
          </div>
        </div>

        {/* Topic cards — 3 columns */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TOPIC_CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.title}
                className="flex flex-col gap-3.5 rounded-lg border border-border-default bg-surface p-6 transition-colors hover:border-border-strong"
              >
                <span className="inline-flex size-10 items-center justify-center rounded-md border border-accent-border bg-accent-soft text-accent">
                  <Icon size={20} />
                </span>
                <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-fg-muted">
                  {card.count}
                </span>
                <h4 className="text-base font-medium text-fg">{card.title}</h4>
                <ul className="flex flex-col gap-1.5">
                  {card.links.map((link) => (
                    <li key={link}>
                      <a
                        href="#"
                        className="flex items-center gap-2 py-1 text-[13px] text-fg-secondary hover:text-fg before:content-['→'] before:text-fg-muted"
                      >
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {/* Two-column: ticket + expert */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Ticket form */}
          <Card>
            <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-fg-muted">
              Ouvrir un ticket support
            </p>
            <h3 className="mt-2 mb-2 text-[18px] font-medium text-fg">
              Vous n&apos;avez pas trouvé votre réponse ?
            </h3>
            <p className="mb-5 text-sm text-fg-secondary">
              Notre équipe vous répond en moins de 4h en jours ouvrés (plan Équipe).
            </p>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-fg-secondary">Sujet</label>
                <input
                  className="w-full rounded-md border border-border-default bg-surface px-3.5 py-2.5 text-sm text-fg placeholder:text-fg-muted focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
                  placeholder="Ex. : Le module M2 ne détecte pas mon attribut sensible"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="ticket-categorie" className="text-sm font-medium text-fg-secondary">Catégorie</label>
                <select id="ticket-categorie" className="w-full rounded-md border border-border-default bg-surface px-3.5 py-2.5 text-sm text-fg focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]">
                  <option>{"Question d'utilisation"}</option>
                  <option>Bug / problème technique</option>
                  <option>Question de conformité / AI Act</option>
                  <option>Facturation</option>
                  <option>Demande de fonctionnalité</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-fg-secondary">Description</label>
                <textarea
                  rows={4}
                  className="w-full rounded-md border border-border-default bg-surface px-3.5 py-2.5 text-sm text-fg placeholder:text-fg-muted focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] resize-none"
                  placeholder="Décrivez votre problème avec autant de détails que possible…"
                />
                <span className="text-xs text-fg-muted">
                  Vous pouvez joindre une capture d&apos;écran ou un export d&apos;audit.
                </span>
              </div>
              <Button variant="primary">Envoyer le ticket</Button>
            </div>
          </Card>

          {/* Expert contact */}
          <Card>
            <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-fg-muted">
              Contact expert AuditIQ
            </p>
            <h3 className="mt-2 mb-2 text-[18px] font-medium text-fg">
              Besoin d&apos;un accompagnement plus poussé ?
            </h3>
            <p className="mb-6 text-sm text-fg-secondary">
              Réservez un échange de 30 minutes avec un de nos experts conformité IA et fairness.
            </p>

            <div className="flex flex-col gap-4">
              {EXPERTS.map((expert) => (
                <div
                  key={expert.initials}
                  className="flex items-center gap-3.5 rounded-md border border-border-subtle bg-surface-2 px-4 py-4"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-soft font-mono text-sm font-medium text-accent">
                    {expert.initials}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-fg">{expert.name}</div>
                    <div className="text-xs text-fg-muted">{expert.role}</div>
                  </div>
                  <Button variant="secondary" size="sm">Réserver</Button>
                </div>
              ))}
            </div>

            <div className="mt-6 border-t border-border-subtle pt-5">
              <h4 className="mb-2 text-sm font-medium text-fg">
                Audit accompagné par un expert
              </h4>
              <p className="text-[13px] leading-relaxed text-fg-secondary">
                Pour les cas complexes (système IA à haut risque, contrôle CNIL prévu,
                contentieux), nos experts peuvent mener un audit avec vous. Sur devis · à partir de
                4 800 € HT.
              </p>
              <Button variant="primary" size="sm" className="mt-4">
                Demander un devis →
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
