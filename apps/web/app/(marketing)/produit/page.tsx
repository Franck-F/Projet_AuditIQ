import * as React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { Container } from '@/components/layout/Container';
import { Reveal } from '@/components/layout/Reveal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eyebrow } from '@/components/marketing/Eyebrow';
import { StatusPill } from '@/components/marketing/StatusPill';
import { AnchorNav } from '@/components/marketing/AnchorNav';

export const metadata: Metadata = {
  title: 'Produit',
  description:
    "Vue d'ensemble de la plateforme AuditIQ : 3 modules d'audit fairness, couche transversale conformité, gouvernance équipe.",
};

/* ============================================================================
   Page-local components
   ============================================================================ */

function CheckListItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="grid grid-cols-[24px_1fr] gap-3 text-sm leading-relaxed text-fg-secondary">
      <span
        aria-hidden
        className="mt-[5px] inline-block size-4 bg-no-repeat bg-contain"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='none' stroke='%2364c89a' stroke-width='1.75' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M3 8.5l3 3 7-7'/%3E%3C/svg%3E\")",
        }}
      />
      <span>{children}</span>
    </li>
  );
}

function MetricRow({
  label,
  value,
  tone,
  fillPercent,
  threshold,
  sub,
}: {
  label: string;
  value: string;
  tone: 'pass' | 'warn' | 'fail';
  fillPercent: number;
  threshold: number;
  sub: string;
}) {
  const fill: Record<typeof tone, string> = {
    pass: 'bg-accent',
    warn: 'bg-status-warn',
    fail: 'bg-status-fail',
  };
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border-default bg-surface p-6">
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs uppercase tracking-[0.12em] text-fg-muted">{label}</span>
        <StatusPill tone={tone}>{value}</StatusPill>
      </div>
      <div className="relative h-1.5 overflow-hidden rounded-full bg-surface-3">
        <div className={`h-full rounded-full ${fill[tone]}`} style={{ width: `${fillPercent}%` }} />
        <span
          className="absolute -top-1 -bottom-1 w-0.5 bg-fg-secondary/60"
          style={{ left: `${threshold}%` }}
          aria-hidden
        />
      </div>
      <span className="text-xs text-fg-muted">{sub}</span>
    </div>
  );
}

function BarRow({
  label,
  value,
  percent,
  tone = 'pass',
}: {
  label: string;
  value: string;
  percent: number;
  tone?: 'pass' | 'warn' | 'fail';
}) {
  const fill: Record<typeof tone, string> = {
    pass: 'bg-accent',
    warn: 'bg-status-warn',
    fail: 'bg-status-fail',
  };
  return (
    <div className="grid grid-cols-[140px_1fr_80px] items-center gap-3 py-2.5">
      <span className="text-sm text-fg-secondary">{label}</span>
      <div className="h-2.5 overflow-hidden rounded-full bg-surface-3">
        <div className={`h-full rounded-full ${fill[tone]}`} style={{ width: `${percent}%` }} />
      </div>
      <span className="text-right font-mono text-sm tabular-nums text-fg">{value}</span>
    </div>
  );
}

function MockCard({
  title,
  sub,
  pill,
  children,
}: {
  title: string;
  sub: string;
  pill: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border-default bg-surface p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-fg">{title}</div>
          <div className="font-mono text-xs text-fg-muted">{sub}</div>
        </div>
        {pill}
      </div>
      {children}
    </div>
  );
}

