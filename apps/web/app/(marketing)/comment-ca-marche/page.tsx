import Link from 'next/link';
import type { Metadata } from 'next';
import { Container } from '@/components/layout/Container';
import { Reveal } from '@/components/layout/Reveal';
import { Button } from '@/components/ui/button';
import { Eyebrow } from '@/components/marketing/Eyebrow';
import { FinalCta } from '@/components/marketing/FinalCta';
import { StatusPill } from '@/components/marketing/StatusPill';

export const metadata: Metadata = {
  title: 'Comment ça marche',
  description:
    'Le parcours AuditIQ en 4 étapes : importer, configurer, analyser, exporter. Premier audit en moins de 10 minutes, aucune ligne de code.',
};

/* ============================================================================
   Page-local components
   ============================================================================ */

function CheckListItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="grid grid-cols-[18px_1fr] gap-2.5 text-sm leading-relaxed text-fg-secondary">
      <span
        aria-hidden
        className="mt-1 inline-block size-3.5 bg-no-repeat bg-contain"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='none' stroke='%2364c89a' stroke-width='1.75' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M3 8.5l3 3 7-7'/%3E%3C/svg%3E\")",
        }}
      />
      <span>{children}</span>
    </li>
  );
}

function Stage({
  num,
  time,
  title,
  lede,
  items,
  mock,
}: {
  num: string;
  time: string;
  title: string;
  lede: string;
  items: string[];
  mock: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 gap-10 border-t border-border-subtle py-12 first:border-t-0 lg:grid-cols-[80px_1fr_1fr] lg:gap-12">
      <span className="font-mono text-[64px] font-medium leading-none tracking-[-0.02em] text-accent">
        {num}
      </span>
      <div>
        <span className="mb-2 inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.08em] text-fg-muted">
          ⏱ {time}
        </span>
        <h2 className="mb-3 text-h2 font-display font-medium tracking-[-0.015em] text-fg">
          {title}
        </h2>
        <p className="mb-5 text-h4 leading-relaxed text-fg-secondary">{lede}</p>
        <ul className="flex flex-col gap-2.5">
          {items.map((i) => (
            <CheckListItem key={i}>{i}</CheckListItem>
          ))}
        </ul>
      </div>
      <div className="rounded-xl border border-border-default bg-surface p-5">{mock}</div>
    </div>
  );
}

function FieldMock({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="font-mono text-xs uppercase tracking-[0.08em] text-fg-muted">{label}</span>
      <div className="flex items-center justify-between rounded-md border border-border-default bg-surface-2 px-3.5 py-2.5 text-sm">
        <strong className="font-normal text-fg">{value}</strong>
        <span className="text-fg-muted">▾</span>
      </div>
    </div>
  );
}

function MetricBar({
  label,
  value,
  tone,
  fillPercent,
}: {
  label: string;
  value: string;
  tone: 'pass' | 'warn' | 'fail';
  fillPercent: number;
}) {
  const fill: Record<typeof tone, string> = {
    pass: 'bg-accent',
    warn: 'bg-status-warn',
    fail: 'bg-status-fail',
  };
  return (
    <div className="flex flex-col gap-2 rounded-md border border-border-default bg-surface p-3.5">
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs uppercase tracking-[0.12em] text-fg-muted">{label}</span>
        <StatusPill tone={tone}>{value}</StatusPill>
      </div>
      <div className="relative h-1.5 overflow-hidden rounded-full bg-surface-3">
        <div className={`h-full rounded-full ${fill[tone]}`} style={{ width: `${fillPercent}%` }} />
        <span
          className="absolute -top-1 -bottom-1 w-0.5 bg-fg-secondary/60"
          style={{ left: '80%' }}
          aria-hidden
        />
      </div>
    </div>
  );
}

function FileRow({
  ext,
  tone,
  name,
  sub,
}: {
  ext: string;
  tone: 'pass' | 'fail' | 'neutral';
  name: string;
  sub: string;
}) {
  const cls: Record<typeof tone, string> = {
    pass: 'border-status-pass-border bg-status-pass-bg text-status-pass',
    fail: 'border-status-fail-border bg-status-fail-bg text-status-fail',
    neutral: 'border-border-default bg-surface text-fg-muted',
  };
  return (
    <div className="rounded-lg border border-border-default bg-surface-2 p-4">
      <div className="flex items-center gap-3">
        <div
          className={`flex h-10 w-8 items-center justify-center rounded border font-mono text-[10px] ${cls[tone]}`}
        >
          {ext}
        </div>
        <div className="flex-1">
          <div className="text-sm font-medium text-fg">{name}</div>
          <div className="text-[11px] text-fg-muted">{sub}</div>
        </div>
        <Button variant="ghost" size="sm" aria-label="Télécharger">
          ↓
        </Button>
      </div>
    </div>
  );
}

