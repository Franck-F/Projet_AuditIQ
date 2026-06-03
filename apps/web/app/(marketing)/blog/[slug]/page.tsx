import Link from 'next/link';
import type { Metadata } from 'next';
import { Container } from '@/components/layout/Container';
import { Eyebrow } from '@/components/marketing/Eyebrow';
import { Button } from '@/components/ui/button';

/* ============================================================================
   Static params — hardcoded until CMS integration
   ============================================================================ */

const ARTICLE_SLUGS = [
  'ai-act-pme-2026',
  'regle-quatre-cinquiemes',
  'audit-fairness-outils-cv',
  'scoring-credit-proxies-geographiques',
  'counterfactual-prompt-pairs-llm',
  'article-10-ai-act-gouvernance-donnees',
  'banque-loiret-proxy-geographique',
  'livre-blanc-audit-ai-act-pme',
  'demographic-parity-vs-equal-opportunity',
  'auditiq-v2-comparaison-audits',
];

export function generateStaticParams() {
  return ARTICLE_SLUGS.map((slug) => ({ slug }));
}

export function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Metadata {
  return {
    title: `Article — ${params.slug.replace(/-/g, ' ')} · AuditIQ`,
    description:
      "Guide, étude sectorielle ou fiche méthodologique sur la fairness IA et la conformité AI Act européen.",
  };
}

/* ============================================================================
   Fixture content — lorem-style, AI Act themed
   ============================================================================ */

const TOC = [
  { id: 'perimetre', label: 'Quel périmètre vous concerne' },
  { id: 'obligations', label: 'Obligations concrètes' },
  { id: 'calendrier', label: 'Calendrier à respecter' },
  { id: 'charge-preuve', label: 'Charge de la preuve' },
  { id: 'sanctions', label: 'Sanctions encourues' },
  { id: 'plan-action', label: "Plan d'action en six mois" },
];

const RELATED = [
  {
    slug: 'article-10-ai-act-gouvernance-donnees',
    category: 'AI ACT',
    readTime: '9 min',
    title: "Article 10 de l'AI Act : ce que « gouvernance des données » signifie en pratique.",
  },
  {
    slug: 'demographic-parity-vs-equal-opportunity',
    category: 'MÉTHODE',
    readTime: '7 min',
    title: 'Demographic Parity vs Equal Opportunity : laquelle choisir, et quand ?',
  },
  {
    slug: 'banque-loiret-proxy-geographique',
    category: "RETOUR D'EXP",
    readTime: '11 min',
    title: 'Comment Banque Loiret a corrigé un proxy géographique en 7 mois.',
  },
];

const PLAN_STEPS = [
  {
    title: 'Mois 1 — Cartographie',
    body: "Inventoriez tous vos systèmes d'IA en production. Identifiez ceux qui tombent en haut risque. Désignez un responsable conformité IA (peut être le DPO).",
  },
  {
    title: 'Mois 2 — Audit fairness initial',
    body: 'Pour chaque système à haut risque, lancez un audit (Module 1, 2 ou 3 selon le système). Identifiez les écarts. Documentez les seuils utilisés.',
  },
  {
    title: 'Mois 3 — Remédiation prioritaire',
    body: "Hiérarchisez les remédiations. Une PME ne peut généralement pas tout corriger d'un coup. Concentrez-vous sur les écarts les plus significatifs.",
  },
  {
    title: 'Mois 4 — Documentation annexe IV',
    body: 'Produisez ou complétez votre dossier technique. AuditIQ génère la section 2.f. Les autres sections restent à produire en parallèle.',
  },
  {
    title: 'Mois 5 — Mise en production de la supervision',
    body: "Mettez en place la supervision humaine effective. Logguez les décisions. Définissez les seuils d'alerte. Formez les équipes.",
  },
  {
    title: 'Mois 6 — Audit de validation',
    body: 'Re-lancez un audit après remédiation pour valider la conformité. Comparez les scores avant/après. Archivez le tout. Vous êtes conforme.',
  },
];

/* ============================================================================
   Page
   ============================================================================ */