function ClusterViz() {
  return (
    <div className="relative h-56 overflow-hidden rounded-md border border-border-subtle bg-surface-2">
      <div className="absolute left-0 right-0 top-1/2 h-px bg-border-subtle opacity-50" />
      <div className="absolute bottom-0 top-0 left-1/2 w-px bg-border-subtle opacity-50" />
      <span
        className="absolute flex size-20 items-center justify-center rounded-full border border-dashed border-accent-border bg-accent-soft font-mono text-xs text-accent"
        style={{ left: '18%', top: '25%' }}
      >
        C1
      </span>
      <span
        className="absolute flex size-[88px] items-center justify-center rounded-full border border-dashed border-status-info-border bg-status-info-bg font-mono text-xs text-status-info"
        style={{ left: '44%', top: '12%' }}
      >
        C2
      </span>
      <span
        className="absolute flex size-[60px] items-center justify-center rounded-full border border-dashed border-status-warn-border bg-status-warn-bg font-mono text-xs text-status-warn"
        style={{ left: '30%', top: '56%' }}
      >
        C3
      </span>
      <span
        className="absolute flex size-[70px] items-center justify-center rounded-full border-2 border-status-fail bg-status-fail-bg font-mono text-[13px] font-medium text-status-fail"
        style={{ left: '65%', top: '45%' }}
      >
        C4 ⚠
      </span>
    </div>
  );
}

function AxisScoreCard({
  axis,
  score,
  label,
  tone,
}: {
  axis: string;
  score: string;
  label: string;
  tone: 'pass' | 'warn' | 'fail';
}) {
  const labelColor: Record<typeof tone, string> = {
    pass: 'text-status-pass',
    warn: 'text-status-warn',
    fail: 'text-status-fail',
  };
  return (
    <div className="rounded-lg border border-border-default bg-surface-2 p-4">
      <Eyebrow>{axis}</Eyebrow>
      <div className="mt-1 font-mono text-[22px] leading-none tabular-nums">
        {score}
        <span className="text-xs text-fg-muted"> / 5</span>
      </div>
      <div className={`mt-1.5 text-xs ${labelColor[tone]}`}>{label}</div>
    </div>
  );
}

const TRANSVERSE_CARDS = [
  {
    n: '01',
    title: 'Recommandations assistées',
    body: "Pour chaque écart détecté, AuditIQ propose des actions hiérarchisées : revoir un seuil, ré-équilibrer un jeu d'entraînement, ouvrir un ticket interne, déclencher un test complémentaire. Les recommandations sont catégorisées par effort estimé et impact attendu.",
  },
  {
    n: '02',
    title: 'Explication en langage naturel',
    body: 'Chaque métrique est traduite en deux ou trois phrases lisibles. Pas de jargon statistique. Vos parties prenantes non techniques comprennent la situation en une lecture — vos data scientists peuvent dérouler les détails techniques en un clic.',
  },
  {
    n: '03',
    title: 'Ancrage réglementaire',
    body: 'Chaque écart est rattaché aux articles applicables : AI Act (articles 10, 13, 15, annexe IV), RGPD, Code du travail (L.1132-1), Code pénal (article 225-1). Vous savez précisément quel texte est touché et quelle réponse attendue.',
  },
  {
    n: '04',
    title: 'Rapport exportable PDF / Excel',
    body: "Deux vues : une synthèse dirigeants pour le CODIR et une vue réglementaire complète structurée selon l'annexe IV. Format Excel prêt à intégrer dans votre registre des systèmes d'IA.",
  },
  {
    n: '05',
    title: 'Historique des audits',
    body: "Vos rapports et résultats restent disponibles dans votre espace. Les jeux de données sources sont automatiquement supprimés 30 jours après l'import — vous gardez la trace, pas les données brutes.",
  },
  {
    n: '06',
    title: 'Compte & gouvernance',
    body: "Un compte propriétaire unique aujourd'hui, avec cloisonnement strict par organisation. Rôles multiples (administrateur, auditeur, lecteur), invitations et SSO sont en feuille de route.",
  },
];

const ANCHORS = [
  { href: '#supervise', label: 'Audit supervisé' },
  { href: '#non-supervise', label: 'Détection non supervisée' },
  { href: '#llm', label: 'Audit LLM' },
  { href: '#dashboard', label: 'Dashboard' },
  { href: '#couche', label: 'Couche transversale' },
  { href: '#securite', label: 'Sécurité & gouvernance' },
];

/* ============================================================================
   Page
   ============================================================================ */

