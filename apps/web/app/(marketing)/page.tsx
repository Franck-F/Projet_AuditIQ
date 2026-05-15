import Link from 'next/link';
import type { Metadata } from 'next';
import { Container } from '@/components/layout/Container';
import { Reveal } from '@/components/layout/Reveal';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Auditez la fairness de votre IA, sans écrire de code',
  description:
    "Plateforme SaaS d'audit de biais des systèmes d'IA pour PME. Détectez, expliquez et documentez les écarts en moins d'une heure, conformément à l'AI Act européen.",
};

/* ============================================================================
   Page-local components (mirroring landing.html structure)
   ============================================================================ */

function StatusInfo({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-status-info-border bg-status-info-bg px-2.5 py-1 text-xs font-medium text-status-info">
      <span className="size-2 rounded-full bg-status-info" aria-hidden />
      {children}
    </span>
  );
}

function StatusPill({
  tone,
  children,
}: {
  tone: 'pass' | 'warn' | 'fail';
  children: React.ReactNode;
}) {
  const map: Record<typeof tone, string> = {
    pass: 'border-status-pass-border bg-status-pass-bg text-status-pass',
    warn: 'border-status-warn-border bg-status-warn-bg text-status-warn',
    fail: 'border-status-fail-border bg-status-fail-bg text-status-fail',
  };
  const dot: Record<typeof tone, string> = {
    pass: 'bg-status-pass',
    warn: 'bg-status-warn',
    fail: 'bg-status-fail',
  };
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-medium tabular-nums ${map[tone]}`}
    >
      <span className={`size-2 rounded-full ${dot[tone]}`} aria-hidden />
      {children}
    </span>
  );
}

function MetricMini({
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
    <div className="flex flex-col gap-2 rounded-lg border border-border-default bg-surface p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-xs uppercase tracking-[0.12em] text-fg-muted">
          {label}
        </span>
        <StatusPill tone={tone}>{value}</StatusPill>
      </div>
      <div className="relative h-1.5 overflow-hidden rounded-full bg-surface-3">
        <div
          className={`h-full rounded-full ${fill[tone]}`}
          style={{ width: `${fillPercent}%` }}
        />
        <span
          className="absolute -top-0.5 -bottom-0.5 w-0.5 bg-fg-secondary/60"
          style={{ left: `${threshold}%` }}
          aria-hidden
        />
      </div>
      <span className="text-xs text-fg-muted">{sub}</span>
    </div>
  );
}

function HeroVisual() {
  return (
    <div className="flex flex-col gap-5 rounded-2xl border border-border-default bg-surface p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="font-mono text-xs uppercase tracking-[0.08em] text-fg-muted">
            RAPPORT · AUDIT #A-2026-0314
          </span>
          <h3 className="text-h4 text-fg">Recrutement_2024.csv</h3>
        </div>
        <span className="inline-flex items-center rounded-md border border-border-default bg-surface-2 px-2.5 py-1 font-mono text-xs uppercase tracking-[0.06em] text-fg-secondary">
          Module 1
        </span>
      </div>

      <div className="flex items-center gap-4 rounded-xl border border-status-warn-border bg-status-warn-bg p-5">
        <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-status-warn font-display text-[22px] font-semibold text-[#1a1305]">
          3/5
        </div>
        <div>
          <h5 className="font-display text-[18px] font-semibold tracking-tight text-fg">
            Vigilance — 2 métriques en alerte
          </h5>
          <p className="text-sm text-fg-secondary">
            Écart significatif détecté sur l&apos;attribut genre.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <MetricMini
          label="Demographic Parity"
          value="0.78"
          tone="warn"
          fillPercent={78}
          threshold={80}
          sub="Seuil 0.80 · règle des 4/5"
        />
        <MetricMini
          label="Equal Opportunity"
          value="0.92"
          tone="pass"
          fillPercent={92}
          threshold={80}
          sub="Seuil 0.80 · écart résiduel"
        />
      </div>

      <p className="rounded-md border border-status-info-border bg-status-info-bg p-3 text-xs leading-relaxed text-fg-secondary">
        <strong className="font-medium text-fg">Capture du produit.</strong> Les valeurs présentées
        sont issues d&apos;un scénario RH fictif à des fins illustratives.
      </p>
    </div>
  );
}

const PROBLEMS = [
  {
    title: 'Des biais souvent invisibles',
    body: "Les écarts entre groupes (genre, âge, origine présumée, handicap) peuvent rester indétectés des mois, jusqu'à la première plainte ou contrôle.",
  },
  {
    title: 'Une expertise rare et coûteuse',
    body: 'Recruter un statisticien fairness ou un cabinet spécialisé coûte 15 à 60 k€ par audit, hors temps interne. Inaccessible pour la plupart des PME.',
  },
  {
    title: 'Des outils existants pensés pour les data teams',
    body: 'Fairlearn, AIF360, Aequitas réclament Python et une équipe data dédiée. Le besoin réel en PME : un produit qui parle conformité, pas F1-score.',
  },
  {
    title: 'Une charge documentaire qui s\'alourdit',
    body: "Annexe IV du règlement européen, registre des systèmes, gouvernance des données : la traçabilité demandée est lourde à produire à la main.",
  },
];

const STEPS = [
  {
    num: 'ÉTAPE 01',
    title: 'Importez vos données',
    body: 'CSV, Excel ou connexion API. Mapping automatique des colonnes. Le chatbot ? Une simple clé API.',
  },
  {
    num: 'ÉTAPE 02',
    title: "Configurez l'audit",
    body: 'Désignez la variable de décision et les attributs sensibles à surveiller. Choisissez les métriques ou laissez les seuils par défaut.',
  },
  {
    num: 'ÉTAPE 03',
    title: 'Recevez le diagnostic',
    body: 'Feu tricolore global, écarts par groupe, explications en langage naturel et niveau de risque réglementaire qualifié.',
  },
  {
    num: 'ÉTAPE 04',
    title: 'Exportez la trace',
    body: "Rapport PDF et Excel structuré selon l'annexe IV de l'AI Act. Prêt à être transmis à votre DPO ou auditeur externe.",
  },
];

const MODULES = [
  {
    num: 'MODULE 01',
    title: 'Audit supervisé',
    lede: 'Pour les modèles de classification ou de scoring (RH, crédit, assurance). Calcul des métriques fairness canoniques et visualisation des écarts.',
    points: [
      'Demographic Parity, Equal Opportunity, Equalized Odds',
      'Règle des quatre cinquièmes (4/5 rule, droit US et UE)',
      'Décomposition par groupe et par sous-groupe',
      'Explication en langage naturel',
    ],
    href: '/modules#supervise',
  },
  {
    num: 'MODULE 02',
    title: 'Détection non supervisée',
    lede: 'Pour les datasets sans variable cible explicite. Identification de clusters déviants et signalement de proxies de critères protégés.',
    points: [
      'Clustering automatique paramétré',
      'Identification de features dominantes par cluster',
      'Signalement de proxies (code postal ⇆ origine présumée…)',
      'Lecture pédagogique du niveau de risque',
    ],
    href: '/modules#non-supervise',
  },
  {
    num: 'MODULE 03',
    title: 'Audit LLM & chatbot',
    lede: 'Pour les assistants conversationnels (SAV, RH, médical). Banque de prompts pairs, comparaison réponses, scoring multi-axes.',
    points: [
      'Banque de 400+ prompts pairs maintenue à jour',
      'Comparaison longueur, sentiment, taux de refus',
      'Score par axe : genre, origine, âge, religion, handicap',
      'Extraits significatifs annotés',
    ],
    href: '/modules#llm',
  },
];

const TRANSVERSAL = [
  { num: '01', title: 'Recommandations', body: 'Actions priorisées, hiérarchisées par niveau de risque.' },
  { num: '02', title: 'Ancrage réglementaire', body: "Chaque alerte est référencée à un article de l'AI Act." },
  { num: '03', title: 'Historique', body: 'Conservation 5 ans, comparaison entre audits.' },
  { num: '04', title: 'Export & gouvernance', body: 'PDF, Excel, gestion équipe et permissions.' },
];

const AI_ACT_ARTICLES = [
  {
    num: 'Art. 10',
    title: 'Gouvernance des données',
    body: "Détection des biais dans les jeux d'entraînement, de validation et de test des systèmes à haut risque.",
  },
  {
    num: 'Art. 13',
    title: 'Transparence',
    body: "Notice d'utilisation détaillant les limites du système et les performances par sous-groupe.",
  },
  {
    num: 'Art. 15',
    title: 'Exactitude & robustesse',
    body: 'Mesures de performance désagrégées et mesure des biais possibles tout au long du cycle de vie.',
  },
  {
    num: 'Annexe IV',
    title: 'Documentation technique',
    body: 'Pièce justificative auditable archivée et exportable pour les contrôles internes ou externes.',
  },
];

const QUOTES = [
  {
    quote:
      "Notre outil de scoring CV avait dérivé sans qu'on le sache. AuditIQ nous a montré l'écart entre les profils en moins de quinze minutes, avec un vocabulaire que mon CODIR pouvait comprendre.",
    initials: 'CT',
    name: 'Claire Tessier',
    role: 'DRH · Cabinet Tessier & Associés · 180 collaborateurs',
  },
  {
    quote:
      "Le rapport généré par AuditIQ a remplacé trois jours de travail interne. Et surtout, il parle la langue de l'AI Act, ce qui n'est pas une évidence dans notre métier.",
    initials: 'RM',
    name: 'Romain Mathys',
    role: 'Responsable conformité · Banque Loiret · 420 collaborateurs',
  },
];

/* ============================================================================
   Page
   ============================================================================ */

export default function LandingPage() {
  return (
    <>
      {/* HERO */}
      <header className="border-b border-border-subtle pt-[clamp(64px,9vw,120px)] pb-[clamp(64px,9vw,120px)]">
        <Container>
          <div className="grid grid-cols-1 gap-16 lg:grid-cols-[1.1fr_0.9fr]">
            <Reveal>
              <StatusInfo>
                Conforme à l&apos;AI Act · Règlement (UE) 2024/1689
              </StatusInfo>
              <h1 className="mt-6 max-w-[18ch] font-display text-[clamp(48px,6vw,72px)] font-semibold leading-[1.02] tracking-[-0.025em] text-fg">
                Détectez les biais de votre IA. Documentez la conformité.
              </h1>
              <p className="mt-6 max-w-[60ch] text-[clamp(18px,1.4vw,22px)] leading-relaxed text-fg-secondary">
                AuditIQ est la plateforme française d&apos;audit de fairness pour les PME. Analysez
                vos modèles supervisés, non supervisés et vos chatbots LLM en moins d&apos;une
                heure, sans écrire une ligne de code. Recevez un rapport exploitable, aligné sur
                l&apos;AI Act.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild variant="primary" size="lg">
                  <Link href="/contact">Demander une démo guidée</Link>
                </Button>
                <Button asChild variant="secondary" size="lg">
                  <Link href="/comment-ca-marche">Voir comment ça marche</Link>
                </Button>
              </div>
              <div className="mt-6 flex flex-wrap items-center gap-3 text-xs text-fg-muted">
                <span>✓ Premier audit gratuit</span>
                <span aria-hidden className="opacity-50">·</span>
                <span>✓ Hébergement européen</span>
                <span aria-hidden className="opacity-50">·</span>
                <span>✓ Sans code, sans intégration</span>
              </div>
            </Reveal>

            <Reveal delay={0.12}>
              <HeroVisual />
            </Reveal>
          </div>

          {/* Logo cloud */}
          <Reveal className="mt-24">
            <p className="eyebrow mb-6 text-center">
              Utilisé par des équipes conformité et data au sein de
            </p>
            <div className="grid grid-cols-2 items-center gap-8 border-y border-border-subtle py-8 opacity-75 md:grid-cols-3 lg:grid-cols-6">
              {[
                'Tessier & Associés',
                'Banque Loiret',
                'Mathys SA',
                'Crédit Régional',
                'Hôpital Saint-Marc',
                'Groupe Verlaine',
              ].map((label) => (
                <span
                  key={label}
                  className="text-center font-display text-sm font-medium tracking-tight text-fg-muted"
                >
                  {label}
                </span>
              ))}
            </div>
          </Reveal>
        </Container>
      </header>

      {/* PROBLEM */}
      <section className="py-24">
        <Container>
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-16 items-start">
            <Reveal>
              <p className="eyebrow eyebrow-accent">Le problème</p>
              <h2 className="mt-3 text-h2 font-display font-medium leading-[1.2] tracking-[-0.015em] text-fg">
                L&apos;AI Act entre en vigueur. Votre PME n&apos;a ni data scientist, ni juriste
                IA, ni temps à perdre.
              </h2>
              <p className="mt-5 text-h4 leading-relaxed text-fg-secondary">
                À partir d&apos;août 2026, les systèmes d&apos;IA à haut risque devront prouver
                l&apos;absence de discrimination. Les amendes peuvent atteindre 7 % du chiffre
                d&apos;affaires mondial. Pour une PME qui utilise un CRM intelligent, un chatbot
                SAV ou un outil de scoring, l&apos;enjeu n&apos;est plus théorique.
              </p>
              <p className="mt-6 leading-relaxed text-fg-secondary">
                AuditIQ traduit la complexité technique et réglementaire en une expérience produit
                accessible. Vous chargez vos données ou vos prompts ; nous calculons les métriques
                de fairness reconnues, nous expliquons les écarts en langage clair et nous générons
                un rapport opposable.
              </p>
            </Reveal>

            <ul className="flex flex-col gap-4">
              {PROBLEMS.map((p, i) => (
                <Reveal as="li" delay={i * 0.06} key={p.title}>
                  <article className="grid grid-cols-[auto_1fr] items-start gap-4 rounded-md border border-border-default bg-surface p-5">
                    <span
                      aria-hidden
                      className="inline-flex size-7 items-center justify-center rounded-md border border-status-fail-border bg-status-fail-bg font-mono text-[13px] font-medium text-status-fail"
                    >
                      !
                    </span>
                    <div>
                      <h3 className="text-h4 font-medium text-fg">{p.title}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-fg-secondary">{p.body}</p>
                    </div>
                  </article>
                </Reveal>
              ))}
            </ul>
          </div>
        </Container>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-24">
        <Container>
          <Reveal className="mx-auto mb-12 max-w-[720px] text-center">
            <p className="eyebrow eyebrow-accent">Comment ça marche</p>
            <h2 className="mt-3 text-h2 font-display font-medium tracking-tight text-fg">
              Quatre étapes. Une heure. Aucune ligne de code.
            </h2>
            <p className="mt-4 text-h4 leading-relaxed text-fg-secondary">
              Un parcours conçu pour des responsables RH, conformité ou innovation — pas pour des
              statisticiens.
            </p>
          </Reveal>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <Reveal key={s.num} delay={i * 0.06}>
                <div className="flex h-full flex-col gap-3 rounded-xl border border-border-default bg-surface p-6">
                  <span className="font-mono text-xs uppercase tracking-[0.12em] text-accent">
                    {s.num}
                  </span>
                  <h4 className="text-h4 font-medium text-fg">{s.title}</h4>
                  <p className="text-sm leading-relaxed text-fg-secondary">{s.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      {/* MODULES */}
      <section className="border-y border-border-subtle bg-surface py-24">
        <Container>
          <Reveal className="mb-12 max-w-[760px]">
            <p className="eyebrow eyebrow-accent">Trois modules d&apos;audit</p>
            <h2 className="mt-3 text-h2 font-display font-medium tracking-tight text-fg">
              Une couverture qui correspond aux IA réellement déployées en PME.
            </h2>
            <p className="mt-4 text-h4 leading-relaxed text-fg-secondary">
              Des modèles classiques de scoring, en passant par les détections non supervisées,
              jusqu&apos;aux assistants LLM intégrés au service client.
            </p>
          </Reveal>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            {MODULES.map((m, i) => (
              <Reveal as="article" key={m.num} delay={i * 0.08}>
                <div className="flex h-full flex-col gap-5 rounded-2xl border border-border-default bg-surface p-8">
                  <span className="font-mono text-xs uppercase tracking-[0.12em] text-accent">
                    {m.num}
                  </span>
                  <h3 className="text-[22px] font-display font-medium tracking-tight text-fg">
                    {m.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-fg-secondary">{m.lede}</p>
                  <ul className="flex flex-col gap-2">
                    {m.points.map((point) => (
                      <li
                        key={point}
                        className="flex gap-2.5 text-sm leading-snug text-fg-secondary"
                      >
                        <span
                          aria-hidden
                          className="mt-[9px] inline-block size-1 shrink-0 rounded-full bg-accent"
                        />
                        {point}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={m.href}
                    className="mt-auto inline-flex items-center gap-1.5 self-start rounded-md px-3 py-2 text-sm font-medium text-fg-secondary transition-colors hover:bg-surface-2 hover:text-fg"
                  >
                    Détail du module →
                  </Link>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal className="mt-8" delay={0.1}>
            <div className="rounded-2xl border border-border-default bg-surface-2 p-7">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <span className="eyebrow">Couche transversale</span>
                  <h4 className="mt-1.5 text-h4 font-medium text-fg">
                    Au-delà des modules : la chaîne de conformité complète.
                  </h4>
                </div>
                <Button asChild variant="secondary" size="sm">
                  <Link href="/produit#couche">Voir la couche transversale</Link>
                </Button>
              </div>
              <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {TRANSVERSAL.map((t) => (
                  <div key={t.num}>
                    <span className="eyebrow">{t.num}</span>
                    <h5 className="mt-1.5 text-[15px] font-medium text-fg">{t.title}</h5>
                    <p className="mt-1 text-sm text-fg-secondary">{t.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </Container>
      </section>

      {/* AI ACT ANCHOR */}
      <section className="py-24">
        <Container>
          <Reveal>
            <div className="grid grid-cols-1 items-center gap-10 rounded-2xl border border-border-default bg-surface p-8 sm:p-12 lg:grid-cols-2 lg:gap-12">
              <div>
                <p className="eyebrow eyebrow-accent">Ancrage réglementaire</p>
                <h2 className="mt-3 text-h2 font-display font-medium tracking-tight text-fg">
                  Alignée sur l&apos;AI Act et le droit français.
                </h2>
                <p className="mt-5 text-base leading-relaxed text-fg-secondary">
                  AuditIQ ne se substitue pas à votre responsable conformité — mais l&apos;outille.
                  Chaque écart détecté est rattaché aux articles concernés du règlement européen
                  (UE) 2024/1689 et aux textes français applicables (loi Informatique &amp;
                  Libertés, article L.1132-1 du Code du travail, article 225-1 du Code pénal).
                </p>
                <Button asChild variant="secondary" className="mt-6">
                  <Link href="/ai-act">Lire la note AI Act complète →</Link>
                </Button>
              </div>
              <div className="flex flex-col gap-3">
                {AI_ACT_ARTICLES.map((a) => (
                  <div
                    key={a.num}
                    className="grid grid-cols-[auto_1fr] items-start gap-4 rounded-md border border-border-default bg-surface-2 p-4"
                  >
                    <span className="self-start whitespace-nowrap rounded-md border border-accent-border bg-accent-soft px-2.5 py-1 font-mono text-xs uppercase tracking-[0.08em] text-accent">
                      {a.num}
                    </span>
                    <div>
                      <h4 className="text-[15px] font-medium text-fg">{a.title}</h4>
                      <p className="mt-1 text-sm leading-relaxed text-fg-secondary">{a.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>

          <Reveal className="mt-6" delay={0.05}>
            <div className="rounded-md border border-status-info-border bg-status-info-bg p-5 text-sm leading-relaxed text-fg-secondary">
              <strong className="font-medium text-fg">Disclaimer.</strong> AuditIQ produit une
              analyse documentée des écarts mesurés. La qualification réglementaire finale et les
              décisions de conformité relèvent de votre responsable conformité ou DPO. AuditIQ
              n&apos;est pas un certificat délivré par un organisme notifié au sens de
              l&apos;article 43 du règlement (UE) 2024/1689.
            </div>
          </Reveal>
        </Container>
      </section>

      {/* PROOF */}
      <section className="bg-surface py-24">
        <Container>
          <Reveal className="mx-auto mb-10 max-w-[720px] text-center">
            <p className="eyebrow eyebrow-accent">Preuves &amp; témoignages</p>
            <h2 className="mt-3 text-h2 font-display font-medium tracking-tight text-fg">
              Ce que les équipes en disent.
            </h2>
          </Reveal>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {QUOTES.map((q, i) => (
              <Reveal key={q.name} delay={i * 0.08}>
                <div className="flex h-full flex-col gap-6 rounded-2xl border border-border-default bg-surface p-8">
                  <blockquote className="font-display text-[22px] leading-[1.4] tracking-[-0.015em] text-fg">
                    « {q.quote} »
                  </blockquote>
                  <div className="flex items-center gap-3">
                    <div
                      aria-hidden
                      className="inline-flex size-10 items-center justify-center rounded-full border border-border-default bg-surface-3 font-display text-sm text-fg-secondary"
                    >
                      {q.initials}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-fg">{q.name}</div>
                      <div className="text-xs text-fg-muted">{q.role}</div>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal className="mt-8 text-center" delay={0.1}>
            <Button asChild variant="secondary">
              <Link href="/temoignages">Voir les 6 études de cas →</Link>
            </Button>
          </Reveal>
        </Container>
      </section>

      {/* PRICING TEASER */}
      <section className="py-24">
        <Container>
          <Reveal className="mx-auto mb-12 max-w-[720px] text-center">
            <p className="eyebrow eyebrow-accent">Tarification</p>
            <h2 className="mt-3 text-h2 font-display font-medium tracking-tight text-fg">
              Une tarification calée sur la maturité de votre PME.
            </h2>
            <p className="mt-4 text-h4 leading-relaxed text-fg-secondary">
              Démarrez gratuitement. Passez en payant quand vos audits deviennent récurrents.
            </p>
          </Reveal>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {/* Découverte */}
            <Reveal>
              <div className="relative flex h-full flex-col gap-6 rounded-2xl border border-border-default bg-surface p-8">
                <div>
                  <span className="font-display text-h4 font-semibold tracking-tight">
                    Découverte
                  </span>
                  <p className="mt-1 text-sm text-fg-secondary">Un premier audit, pour cadrer.</p>
                </div>
                <div className="font-display text-[44px] font-semibold leading-none tracking-[-0.025em] tabular-nums">
                  0&nbsp;€
                  <span className="ml-2 font-sans text-sm font-normal text-fg-muted">
                    / pour toujours
                  </span>
                </div>
                <ul className="flex flex-col gap-3 text-sm text-fg-secondary">
                  {['1 audit supervisé / mois', 'Rapport PDF basique', '3 utilisateurs', 'Support communautaire'].map(
                    (li) => (
                      <li key={li} className="flex items-start gap-2.5">
                        <span aria-hidden className="mt-[3px] text-accent">✓</span>
                        {li}
                      </li>
                    ),
                  )}
                </ul>
                <Button asChild variant="secondary" className="w-full">
                  <Link href="/inscription">Commencer</Link>
                </Button>
              </div>
            </Reveal>

            {/* PME — featured */}
            <Reveal delay={0.06}>
              <div className="relative flex h-full flex-col gap-6 rounded-2xl border border-accent-border bg-gradient-to-b from-accent-soft to-transparent to-50% bg-surface p-8">
                <span className="absolute -top-3 right-6 rounded-full bg-accent px-2.5 py-1 text-xs font-medium text-[#0b1410]">
                  Recommandé
                </span>
                <div>
                  <span className="font-display text-h4 font-semibold tracking-tight">PME</span>
                  <p className="mt-1 text-sm text-fg-secondary">
                    Pour une routine de conformité.
                  </p>
                </div>
                <div className="font-display text-[44px] font-semibold leading-none tracking-[-0.025em] tabular-nums">
                  490&nbsp;€
                  <span className="ml-2 font-sans text-sm font-normal text-fg-muted">
                    / mois HT
                  </span>
                </div>
                <ul className="flex flex-col gap-3 text-sm text-fg-secondary">
                  {[
                    'Audits illimités · 3 modules',
                    'Rapports PDF & Excel structurés AI Act',
                    '15 utilisateurs · permissions par rôle',
                    "Historique 5 ans & comparaison d'audits",
                    'Support sous 24h ouvrées',
                  ].map((li) => (
                    <li key={li} className="flex items-start gap-2.5">
                      <span aria-hidden className="mt-[3px] text-accent">✓</span>
                      {li}
                    </li>
                  ))}
                </ul>
                <Button asChild variant="primary" className="w-full">
                  <Link href="/contact">Demander une démo</Link>
                </Button>
              </div>
            </Reveal>

            {/* Entreprise */}
            <Reveal delay={0.12}>
              <div className="relative flex h-full flex-col gap-6 rounded-2xl border border-border-default bg-surface p-8">
                <div>
                  <span className="font-display text-h4 font-semibold tracking-tight">
                    Entreprise
                  </span>
                  <p className="mt-1 text-sm text-fg-secondary">
                    Multi-entité, sécurité avancée.
                  </p>
                </div>
                <div className="font-display text-[44px] font-semibold leading-none tracking-[-0.025em] tabular-nums">
                  Sur devis
                </div>
                <ul className="flex flex-col gap-3 text-sm text-fg-secondary">
                  {[
                    'Tout PME + SSO, audit log avancé',
                    'Multi-entités & multi-pays',
                    'Hébergement souverain dédié',
                    'Accompagnement expert AI Act',
                  ].map((li) => (
                    <li key={li} className="flex items-start gap-2.5">
                      <span aria-hidden className="mt-[3px] text-accent">✓</span>
                      {li}
                    </li>
                  ))}
                </ul>
                <Button asChild variant="secondary" className="w-full">
                  <Link href="/contact">Nous contacter</Link>
                </Button>
              </div>
            </Reveal>
          </div>

          <Reveal className="mt-8 text-center" delay={0.1}>
            <Button asChild variant="ghost">
              <Link href="/tarifs">Comparer les paliers en détail →</Link>
            </Button>
          </Reveal>
        </Container>
      </section>

      {/* CTA FINAL */}
      <section className="py-16">
        <Container>
          <Reveal>
            <div className="grid grid-cols-1 items-center gap-8 rounded-2xl border border-border-default bg-surface p-[clamp(40px,6vw,64px)] lg:grid-cols-[1fr_auto]">
              <div>
                <p className="eyebrow eyebrow-accent">Passez à l&apos;action</p>
                <h2 className="mt-3 text-h2 font-display font-medium tracking-tight text-fg">
                  Lancez votre premier audit fairness en moins d&apos;une heure.
                </h2>
                <p className="mt-3 max-w-[56ch] text-fg-secondary">
                  Notre équipe vous accompagne sur votre premier cas d&apos;usage : RH, crédit,
                  scoring ou chatbot. Trente minutes de démo, pas plus.
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <Button asChild variant="primary" size="lg">
                  <Link href="/contact">Réserver une démo de 30 minutes</Link>
                </Button>
                <Button asChild variant="secondary">
                  <Link href="/inscription">Créer un compte gratuit</Link>
                </Button>
              </div>
            </div>
          </Reveal>
        </Container>
      </section>
    </>
  );
}
