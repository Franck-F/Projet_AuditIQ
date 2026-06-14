import { Zap, Book, Scale, LayoutDashboard, ShieldCheck, Settings2, Mail } from 'lucide-react';
import { Topbar } from '@/components/app/Topbar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const SUPPORT_EMAIL = 'support@auditiq.fr';

const TOPIC_CARDS = [
  {
    title: 'Bien démarrer',
    icon: Zap,
    links: [
      'Créer son premier audit en 5 minutes',
      'Préparer son jeu de données (Module 1)',
      'Choisir entre le Module 1 et le Module 2',
      'Inviter son équipe et attribuer les rôles',
    ],
  },
  {
    title: "Modules d'audit",
    icon: Book,
    links: [
      'Comprendre les métriques de fairness',
      'Module 2 : détecter un proxy',
      'Configurer une API LLM (Module 3)',
      'Interpréter le feu tricolore global',
    ],
  },
  {
    title: 'AI Act & réglementation',
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
    icon: LayoutDashboard,
    links: [
      'Synthèse dirigeants vs rapport détaillé',
      'Télécharger un rapport PDF ou Excel',
      'Comparer 2 rapports',
      'Personnaliser le PDF',
    ],
  },
  {
    title: 'Sécurité & RGPD',
    icon: ShieldCheck,
    links: [
      'Où sont stockées mes données ?',
      'Chiffrement des fichiers importés',
      "Demander l'export RGPD",
      'Activer la double authentification',
    ],
  },
  {
    title: 'Paramétrage avancé',
    icon: Settings2,
    links: [
      'Ajuster les seuils par défaut',
      'Audit récurrent automatique',
      'Configurer Slack ou Teams',
      'API & webhooks (MLOps)',
    ],
  },
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

      <div className="page space-y-8">
        {/* Hero */}
        <div className="rounded-lg border border-border-default bg-surface p-9 text-center">
          <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.02em] text-fg">
            Comment pouvons-nous vous aider ?
          </h1>
          <p className="mt-3 text-[15px] text-fg-secondary">
            La documentation en ligne arrive bientôt. En attendant, notre équipe vous répond
            par e-mail.
          </p>
          <div className="mt-6 flex justify-center">
            <Button variant="primary" asChild>
              <a href={`mailto:${SUPPORT_EMAIL}`} className="gap-2">
                <Mail size={16} aria-hidden />
                Écrire à {SUPPORT_EMAIL}
              </a>
            </Button>
          </div>
        </div>

        {/* Topic cards — 3 columns (sommaire de la future documentation) */}
        <div>
          <p className="mb-4 text-sm text-fg-secondary">
            Aperçu des thèmes qui seront couverts par la documentation :
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {TOPIC_CARDS.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.title}
                  className="flex flex-col gap-3.5 rounded-lg border border-border-default bg-surface p-6"
                >
                  <span className="inline-flex size-10 items-center justify-center rounded-md border border-accent-border bg-accent-soft text-accent">
                    <Icon size={20} />
                  </span>
                  <h4 className="text-base font-medium text-fg">{card.title}</h4>
                  <ul className="flex flex-col gap-1.5">
                    {card.links.map((link) => (
                      <li
                        key={link}
                        className="flex items-center gap-2 py-1 text-[13px] text-fg-secondary before:content-['·'] before:text-fg-muted"
                      >
                        {link}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>

        {/* Contact card */}
        <Card>
          <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-fg-muted">
            Contacter le support
          </p>
          <h3 className="mt-2 mb-2 text-[18px] font-medium text-fg">
            Vous n&apos;avez pas trouvé votre réponse ?
          </h3>
          <p className="mb-5 text-sm text-fg-secondary">
            Décrivez votre question ou votre problème par e-mail — joignez si possible une
            capture d&apos;écran ou la référence de l&apos;audit concerné (ex. AUD-2026-001).
          </p>
          <Button variant="secondary" asChild>
            <a href={`mailto:${SUPPORT_EMAIL}`} className="gap-2">
              <Mail size={15} aria-hidden />
              {SUPPORT_EMAIL}
            </a>
          </Button>
        </Card>
      </div>
    </>
  );
}