export default function ProduitPage() {
  return (
    <>
      {/* PAGE HERO */}
      <header className="border-b border-border-subtle pt-[clamp(64px,8vw,96px)] pb-12">
        <Container>
          <Reveal>
            <Eyebrow accent>Produit</Eyebrow>
            <h1 className="mt-4 max-w-[18ch] font-display text-[clamp(36px,4vw,48px)] font-semibold leading-[1.1] tracking-[-0.02em] text-fg">
              Trois modules d&apos;audit, une chaîne de conformité complète.
            </h1>
            <p className="mt-5 max-w-[60ch] text-[clamp(18px,1.3vw,20px)] leading-relaxed text-fg-secondary">
              AuditIQ couvre les trois grandes familles d&apos;IA déployées en PME : modèles
              supervisés, datasets sans cible explicite, et assistants conversationnels LLM.
              Chaque audit se conclut par une trace exploitable, alignée sur l&apos;AI Act et
              exportable.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild variant="primary">
                <Link href="/contact">Demander une démo</Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href="/comment-ca-marche">Voir le parcours produit</Link>
              </Button>
            </div>
          </Reveal>
        </Container>
      </header>

      <AnchorNav items={ANCHORS} />

      {/* MODULE 1 — SUPERVISE */}
      <Container>
        <section
          id="supervise"
          className="grid grid-cols-1 gap-10 py-20 lg:grid-cols-2 lg:gap-16 scroll-mt-32"
        >
          <Reveal>
            <Eyebrow accent>Module 01 · Audit supervisé</Eyebrow>
            <h2 className="mt-3 mb-4 text-h2 font-display font-medium tracking-[-0.015em] text-fg">
              Mesurez l&apos;écart entre groupes sur vos modèles de scoring.
            </h2>
            <p className="mb-6 text-h4 leading-relaxed text-fg-secondary">
              Adapté aux classifications binaires ou multi-classes (acceptation crédit,
              présélection CV, scoring risque). AuditIQ calcule les métriques fairness reconnues
              par la littérature académique et la régulation.
            </p>
            <ul className="flex flex-col gap-3.5">
              <CheckListItem>
                Quatre métriques canoniques : égalité de traitement (Demographic Parity), égalité
                des chances (Equal Opportunity), égalité des taux d&apos;erreur (Equalized Odds),
                règle des quatre cinquièmes.
              </CheckListItem>
              <CheckListItem>
                Décomposition par groupe et sous-groupe — intersectionalité (genre × tranche
                d&apos;âge, par exemple).
              </CheckListItem>
              <CheckListItem>
                Seuils ajustables par votre responsable conformité, ou recommandation par défaut
                selon le secteur.
              </CheckListItem>
              <CheckListItem>
                Mapping automatique des colonnes sensibles avec suggestions, validation manuelle
                obligatoire.
              </CheckListItem>
              <CheckListItem>
                Explication en langage naturel — chaque écart est commenté en deux à trois phrases
                compréhensibles.
              </CheckListItem>
            </ul>
            <div className="mt-8 flex gap-3">
              <Button asChild variant="secondary">
                <Link href="/modules#supervise">Détail technique</Link>
              </Button>
              <Button asChild variant="ghost">
                <Link href="/cas-usage#rh">Cas d&apos;usage RH →</Link>
              </Button>
            </div>
          </Reveal>

          <Reveal delay={0.08}>
            <MockCard
              title="Recrutement_2024.csv · Module 1"
              sub="412 lignes · attribut : genre · décision : short_listed"
              pill={<StatusPill tone="warn">Vigilance</StatusPill>}
            >
              <MetricRow
                label="Demographic Parity"
                value="0.78"
                tone="warn"
                fillPercent={78}
                threshold={80}
                sub="L'écart de présélection entre les groupes Hommes et Femmes est de 12 %."
              />
              <MetricRow
                label="Equal Opportunity"
                value="0.92"
                tone="pass"
                fillPercent={92}
                threshold={80}
                sub="Pour un profil qualifié, la probabilité de présélection est équivalente."
              />
              <div>
                <BarRow label="Groupe : Femmes" value="32 %" percent={32} tone="warn" />
                <BarRow label="Groupe : Hommes" value="44 %" percent={44} tone="pass" />
              </div>
            </MockCard>
          </Reveal>
        </section>
      </Container>

      {/* MODULE 2 — NON-SUPERVISE */}
      <Container>
        <section
          id="non-supervise"
          className="grid grid-cols-1 gap-10 border-t border-border-subtle py-20 lg:grid-cols-2 lg:gap-16 scroll-mt-32"
        >
          <Reveal className="order-1 lg:order-2">
            <Eyebrow accent>Module 02 · Détection non supervisée</Eyebrow>
            <h2 className="mt-3 mb-4 text-h2 font-display font-medium tracking-[-0.015em] text-fg">
              Repérez les biais dans vos données — même sans variable de décision.
            </h2>
            <p className="mb-6 text-h4 leading-relaxed text-fg-secondary">
              Pour les jeux de données où il n&apos;y a pas (encore) de modèle entraîné, ou pour
              préparer l&apos;entraînement. AuditIQ identifie les regroupements naturels et
              signale les déviations.
            </p>
            <ul className="flex flex-col gap-3.5">
              <CheckListItem>
                Clustering k-means — choix du nombre de clusters guidé.
              </CheckListItem>
              <CheckListItem>
                Détection de clusters déviants par test du χ² sur leur composition.
              </CheckListItem>
              <CheckListItem>
                Identification des variables dominantes par cluster — qu&apos;est-ce qui caractérise
                chaque groupe.
              </CheckListItem>
              <CheckListItem>
                Signal de proxy possible quand un groupe protégé est sur-représenté dans un
                cluster (code postal ↔ origine présumée, etc.).
              </CheckListItem>
              <CheckListItem>
                Restitution pédagogique avec niveau de risque qualifié et explication des raisons.
              </CheckListItem>
            </ul>
            <div className="mt-8 flex gap-3">
              <Button asChild variant="secondary">
                <Link href="/modules#non-supervise">Détail technique</Link>
              </Button>
              <Button asChild variant="ghost">
                <Link href="/cas-usage#credit">Cas d&apos;usage crédit →</Link>
              </Button>
            </div>
          </Reveal>

          <Reveal delay={0.08} className="order-2 lg:order-1">
            <MockCard
              title="Demandes_credit_Q3.csv · Module 2"
              sub="2 840 lignes · 12 variables · 4 clusters détectés"
              pill={<StatusPill tone="fail">Critique</StatusPill>}
            >
              <ClusterViz />
              <div className="rounded-lg border border-border-default bg-surface-2 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Eyebrow>Cluster C4 — déviant</Eyebrow>
                    <h4 className="mt-1 text-[15px] font-medium text-fg">
                      Profil sur-représenté en refus
                    </h4>
                  </div>
                  <StatusPill tone="fail">Proxy détecté</StatusPill>
                </div>
                <p className="mt-2.5 text-sm leading-relaxed text-fg-secondary">
                  Le code postal apparaît comme variable dominante du cluster. Signal possible de
                  proxy géographique pour l&apos;origine présumée.
                </p>
              </div>
            </MockCard>
          </Reveal>
        </section>
      </Container>

      {/* MODULE 3 — LLM */}
      <Container>
        <section
          id="llm"
          className="grid grid-cols-1 gap-10 border-t border-border-subtle py-20 lg:grid-cols-2 lg:gap-16 scroll-mt-32"
        >
          <Reveal>
            <Eyebrow accent>Module 03 · Audit LLM &amp; chatbot</Eyebrow>
            <h2 className="mt-3 mb-4 text-h2 font-display font-medium tracking-[-0.015em] text-fg">
              Testez vos assistants conversationnels sur six axes de discrimination.
            </h2>
            <p className="mb-6 text-h4 leading-relaxed text-fg-secondary">
              AuditIQ compare les réponses de votre assistant à des paires de prompts
              contrefactuels — deux requêtes identiques, un seul attribut varie — pour mesurer les
              écarts de traitement.
            </p>
            <ul className="flex flex-col gap-3.5">
              <CheckListItem>
                Six axes : genre, origine présumée, âge, religion, handicap, orientation.
              </CheckListItem>
              <CheckListItem>
                Une banque versionnée de paires de prompts, en français et en anglais.
              </CheckListItem>
              <CheckListItem>
                Métriques par axe : écart de longueur, polarité (analyse par lexique bilingue,
                déterministe et documentée), taux de refus.
              </CheckListItem>
              <CheckListItem>
                Score global et score par axe, avec extraits significatifs annotés.
              </CheckListItem>
              <CheckListItem>
                Personnalisation de la banque avec vos prompts métiers : en feuille de route.
              </CheckListItem>
            </ul>
            <div className="mt-8 flex gap-3">
              <Button asChild variant="secondary">
                <Link href="/modules#llm">Détail technique</Link>
              </Button>
              <Button asChild variant="ghost">
                <Link href="/cas-usage#chatbot">Cas d&apos;usage chatbot →</Link>
              </Button>
            </div>
          </Reveal>

          <Reveal delay={0.08}>
            <MockCard
              title="Chatbot SAV · Module 3"
              sub="Banque de prompts FR/EN · 6 axes"
              pill={<StatusPill tone="warn">Vigilance</StatusPill>}
            >
              <div className="grid grid-cols-2 gap-3">
                <AxisScoreCard axis="Genre" score="4,1" label="Faibles écarts" tone="pass" />
                <AxisScoreCard axis="Origine" score="2,8" label="Écarts modérés" tone="warn" />
                <AxisScoreCard axis="Âge" score="3,5" label="Acceptable" tone="warn" />
                <AxisScoreCard
                  axis="Handicap"
                  score="2,1"
                  label="Écarts significatifs"
                  tone="fail"
                />
              </div>
              <div className="rounded-lg border border-border-default bg-surface-2 p-4">
                <Eyebrow>Extrait significatif</Eyebrow>
                <div className="mt-2.5 grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="rounded-md border-l-2 border-status-pass bg-surface p-2.5 text-xs">
                    <strong className="font-medium text-fg-muted">Profil A · 142 mots</strong>
                    <br />
                    <span className="text-fg-secondary">
                      « Bien sûr, je peux vous aider à finaliser votre dossier. Voici les étapes… »
                    </span>
                  </div>
                  <div className="rounded-md border-l-2 border-status-fail bg-surface p-2.5 text-xs">
                    <strong className="font-medium text-fg-muted">Profil B · 38 mots</strong>
                    <br />
                    <span className="text-fg-secondary">
                      « Je vous invite à contacter notre service spécialisé. »
                    </span>
                  </div>
                </div>
              </div>
            </MockCard>
          </Reveal>
        </section>
      </Container>

      {/* DASHBOARD PREVIEW */}
      <section
        id="dashboard"
        className="border-t border-border-subtle bg-surface py-24 scroll-mt-32"
      >
        <Container>
          <Reveal className="mb-12 max-w-[760px]">
            <Eyebrow accent>Dashboard &amp; produit</Eyebrow>
            <h2 className="mt-3 text-h2 font-display font-medium tracking-tight text-fg">
              Un tableau de bord pensé pour vos parties prenantes.
            </h2>
            <p className="mt-4 text-h4 leading-relaxed text-fg-secondary">
              Le responsable conformité voit le score de risque. La DRH voit les audits récents.
              Le dirigeant voit les alertes critiques. Une seule plateforme, plusieurs lectures.
            </p>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="overflow-hidden rounded-2xl border border-border-default bg-bg">
              <div className="flex items-center gap-2.5 border-b border-border-subtle bg-surface px-5 py-3">
                <span className="size-2 rounded-full bg-border-prominent" />
                <span className="size-2 rounded-full bg-border-prominent" />
                <span className="size-2 rounded-full bg-border-prominent" />
                <span className="ml-3 font-mono text-xs text-fg-muted">
                  app.auditiq.fr/dashboard
                </span>
              </div>
              <div className="grid min-h-[360px] grid-cols-1 md:grid-cols-[200px_1fr]">
                <aside className="flex flex-col gap-1 border-r border-border-subtle bg-surface p-3">
                  {[
                    ['Dashboard', true],
                    ['Audits', false],
                    ['Rapports', false],
                    ['Recommandations', false],
                    ['Historique', false],
                    ['Équipe', false],
                    ['Paramètres', false],
                  ].map(([label, active]) => (
                    <div
                      key={String(label)}
                      className={`relative flex items-center gap-2 rounded-md px-2.5 py-2 text-sm ${
                        active ? 'bg-surface-2 text-fg' : 'text-fg-secondary'
                      }`}
                    >
                      {active && (
                        <span className="absolute left-[-12px] top-2 bottom-2 w-[3px] rounded bg-accent" />
                      )}
                      <span className="size-3.5 rounded-[3px] bg-surface-3" />
                      {label}
                    </div>
                  ))}
                </aside>
                <main className="flex flex-col gap-5 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-mono text-xs uppercase tracking-[0.08em] text-fg-muted">
                        CABINET TESSIER &amp; ASSOCIÉS
                      </div>
                      <div className="text-h4 font-semibold text-fg">Bonjour Claire</div>
                    </div>
                    <Button variant="primary" size="sm">
                      + Lancer un audit
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="rounded-md border border-border-default bg-surface p-3.5">
                      <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-muted">
                        Score de risque global
                      </div>
                      <div className="mt-1 font-mono text-[22px] font-medium tabular-nums text-status-warn">
                        3.2 / 5
                      </div>
                      <div className="mt-1 text-xs text-fg-muted">
                        Vigilance — 2 alertes ouvertes
                      </div>
                    </div>
                    <div className="rounded-md border border-border-default bg-surface p-3.5">
                      <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-muted">
                        Audits ce trimestre
                      </div>
                      <div className="mt-1 font-mono text-[22px] font-medium tabular-nums">8</div>
                      <div className="mt-1 text-xs text-fg-muted">+3 vs Q3</div>
                    </div>
                    <div className="rounded-md border border-border-default bg-surface p-3.5">
                      <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-muted">
                        Couverture AI Act
                      </div>
                      <div className="mt-1 font-mono text-[22px] font-medium tabular-nums">
                        76 %
                      </div>
                      <div className="mt-1 text-xs text-fg-muted">Annexe IV documentée</div>
                    </div>
                  </div>

                  <div className="rounded-md border border-border-default bg-surface-2 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <div className="text-sm font-medium text-fg">Audits récents</div>
                      <span className="text-xs text-accent" aria-hidden>
                        Voir tous →
                      </span>
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between rounded-md bg-surface px-2.5 py-2">
                        <span className="text-sm">Recrutement_2024.csv</span>
                        <StatusPill tone="warn">Vigilance</StatusPill>
                      </div>
                      <div className="flex items-center justify-between rounded-md bg-surface px-2.5 py-2">
                        <span className="text-sm">Chatbot SAV — Mistral-7B</span>
                        <StatusPill tone="warn">Vigilance</StatusPill>
                      </div>
                      <div className="flex items-center justify-between rounded-md bg-surface px-2.5 py-2">
                        <span className="text-sm">Scoring_credit_v3.csv</span>
                        <StatusPill tone="pass">Conforme</StatusPill>
                      </div>
                    </div>
                  </div>
                </main>
              </div>
            </div>
            <p className="mt-4 text-center text-xs text-fg-muted">
              Aperçu illustratif — organisation et chiffres fictifs.
            </p>
          </Reveal>
        </Container>
      </section>

      {/* COUCHE TRANSVERSALE */}
      <section id="couche" className="py-24 scroll-mt-32">
        <Container>
          <Reveal className="mb-12 max-w-[760px]">
            <Eyebrow accent>Couche transversale</Eyebrow>
            <h2 className="mt-3 text-h2 font-display font-medium tracking-tight text-fg">
              Au-delà de la mesure : une chaîne complète conforme.
            </h2>
            <p className="mt-4 text-h4 leading-relaxed text-fg-secondary">
              Détecter n&apos;est qu&apos;une étape. AuditIQ vous accompagne sur la documentation,
              la priorisation des actions, la conservation et le partage.
            </p>
          </Reveal>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {TRANSVERSE_CARDS.map((card, i) => (
              <Reveal key={card.n} delay={i * 0.04}>
                <div className="rounded-xl border border-border-default bg-surface p-7 h-full">
                  <div className="mb-4 inline-flex size-8 items-center justify-center rounded-lg border border-accent-border bg-accent-soft font-mono text-sm font-medium text-accent">
                    {card.n}
                  </div>
                  <h4 className="mb-2 text-h4 font-medium text-fg">{card.title}</h4>
                  <p className="text-sm leading-relaxed text-fg-secondary">{card.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      {/* SECURITE */}
      <section id="securite" className="border-t border-border-subtle bg-surface py-20 scroll-mt-32">
        <Container>
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16">
            <Reveal>
              <Eyebrow accent>Sécurité &amp; gouvernance</Eyebrow>
              <h2 className="mt-3 mb-4 text-h2 font-display font-medium tracking-[-0.015em] text-fg">
                Vos données ne sortent pas d&apos;Europe.
              </h2>
              <p className="text-base leading-relaxed text-fg-secondary">
                Hébergement en Union européenne (Francfort · Paris), chiffrement en transit et au
                repos. Les jeux de données importés sont automatiquement supprimés 30 jours après
                l&apos;import. Conçu pour le RGPD ; démarche ISO 27001 en cours. Interprétation en
                langage clair via Gemini, avec option souveraine Mistral.
              </p>
            </Reveal>
            <Reveal delay={0.08}>
              <div className="rounded-2xl border border-border-default bg-surface-2 p-6">
                <div className="flex flex-col gap-3.5">
                  {[
                    { label: 'Hébergement', value: <Badge variant="mono">UE · Francfort / Paris</Badge> },
                    { label: 'Chiffrement', value: <Badge variant="mono">En transit & au repos</Badge> },
                    { label: 'Rétention des datasets', value: <Badge variant="mono">30 jours</Badge> },
                    {
                      label: 'ISO 27001',
                      value: <StatusPill tone="info">Démarche en cours</StatusPill>,
                    },
                    { label: 'SSO & MFA', value: <Badge>Feuille de route</Badge> },
                  ].map((row, i) => (
                    <React.Fragment key={row.label}>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">{row.label}</span>
                        {row.value}
                      </div>
                      {i < 4 && <hr className="border-0 h-px bg-border-default" />}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
        </Container>
      </section>

      {/* CTA */}
      <section className="py-16">
        <Container>
          <Reveal>
            <div className="grid grid-cols-1 items-center gap-8 rounded-2xl border border-border-default bg-surface p-[clamp(40px,6vw,64px)] lg:grid-cols-[1fr_auto]">
              <div>
                <Eyebrow accent>Prochaine étape</Eyebrow>
                <h2 className="mt-3 text-h2 font-display font-medium tracking-tight text-fg">
                  Voyez AuditIQ tourner sur votre propre cas d&apos;usage.
                </h2>
                <p className="mt-3 max-w-[56ch] text-fg-secondary">
                  30 minutes de démo guidée. On apporte les scénarios — vous apportez vos questions
                  de conformité.
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <Button asChild variant="primary" size="lg">
                  <Link href="/contact">Réserver une démo</Link>
                </Button>
                <Button asChild variant="secondary">
                  <Link href="/tarifs">Comparer les paliers</Link>
                </Button>
              </div>
            </div>
          </Reveal>
        </Container>
      </section>
    </>
  );
}
