import Link from 'next/link';
import type { Metadata } from 'next';
import { Container } from '@/components/layout/Container';
import { Reveal } from '@/components/layout/Reveal';
import { Button } from '@/components/ui/button';
import { Eyebrow } from '@/components/marketing/Eyebrow';

export const metadata: Metadata = {
  title: "AI Act pour PME : ce qui change le 2 août 2026",
  description:
    "Guide complet à destination des PME pour comprendre et anticiper l'application de l'AI Act au 2 août 2026.",
};

const TOC = [
  { id: 'quel-perimetre', label: 'Quel périmètre vous concerne' },
  { id: 'obligations', label: 'Obligations concrètes' },
  { id: 'calendrier', label: 'Calendrier à respecter' },
  { id: 'charges-de-preuve', label: 'Charge de la preuve' },
  { id: 'sanctions', label: 'Sanctions encourues' },
  { id: 'plan-action', label: "Plan d'action en six mois" },
];

const RELATED = [
  { cat: 'AI ACT', duration: '9 min', title: "Article 10 de l'AI Act : ce que « gouvernance des données » signifie en pratique." },
  { cat: 'MÉTHODE', duration: '7 min', title: 'Demographic Parity vs Equal Opportunity : laquelle choisir, et quand ?' },
  { cat: "RETOUR D'EXP", duration: '11 min', title: 'Comment Banque Loiret a corrigé un proxy géographique en 7 mois.' },
];