const FAQ_ITEMS = [
  {
    q: 'Combien de temps faut-il pour démarrer ?',
    a: "Quelques minutes : créez un compte, importez un fichier CSV et lancez votre premier audit. Sur les paliers payants, un accompagnement à la prise en main est inclus.",
  },
  {
    q: 'Faut-il une équipe data interne ?',
    a: "Non. AuditIQ est conçu pour des responsables RH, conformité ou innovation sans bagage statistique. Une équipe data est utile pour les audits techniques avancés mais n'est pas un prérequis.",
  },
  {
    q: "Qu'est-ce qui distingue AuditIQ d'un outil open source comme Fairlearn ?",
    a: 'Fairlearn est une bibliothèque Python utilisée par des data scientists. AuditIQ est un produit SaaS : pas de code, interface en français, ancrage AI Act, rapports documentés et traçables, explications en langage clair. Voir la page comparatif pour le détail.',
  },
  {
    q: "Que se passe-t-il si un audit révèle un biais important ?",
    a: "AuditIQ documente l'écart, propose des recommandations d'actions, et rattache la situation aux articles applicables. La décision de remédiation reste votre prérogative. AuditIQ n'effectue pas de correction automatique du modèle.",
  },
  {
    q: "Mes données sortent-elles d'Europe ?",
    a: "Le traitement et le stockage sont réalisés en Union européenne (Francfort · Paris). L'interprétation en langage clair s'appuie sur le modèle Gemini par défaut, avec une option souveraine Mistral.",
  },
  {
    q: "Puis-je tester AuditIQ avant de m'engager ?",
    a: 'Oui. Le palier Découverte est gratuit et permanent : un audit Module 1 · Caractéristique connue par mois. Aucune carte bancaire requise.',
  },
];

/* ============================================================================
   Page
   ============================================================================ */