export default function ArticlePage() {
  return (
    <>
      {/* ARTICLE HERO */}
      <header className="border-b border-border-subtle pt-[clamp(48px,6vw,80px)] pb-10">
        <Container className="max-w-[880px]">
          <span className="font-mono text-xs uppercase tracking-[0.12em] text-accent">
            Guide · AI Act
          </span>
          <h1 className="mt-4 max-w-[22ch] text-[clamp(32px,4vw,48px)] font-display font-medium leading-[1.15] tracking-[-0.02em] text-fg">
            AI Act pour PME : ce qui change le 2 août 2026 (et comment s&apos;y préparer).
          </h1>
          <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-fg-muted">
            <span>
              Par{' '}
              <strong className="font-medium text-fg">Zineb Khelifi</strong>
            </span>
            <span aria-hidden className="inline-block size-1 rounded-full bg-fg-muted" />
            <span>12 mai 2026</span>
            <span aria-hidden className="inline-block size-1 rounded-full bg-fg-muted" />
            <span>14 min de lecture</span>
            <span aria-hidden className="inline-block size-1 rounded-full bg-fg-muted" />
            <span>v3 — révision après publication du décret d&apos;application</span>
          </div>
        </Container>
      </header>

      {/* ARTICLE BODY + TOC */}
      <section className="py-16">
        <Container>
          <div className="grid grid-cols-1 gap-16 lg:grid-cols-[1fr_240px]">
            {/* Main content */}
            <article className="max-w-[720px] text-[17px] leading-[1.7] text-fg-secondary">
              <p className="text-[19px] text-fg-secondary">
                Le 2 août 2026, les obligations de l&apos;AI Act sur les systèmes d&apos;IA à haut
                risque deviennent contraignantes.{' '}
                <strong className="font-medium text-fg">
                  Pour une PME française, cela peut signifier devoir produire, sous 90 jours, une
                  documentation technique exhaustive (annexe IV)
                </strong>{' '}
                sur chaque système d&apos;IA déployé. Voici, en six points, ce que ça implique
                concrètement.
              </p>

              <h2
                id="perimetre"
                className="mb-4 mt-10 text-[clamp(24px,2.5vw,32px)] font-display font-medium tracking-[-0.015em] text-fg"
              >
                01 — Quel périmètre vous concerne ?
              </h2>
              <p>
                L&apos;AI Act applique une approche par les risques. Pour une PME, le seuil
                critique est le périmètre{' '}
                <strong className="font-medium text-fg">« haut risque »</strong>, défini à
                l&apos;annexe III du règlement. Les usages concernés en pratique :
              </p>
              <ul className="my-4 space-y-2 pl-6">
                <li>
                  Recrutement et gestion RH avec IA (tri de CV, scoring de performance, sélection
                  promotion).
                </li>
                <li>
                  Évaluation de la solvabilité ou des risques de crédit (scoring crédit,
                  anti-fraude).
                </li>
                <li>Tarification ou sélection des risques en assurance santé et vie.</li>
                <li>Accès aux services publics essentiels (énergie, eau, transport).</li>
                <li>Justice et exécution des peines.</li>
                <li>
                  Éducation et formation professionnelle (notation, accès, expulsion).
                </li>
                <li>Biométrie d&apos;identification.</li>
              </ul>

              {/* Callout */}
              <div className="my-6 rounded-md border border-accent-border bg-accent-soft p-5 text-sm leading-relaxed text-fg">
                <strong className="mb-1.5 block font-medium">À retenir.</strong>
                68&nbsp;% des PME françaises de plus de 50 salariés utilisent au moins un outil IA
                en production en 2025 (source : Bpifrance Le Lab). Toutes ne sont pas dans le
                périmètre haut risque, mais celles qui font du tri de CV, du scoring crédit ou de
                la tarification le sont mécaniquement.
              </div>

              <h2
                id="obligations"
                className="mb-4 mt-10 text-[clamp(24px,2.5vw,32px)] font-display font-medium tracking-[-0.015em] text-fg"
              >
                02 — Quelles obligations concrètes ?
              </h2>
              <p>
                L&apos;article 26 liste les obligations du déployeur. Les plus structurantes pour
                une PME :
              </p>
              <ol className="my-4 space-y-2 pl-6">
                <li>
                  <strong className="font-medium text-fg">
                    Documentation technique tenue à jour
                  </strong>{' '}
                  (annexe IV) — disponible sur demande de l&apos;autorité.
                </li>
                <li>
                  <strong className="font-medium text-fg">Supervision humaine effective</strong> —
                  un humain doit pouvoir comprendre et contester la décision IA.
                </li>
                <li>
                  <strong className="font-medium text-fg">Surveillance du fonctionnement</strong>{' '}
                  — y compris des performances par sous-groupe et des biais possibles.
                </li>
                <li>
                  <strong className="font-medium text-fg">Logs conservés</strong> — au moins 6
                  mois, parfois 5 ans selon le système.
                </li>
                <li>
                  <strong className="font-medium text-fg">Notification d&apos;incident</strong> —
                  sous 15 jours en cas d&apos;incident grave.
                </li>
              </ol>

              <h2
                id="calendrier"
                className="mb-4 mt-10 text-[clamp(24px,2.5vw,32px)] font-display font-medium tracking-[-0.015em] text-fg"
              >
                03 — Quel calendrier respecter ?
              </h2>
              <ul className="my-4 space-y-2 pl-6">
                <li>
                  <strong className="font-medium text-fg">2 février 2025</strong> — pratiques
                  interdites en vigueur.
                </li>
                <li>
                  <strong className="font-medium text-fg">2 août 2025</strong> — obligations GPAI
                  et gouvernance européenne.
                </li>
                <li>
                  <strong className="font-medium text-fg">2 août 2026</strong> —{' '}
                  <strong className="font-medium text-fg">
                    obligations haut risque applicables
                  </strong>{' '}
                  (le point d&apos;attention pour les PME).
                </li>
                <li>
                  <strong className="font-medium text-fg">2 août 2027</strong> — extension aux IA
                  intégrées dans des produits régulés.
                </li>
              </ul>
              <blockquote className="my-6 border-l-2 border-accent py-3 pl-6 font-display text-[20px] italic leading-[1.5] text-fg">
                « Le calendrier paraît lointain. Mais une remédiation, en pratique, prend 6 à 9
                mois. Commencer en juin 2026 pour une mise en conformité en août, c&apos;est déjà
                trop tard. »
              </blockquote>

              <h2
                id="charge-preuve"
                className="mb-4 mt-10 text-[clamp(24px,2.5vw,32px)] font-display font-medium tracking-[-0.015em] text-fg"
              >
                04 — Charge de la preuve : ce qui change vraiment
              </h2>
              <p>
                L&apos;AI Act, comme le RGPD, inverse la charge de la preuve. En cas de plainte ou
                de contrôle, ce n&apos;est pas à l&apos;autorité de prouver que votre IA discrimine
                — c&apos;est à vous de prouver qu&apos;elle ne discrimine pas.
              </p>

              <h2
                id="sanctions"
                className="mb-4 mt-10 text-[clamp(24px,2.5vw,32px)] font-display font-medium tracking-[-0.015em] text-fg"
              >
                05 — Quelles sanctions encourues ?
              </h2>
              <ul className="my-4 space-y-2 pl-6">
                <li>
                  <strong className="font-medium text-fg">Pratiques interdites</strong> (article
                  5) : jusqu&apos;à 35&nbsp;M€ ou 7&nbsp;% du CA mondial.
                </li>
                <li>
                  <strong className="font-medium text-fg">
                    Manquements aux obligations haut risque
                  </strong>{' '}
                  (articles 8 à 27) : jusqu&apos;à 15&nbsp;M€ ou 3&nbsp;% du CA mondial.
                </li>
                <li>
                  <strong className="font-medium text-fg">
                    Information inexacte ou incomplète aux autorités
                  </strong>{' '}
                  : jusqu&apos;à 7,5&nbsp;M€ ou 1&nbsp;% du CA mondial.
                </li>
              </ul>

              <h2
                id="plan-action"
                className="mb-4 mt-10 text-[clamp(24px,2.5vw,32px)] font-display font-medium tracking-[-0.015em] text-fg"
              >
                06 — Un plan d&apos;action en six mois
              </h2>
              <p>
                Voici une trame réaliste pour une PME qui démarre en mai 2026 et veut être conforme
                en novembre 2026 :
              </p>
              {PLAN_STEPS.map((step) => (
                <div key={step.title} className="mt-6">
                  <h3 className="mb-2 text-h3 font-display font-medium text-fg">{step.title}</h3>
                  <p>{step.body}</p>
                </div>
              ))}

              <hr className="my-10 border-border-subtle" />

              {/* CTA callout */}
              <div className="rounded-md border border-accent-border bg-accent-soft p-5 text-sm leading-relaxed text-fg">
                <strong className="mb-1.5 block font-medium">Comment AuditIQ vous aide.</strong>
                Notre plateforme couvre les étapes 2, 3 (recommandations), 4 (section 2.f) et 6.
                Elle ne remplace ni votre DPO, ni votre responsable conformité, ni un cabinet
                d&apos;avocats — mais elle outille l&apos;essentiel du travail technique.{' '}
                <Link href="/contact" className="text-accent underline underline-offset-[3px]">
                  Demandez une démo
                </Link>{' '}
                pour voir l&apos;audit sur vos propres données.
              </div>

              {/* Disclaimer */}
              <div className="mt-8 rounded-md border border-status-info-border bg-status-info-bg p-4 text-sm leading-relaxed text-fg-secondary">
                <strong className="font-medium text-fg">Disclaimer.</strong> Cet article est rédigé
                à titre informatif. Il ne constitue pas un avis juridique. AuditIQ n&apos;est pas
                un organisme notifié au sens de l&apos;article 43 du règlement (UE) 2024/1689.
                Consultez un professionnel du droit pour toute décision de conformité.
              </div>
            </article>

            {/* TOC sidebar */}
            <aside className="lg:sticky lg:top-[calc(var(--nav-h)+24px)] lg:self-start">
              <div className="rounded-xl border border-border-default bg-surface p-6">
                <h5 className="mb-4 font-mono text-xs uppercase tracking-[0.12em] text-fg-muted">
                  Au sommaire
                </h5>
                <ol className="flex list-none flex-col gap-1.5 p-0">
                  {TOC.map((item, i) => (
                    <li key={item.id} className="relative pl-7">
                      <span className="absolute left-0 top-1 font-mono text-[11px] text-fg-muted">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <a
                        href={`#${item.id}`}
                        className="block py-1 text-sm leading-snug text-fg-secondary transition-colors hover:text-fg"
                      >
                        {item.label}
                      </a>
                    </li>
                  ))}
                </ol>
                <div className="mt-4 flex items-center gap-2.5 border-t border-border-subtle pt-4">
                  <div
                    aria-hidden
                    className="flex size-8 items-center justify-center rounded-full border border-border-default bg-surface-3 text-xs text-fg-secondary"
                  >
                    ZK
                  </div>
                  <div>
                    <div className="text-sm font-medium text-fg">Zineb Khelifi</div>
                    <div className="text-[11px] text-fg-muted">CLO · AuditIQ</div>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </Container>
      </section>

      {/* RELATED ARTICLES */}
      <section className="border-t border-border-subtle py-16">
        <Container>
          <h2 className="mb-8 text-h2 font-display font-medium tracking-tight text-fg">
            À lire aussi
          </h2>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {RELATED.map((rel) => (
              <Link
                key={rel.slug}
                href={`/blog/${rel.slug}`}
                className="group flex flex-col gap-3 rounded-xl border border-border-default bg-surface p-5 transition-colors hover:border-border-strong"
              >
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-accent">
                    {rel.category}
                  </span>
                  <span className="text-fg-muted">&middot;</span>
                  <span className="text-xs text-fg-muted">{rel.readTime}</span>
                </div>
                <h3 className="text-[15px] font-medium leading-snug text-fg transition-colors group-hover:text-accent">
                  {rel.title}
                </h3>
              </Link>
            ))}
          </div>
        </Container>
      </section>

      {/* CTA STRIP */}
      <section className="border-t border-border-subtle py-16">
        <Container>
          <div className="grid grid-cols-1 items-center gap-8 rounded-2xl border border-border-default bg-surface p-[clamp(40px,6vw,64px)] lg:grid-cols-[1fr_auto]">
            <div>
              <Eyebrow accent>Prochaine étape</Eyebrow>
              <h2 className="mt-3 text-h2 font-display font-medium tracking-tight text-fg">
                Lancez votre audit AI Act sur vos données.
              </h2>
              <p className="mt-3 max-w-[56ch] text-fg-secondary">
                30 minutes de démo guidée pour identifier vos systèmes à haut risque et lancer un
                premier audit pilote.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <Button asChild variant="primary" size="lg">
                <Link href="/contact">Réserver une démo</Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href="/blog">Voir tous les articles</Link>
              </Button>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