function Callout({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-6 rounded-md border border-accent-border bg-accent-soft px-6 py-5 text-sm leading-relaxed text-fg">
      {children}
    </div>
  );
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  // params is awaited per Next 15+ convention; slug currently unused (single article placeholder)
  await params;

  return (
    <>
      <header className="border-b border-border-subtle pt-[clamp(48px,6vw,80px)] pb-12">
        <Container>
          <Reveal>
            <div className="mx-auto max-w-[880px]">
              <Eyebrow accent>Guide · AI Act</Eyebrow>
              <h1 className="my-4 max-w-[22ch] font-display text-[clamp(32px,4vw,48px)] font-semibold leading-[1.15] tracking-[-0.02em] text-fg">
                AI Act pour PME : ce qui change le 2 août 2026 (et comment s&apos;y préparer).
              </h1>
              <div className="flex flex-wrap items-center gap-3 text-sm text-fg-muted">
                <span>
                  Par <strong className="font-medium text-fg">Zineb Khelifi</strong>
                </span>
                <span aria-hidden className="size-1 rounded-full bg-fg-muted" />
                <span>12 mai 2026</span>
                <span aria-hidden className="size-1 rounded-full bg-fg-muted" />
                <span>14 min de lecture</span>
                <span aria-hidden className="size-1 rounded-full bg-fg-muted" />
                <span>v3 — révision après publication du décret d&apos;application</span>
              </div>
            </div>
          </Reveal>
        </Container>
      </header>

      <section className="py-16">
        <Container>
          <div className="grid grid-cols-1 gap-16 lg:grid-cols-[1fr_240px]">
            <article className="max-w-[720px] text-[17px] leading-[1.7] text-fg-secondary">
              <p className="text-[19px]">
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
                id="quel-perimetre"
                className="mt-10 mb-4 scroll-mt-32 font-display text-[clamp(24px,2.5vw,32px)] font-medium tracking-[-0.015em] text-fg"
              >
                01 — Quel périmètre vous concerne ?
              </h2>
              <p className="my-4">
                L&apos;AI Act applique une approche par les risques. Pour une PME, le seuil critique
                est le périmètre <strong className="font-medium text-fg">« haut risque »</strong>,
                défini à l&apos;annexe III du règlement. Les usages concernés en pratique :
              </p>
              <ul className="my-4 list-disc pl-6">
                <li className="my-2">
                  Recrutement et gestion RH avec IA (tri de CV, scoring de performance, sélection
                  promotion).
                </li>
                <li className="my-2">
                  Évaluation de la solvabilité ou des risques de crédit (scoring crédit,
                  anti-fraude).
                </li>
                <li className="my-2">Tarification ou sélection des risques en assurance santé et vie.</li>
                <li className="my-2">Accès aux services publics essentiels (énergie, eau, transport).</li>
                <li className="my-2">Justice et exécution des peines.</li>
                <li className="my-2">
                  Éducation et formation professionnelle (notation, accès, expulsion).
                </li>
                <li className="my-2">Biométrie d&apos;identification.</li>
              </ul>
              <p className="my-4">
                Si l&apos;un de vos cas d&apos;usage tombe dans cette liste, vous êtes{' '}
                <strong className="font-medium text-fg">
                  déployeur d&apos;un système d&apos;IA à haut risque
                </strong>{' '}
                au sens de l&apos;article 26. Si vous éditez un logiciel qui intègre une telle IA
                et que vous le distribuez, vous êtes{' '}
                <strong className="font-medium text-fg">fournisseur</strong> au sens de
                l&apos;article 16 — avec des obligations renforcées.
              </p>

              <Callout>
                <strong className="mb-1.5 block font-medium text-fg">À retenir.</strong> 68 % des
                PME françaises de plus de 50 salariés utilisent au moins un outil IA en production
                en 2025 (source : Bpifrance Le Lab). Toutes ne sont pas dans le périmètre haut
                risque, mais celles qui font du tri de CV, du scoring crédit ou de la tarification
                le sont mécaniquement.
              </Callout>

              <h2
                id="obligations"
                className="mt-10 mb-4 scroll-mt-32 font-display text-[clamp(24px,2.5vw,32px)] font-medium tracking-[-0.015em] text-fg"
              >
                02 — Quelles obligations concrètes ?
              </h2>
              <p className="my-4">
                L&apos;article 26 liste les obligations du déployeur. Les plus structurantes pour
                une PME :
              </p>
              <ol className="my-4 list-decimal pl-6">
                <li className="my-2">
                  <strong className="font-medium text-fg">
                    Documentation technique tenue à jour
                  </strong>{' '}
                  (annexe IV) — disponible sur demande de l&apos;autorité.
                </li>
                <li className="my-2">
                  <strong className="font-medium text-fg">Supervision humaine effective</strong> —
                  un humain doit pouvoir comprendre et contester la décision IA.
                </li>
                <li className="my-2">
                  <strong className="font-medium text-fg">Surveillance du fonctionnement</strong> —
                  y compris des performances par sous-groupe et des biais possibles.
                </li>
                <li className="my-2">
                  <strong className="font-medium text-fg">Logs conservés</strong> — au moins 6 mois,
                  parfois 5 ans selon le système.
                </li>
                <li className="my-2">
                  <strong className="font-medium text-fg">Notification d&apos;incident</strong> —
                  sous 15 jours en cas d&apos;incident grave.
                </li>
                <li className="my-2">
                  <strong className="font-medium text-fg">
                    Évaluation d&apos;impact sur les droits fondamentaux
                  </strong>{' '}
                  (FRIA) — obligatoire pour les acteurs publics et certains acteurs privés (article
                  27).
                </li>
              </ol>
              <p className="my-4">
                La pièce la plus complexe à produire est la{' '}
                <strong className="font-medium text-fg">section 2.f de l&apos;annexe IV</strong> :
                « informations sur les biais possibles et les actions prises pour les atténuer ».
                C&apos;est précisément ce qu&apos;AuditIQ produit.
              </p>

              <h2
                id="calendrier"
                className="mt-10 mb-4 scroll-mt-32 font-display text-[clamp(24px,2.5vw,32px)] font-medium tracking-[-0.015em] text-fg"
              >
                03 — Quel calendrier respecter ?
              </h2>
              <p className="my-4">L&apos;AI Act se déploie par phases :</p>
              <ul className="my-4 list-disc pl-6">
                <li className="my-2">
                  <strong className="font-medium text-fg">2 février 2025</strong> — pratiques
                  interdites en vigueur.
                </li>
                <li className="my-2">
                  <strong className="font-medium text-fg">2 août 2025</strong> — obligations GPAI
                  et gouvernance européenne.
                </li>
                <li className="my-2">
                  <strong className="font-medium text-fg">2 août 2026</strong> —{' '}
                  <strong className="font-medium text-fg">obligations haut risque applicables</strong>{' '}
                  (le point d&apos;attention pour les PME).
                </li>
                <li className="my-2">
                  <strong className="font-medium text-fg">2 août 2027</strong> — extension aux IA
                  intégrées dans des produits régulés (dispositifs médicaux, véhicules).
                </li>
              </ul>

              <blockquote className="my-6 border-l-2 border-accent py-3 pl-6 font-display text-xl italic leading-[1.5] text-fg">
                « Le calendrier paraît lointain. Mais une remédiation, en pratique, prend 6 à 9
                mois. Commencer en juin 2026 pour une mise en conformité en août, c&apos;est déjà
                trop tard. »
              </blockquote>

              <h2
                id="charges-de-preuve"
                className="mt-10 mb-4 scroll-mt-32 font-display text-[clamp(24px,2.5vw,32px)] font-medium tracking-[-0.015em] text-fg"
              >
                04 — Charge de la preuve : ce qui change vraiment
              </h2>
              <p className="my-4">
                L&apos;AI Act, comme le RGPD, inverse la charge de la preuve. En cas de plainte ou
                de contrôle, ce n&apos;est pas à l&apos;autorité de prouver que votre IA discrimine
                — c&apos;est à vous de prouver qu&apos;elle ne discrimine pas.
              </p>
              <p className="my-4">
                Concrètement, cela signifie qu&apos;
                <strong className="font-medium text-fg">
                  un audit fairness antérieur à un éventuel signalement est une pièce probante
                  essentielle
                </strong>
                . À l&apos;inverse, l&apos;absence d&apos;audit ne signifie pas seulement « pas de
                preuve » : elle peut être interprétée comme un manquement à l&apos;obligation de
                vigilance (article 26 § 3).
              </p>

              <h2
                id="sanctions"
                className="mt-10 mb-4 scroll-mt-32 font-display text-[clamp(24px,2.5vw,32px)] font-medium tracking-[-0.015em] text-fg"
              >
                05 — Quelles sanctions encourues ?
              </h2>
              <p className="my-4">
                Le règlement prévoit trois niveaux de sanctions, gradués selon la gravité (article
                99) :
              </p>
              <ul className="my-4 list-disc pl-6">
                <li className="my-2">
                  <strong className="font-medium text-fg">Pratiques interdites</strong> (article 5)
                  : jusqu&apos;à 35 M€ ou 7 % du CA mondial.
                </li>
                <li className="my-2">
                  <strong className="font-medium text-fg">
                    Manquements aux obligations haut risque
                  </strong>{' '}
                  (articles 8 à 27) : jusqu&apos;à 15 M€ ou 3 % du CA mondial.
                </li>
                <li className="my-2">
                  <strong className="font-medium text-fg">
                    Information inexacte ou incomplète aux autorités
                  </strong>{' '}
                  : jusqu&apos;à 7,5 M€ ou 1 % du CA mondial.
                </li>
              </ul>
              <p className="my-4">
                Pour les PME, des plafonds plus bas s&apos;appliquent : le règlement précise que les
                sanctions doivent rester proportionnées et tenir compte de la taille de
                l&apos;entreprise. La France a confié l&apos;application à la CNIL et à la DGCCRF
                (décret du 4 février 2026).
              </p>

              <h2
                id="plan-action"
                className="mt-10 mb-4 scroll-mt-32 font-display text-[clamp(24px,2.5vw,32px)] font-medium tracking-[-0.015em] text-fg"
              >
                06 — Un plan d&apos;action en six mois
              </h2>
              <p className="my-4">
                Voici une trame réaliste pour une PME qui démarre en mai 2026 et veut être
                conforme en novembre 2026 :
              </p>

              <h3 className="mt-8 mb-3 text-h3 font-display font-medium text-fg">
                Mois 1 — Cartographie
              </h3>
              <p className="my-4">
                Inventoriez tous vos systèmes d&apos;IA en production. Identifiez ceux qui tombent
                en haut risque. Désignez un responsable conformité IA (peut être le DPO).
              </p>

              <h3 className="mt-8 mb-3 text-h3 font-display font-medium text-fg">
                Mois 2 — Audit fairness initial
              </h3>
              <p className="my-4">
                Pour chaque système à haut risque, lancez un audit (Module 1, 2 ou 3 selon le
                système). Identifiez les écarts. Documentez les seuils utilisés.
              </p>

              <h3 className="mt-8 mb-3 text-h3 font-display font-medium text-fg">
                Mois 3 — Remédiation prioritaire
              </h3>
              <p className="my-4">
                Hiérarchisez les remédiations. Une PME ne peut généralement pas tout corriger
                d&apos;un coup. Concentrez-vous sur les écarts les plus significatifs, en lien avec
                votre data team ou votre fournisseur.
              </p>

              <h3 className="mt-8 mb-3 text-h3 font-display font-medium text-fg">
                Mois 4 — Documentation annexe IV
              </h3>
              <p className="my-4">
                Produisez ou complétez votre dossier technique. AuditIQ génère la section 2.f. Les
                autres sections (description du système, finalité, supervision humaine) sont à
                produire en parallèle.
              </p>

              <h3 className="mt-8 mb-3 text-h3 font-display font-medium text-fg">
                Mois 5 — Mise en production de la supervision
              </h3>
              <p className="my-4">
                Mettez en place la supervision humaine effective. Logguez les décisions.
                Définissez les seuils d&apos;alerte. Formez les équipes.
              </p>

              <h3 className="mt-8 mb-3 text-h3 font-display font-medium text-fg">
                Mois 6 — Audit de validation
              </h3>
              <p className="my-4">
                Re-lancez un audit après remédiation pour valider la conformité. Comparez les
                scores avant/après. Archivez le tout. Vous êtes conforme.
              </p>

              <hr className="my-10 border-0 border-t border-border-subtle" />

              <Callout>
                <strong className="mb-1.5 block font-medium text-fg">
                  Comment AuditIQ vous aide.
                </strong>{' '}
                Notre plateforme couvre les étapes 2, 3 (recommandations), 4 (section 2.f) et 6.
                Elle ne remplace ni votre DPO, ni votre responsable conformité, ni un cabinet
                d&apos;avocats — mais elle outille l&apos;essentiel du travail technique.{' '}
                <Link href="/contact" className="text-accent underline underline-offset-[3px]">
                  Demandez une démo
                </Link>{' '}
                pour voir l&apos;audit sur vos propres données.
              </Callout>

              <h2 className="mt-10 mb-4 font-display text-[clamp(24px,2.5vw,32px)] font-medium tracking-[-0.015em] text-fg">
                Pour aller plus loin
              </h2>
              <ul className="my-4 list-disc pl-6">
                <li className="my-2">
                  <Link href="/ai-act" className="text-accent underline underline-offset-[3px]">
                    Notre page de référence sur l&apos;AI Act
                  </Link>{' '}
                  — les articles, le calendrier, le rattachement français.
                </li>
                <li className="my-2">
                  <Link href="/pme" className="text-accent underline underline-offset-[3px]">
                    Êtes-vous concerné ?
                  </Link>{' '}
                  — la check-list de qualification haut risque en 10 questions.
                </li>
                <li className="my-2">
                  <Link
                    href="/ressources/regle-quatre-cinquiemes"
                    className="text-accent underline underline-offset-[3px]"
                  >
                    La règle des quatre cinquièmes, expliquée concrètement
                  </Link>{' '}
                  — l&apos;article pour comprendre la métrique fondamentale.
                </li>
              </ul>
            </article>

            <aside className="lg:sticky lg:top-[calc(var(--nav-h)+24px)] lg:self-start">
              <div className="rounded-xl border border-border-default bg-surface p-6">
                <Eyebrow className="mb-4 block">Au sommaire</Eyebrow>
                <ol className="flex list-none flex-col gap-1.5 pl-0 [counter-reset:toc]">
                  {TOC.map((item) => (
                    <li
                      key={item.id}
                      className="relative pl-7 [counter-increment:toc] before:absolute before:left-0 before:top-1.5 before:font-mono before:text-[11px] before:text-fg-muted before:content-[counter(toc,decimal-leading-zero)]"
                    >
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

      {/* RELATED */}
      <section className="border-t border-border-subtle py-16">
        <Container>
          <h2 className="mb-8 text-h2 font-display font-medium tracking-tight text-fg">
            À lire aussi
          </h2>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {RELATED.map((r) => (
              <Link
                key={r.title}
                href="/ressources/article"
                className="flex flex-col gap-3 rounded-lg border border-border-default bg-surface p-6 transition-colors hover:border-border-strong"
              >
                <div className="flex items-center gap-2 text-xs text-fg-muted">
                  <span className="font-mono uppercase tracking-[0.08em] text-accent">{r.cat}</span>
                  <span aria-hidden>·</span>
                  <span>{r.duration}</span>
                </div>
                <h3 className="text-h4 font-medium leading-[1.3] text-fg">{r.title}</h3>
              </Link>
            ))}
          </div>
        </Container>
      </section>

      <section className="py-16">
        <Container>
          <Reveal>
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
                  <Link href="/ressources">Voir tous les articles</Link>
                </Button>
              </div>
            </div>
          </Reveal>
        </Container>
      </section>
    </>
  );
}