export default function CommentCaMarchePage() {
  return (
    <>
      <header className="border-b border-border-subtle pt-[clamp(64px,8vw,96px)] pb-12">
        <Container>
          <Reveal>
            <Eyebrow accent>Comment ça marche</Eyebrow>
            <h1 className="mt-4 max-w-[22ch] font-display text-[clamp(36px,4vw,48px)] font-semibold leading-[1.1] tracking-[-0.02em] text-fg">
              Un parcours pensé pour des responsables, pas pour des data scientists.
            </h1>
            <p className="mt-5 max-w-[60ch] text-[clamp(18px,1.3vw,20px)] leading-relaxed text-fg-secondary">
              Quatre étapes. Trois profils : conformité, RH, dirigeant. Moins de 10 minutes entre
              la première connexion et le premier rapport d&apos;audit téléchargé. Voici exactement
              ce qui se passe.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild variant="primary">
                <Link href="/contact">Demander une démo</Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href="/produit">Voir le produit</Link>
              </Button>
            </div>
          </Reveal>
        </Container>
      </header>

      <section className="py-16">
        <Container>
          <Stage
            num="01"
            time="2 minutes"
            title="Importez vos données."
            lede="Un fichier CSV exporté depuis votre outil suffit. Aucune installation locale, aucun connecteur à configurer."
            items={[
              "Format supporté aujourd'hui : CSV (UTF-8). D'autres formats et des connecteurs sont en feuille de route.",
              "Jusqu'à 5 000 lignes (palier Découverte) ou 1 million de lignes (palier PME).",
              'Validation automatique : taille, encodage, colonnes, valeurs manquantes signalées.',
              'Données hébergées en Union européenne, chiffrées, supprimées automatiquement après 30 jours.',
            ]}
            mock={
              <div className="rounded-md border border-dashed border-border-strong bg-surface-2 p-8 text-center text-sm text-fg-secondary">
                <div className="mx-auto mb-3 flex size-9 items-center justify-center rounded-lg border border-accent-border bg-accent-soft font-mono text-lg text-accent">
                  ↑
                </div>
                <p>
                  <strong className="font-medium text-fg">Recrutement_2024.csv</strong>
                </p>
                <p className="mt-1 text-xs">412 lignes · 18 colonnes · validation OK</p>
                <div className="mt-3 h-1 overflow-hidden rounded-full bg-surface">
                  <div className="h-full w-full bg-status-pass" />
                </div>
              </div>
            }
          />

          <Stage
            num="02"
            time="3 minutes"
            title="Configurez l'audit en quelques clics."
            lede={
              "Désignez la variable de décision que votre IA produit (par exemple : « short-listé », « accepté », « score ≥ 60 »). Identifiez les attributs sensibles à surveiller. AuditIQ propose des paramètres par défaut, ajustables par votre responsable conformité."
            }
            items={[
              'Suggestions automatiques de colonnes sensibles, validées manuellement.',
              'Seuils par défaut basés sur les standards reconnus (règle des 4/5), ajustables.',
              'Paramètres avancés accessibles pour les équipes data (seuils, nombre de clusters).',
            ]}
            mock={
              <div className="flex flex-col gap-3.5">
                <FieldMock label="Variable de décision" value="short_listed" />
                <FieldMock label="Attribut sensible" value="genre" />
                <FieldMock label="Métriques" value="4 sélectionnées" />
                <FieldMock label="Seuil règle 4/5" value="0.80" />
              </div>
            }
          />

          <Stage
            num="03"
            time="Quelques minutes"
            title="Analysez les résultats — comme un dossier qu'on parcourt."
            lede="Feu tricolore global. Détail par métrique. Visualisation des écarts entre groupes. Chaque résultat est expliqué en deux à trois phrases compréhensibles, avec un rattachement aux articles de l'AI Act concernés."
            items={[
              'Vue synthétique (1 écran) pour la direction et le CODIR.',
              'Vue détaillée par métrique pour le responsable conformité et le DPO.',
              'Détails techniques accessibles pour les équipes data.',
              'Explication en langage clair générée pour chaque écart.',
            ]}
            mock={
              <>
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <Eyebrow>Audit terminé</Eyebrow>
                    <div className="mt-1 text-[15px] font-medium text-fg">Score 3 / 5</div>
                  </div>
                  <StatusPill tone="warn">Vigilance</StatusPill>
                </div>
                <div className="flex flex-col gap-3">
                  <MetricBar label="Demographic Parity" value="0.78" tone="warn" fillPercent={78} />
                  <MetricBar label="Equal Opportunity" value="0.92" tone="pass" fillPercent={92} />
                  <p className="rounded-md bg-surface-2 p-3 text-sm leading-relaxed text-fg-secondary">
                    <strong className="font-medium text-fg">Lecture.</strong> L&apos;écart de
                    présélection entre groupes est de 12 %. La règle des 4/5 n&apos;est pas
                    respectée (0.78 &lt; 0.80). Cette situation relève de l&apos;article 10 du
                    règlement (UE) 2024/1689.
                  </p>
                </div>
              </>
            }
          />

          <Stage
            num="04"
            time="1 minute"
            title="Exportez une trace documentée."
            lede="Deux exports prêts à transmettre : un PDF de synthèse pour les décideurs et un Excel structuré conformément à l'annexe IV de l'AI Act, prêt à intégrer dans votre registre des systèmes d'IA."
            items={[
              "Synthèse dirigeants PDF — identifiant d'audit et horodatage.",
              'Excel réglementaire — structure annexe IV.',
              "L'historique des rapports reste disponible dans votre espace.",
              'Les jeux de données sources sont supprimés automatiquement après 30 jours.',
            ]}
            mock={
              <div className="flex flex-col gap-3">
                <FileRow
                  ext="PDF"
                  tone="fail"
                  name="rapport-A-2026-0314.pdf"
                  sub="Synthèse dirigeants · 2 pages"
                />
                <FileRow
                  ext="XLSX"
                  tone="pass"
                  name="annexe-IV-2026-0314.xlsx"
                  sub="Structure AI Act"
                />
              </div>
            }
          />
        </Container>
      </section>

      {/* TOTAL TIME */}
      <section className="py-16">
        <Container>
          <Reveal>
            <div className="rounded-2xl border border-border-default bg-surface p-12 text-center">
              <Eyebrow accent>Temps total</Eyebrow>
              <h2 className="mt-3 font-display text-[clamp(48px,5vw,64px)] font-medium tracking-[-0.02em] text-fg">
                Moins de 10 minutes
              </h2>
              <p className="mx-auto mt-4 max-w-[50ch] leading-relaxed text-fg-secondary">
                Pour un premier audit Module 1 · Caractéristique connue, de l&apos;import du fichier au rapport
                téléchargé. Comptez davantage pour interpréter les résultats avec vos équipes.
              </p>
            </div>
          </Reveal>
        </Container>
      </section>

      {/* FAQ */}
      <section className="py-24">
        <Container>
          <Reveal className="mb-12 max-w-[720px]">
            <Eyebrow accent>Questions opérationnelles</Eyebrow>
            <h2 className="mt-3 text-h2 font-display font-medium tracking-tight text-fg">
              Avant de commencer.
            </h2>
            <p className="mt-4 text-h4 leading-relaxed text-fg-secondary">
              Les questions qu&apos;on nous pose le plus avant la première démo.
            </p>
          </Reveal>
          <div className="flex max-w-[760px] flex-col gap-3">
            {FAQ_ITEMS.map((item) => (
              <details
                key={item.q}
                className="group rounded-md border border-border-default bg-surface p-5 sm:p-6"
              >
                <summary className="flex cursor-pointer list-none items-start justify-between gap-4 text-h4 font-medium">
                  <span>{item.q}</span>
                  <span
                    aria-hidden
                    className="font-mono text-2xl leading-none text-fg-muted transition-transform duration-200 group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-fg-secondary">{item.a}</p>
              </details>
            ))}
          </div>
        </Container>
      </section>

      <FinalCta
        eyebrow="Prêt à essayer"
        title="Faites votre premier audit sur vos données."
        body="Notre équipe vous guide pas à pas pendant la démo. Vous repartez avec un rapport."
        primary={{ label: 'Réserver une démo', href: '/contact' }}
        secondary={{ label: 'Démarrer en autonomie', href: '/inscription' }}
      />
    </>
  );
}
