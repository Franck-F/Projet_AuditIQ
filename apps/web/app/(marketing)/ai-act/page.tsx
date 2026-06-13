import Link from 'next/link';
import type { Metadata } from 'next';
import { Container } from '@/components/layout/Container';
import { Reveal } from '@/components/layout/Reveal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eyebrow } from '@/components/marketing/Eyebrow';
import { FinalCta } from '@/components/marketing/FinalCta';
import { StatusPill } from '@/components/marketing/StatusPill';

export const metadata: Metadata = {
  title: 'AI Act & conformité',
  description:
    "Comment AuditIQ vous aide à respecter les obligations de l'AI Act (UE 2024/1689) et du droit français applicable aux systèmes d'IA.",
};

/* ============================================================================
   Page-local components
   ============================================================================ */

function CalendarRow({
  date,
  sub,
  title,
  body,
}: {
  date: string;
  sub: string;
  title: string;
  body: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 gap-2 border-b border-border-subtle py-5 first:pt-0 last:border-b-0 last:pb-0 md:grid-cols-[180px_1fr] md:gap-6">
      <div>
        <div className="font-mono text-sm font-medium uppercase tracking-[0.04em] text-accent">
          {date}
        </div>
        <div className="mt-1 text-xs text-fg-muted">{sub}</div>
      </div>
      <div>
        <h4 className="mb-1.5 text-h4 font-medium text-fg">{title}</h4>
        <p className="text-sm leading-relaxed text-fg-secondary">{body}</p>
      </div>
    </div>
  );
}

function RiskCard({
  level,
  tone,
  title,
  body,
  bullets,
}: {
  level: string;
  tone: 'fail' | 'warn' | 'info' | 'pass';
  title: string;
  body: React.ReactNode;
  bullets: string[];
}) {
  const top: Record<typeof tone, string> = {
    fail: 'border-t-[3px] border-t-status-fail',
    warn: 'border-t-[3px] border-t-status-warn',
    info: 'border-t-[3px] border-t-status-info',
    pass: 'border-t-[3px] border-t-status-pass',
  };
  const levelColor: Record<typeof tone, string> = {
    fail: 'text-status-fail',
    warn: 'text-status-warn',
    info: 'text-status-info',
    pass: 'text-status-pass',
  };
  return (
    <div className={`rounded-xl border border-border-default bg-surface p-6 ${top[tone]}`}>
      <div
        className={`mb-2 font-mono text-xs uppercase tracking-[0.12em] ${levelColor[tone]}`}
      >
        {level}
      </div>
      <h4 className="mb-3 text-h4 font-medium text-fg">{title}</h4>
      <p className="text-sm leading-relaxed text-fg-secondary">{body}</p>
      <ul className="mt-3 flex flex-col gap-1.5 text-xs text-fg-muted">
        {bullets.map((b) => (
          <li key={b}>· {b}</li>
        ))}
      </ul>
    </div>
  );
}

function ArticleDetail({
  num,
  title,
  quote,
  body,
  role,
}: {
  num: string;
  title: string;
  quote: string;
  body: string;
  role: string;
}) {
  return (
    <article className="grid grid-cols-1 gap-6 rounded-xl border border-border-default bg-surface p-8 md:grid-cols-[140px_1fr] md:gap-8">
      <div className="self-start rounded-md border border-accent-border bg-accent-soft px-4 py-3 text-center font-mono text-base tracking-[0.04em] text-accent">
        {num}
      </div>
      <div>
        <h3 className="mb-3 text-h3 font-display font-medium tracking-[-0.015em] text-fg">
          {title}
        </h3>
        <blockquote className="my-4 border-l-2 border-accent pl-4 font-display text-h4 italic leading-[1.5]">
          « {quote} »
        </blockquote>
        <p className="mt-3 text-sm leading-relaxed text-fg-secondary">{body}</p>
        <div className="mt-4 grid grid-cols-[auto_1fr] items-start gap-3 rounded-md bg-surface-2 px-4 py-3.5">
          <span className="pt-0.5 font-mono text-xs uppercase tracking-[0.08em] text-accent">
            AUDITIQ
          </span>
          <div className="text-sm leading-relaxed text-fg-secondary">{role}</div>
        </div>
      </div>
    </article>
  );
}

function LawCard({
  title,
  badge,
  body,
}: {
  title: string;
  badge: string;
  body: string;
}) {
  return (
    <div className="rounded-xl border border-border-default bg-surface-2 p-5">
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-[15px] font-medium text-fg">{title}</h4>
        <Badge variant="mono">{badge}</Badge>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-fg-secondary">{body}</p>
    </div>
  );
}

/* ============================================================================
   Page
   ============================================================================ */

export default function AiActPage() {
  return (
    <>
      <header className="border-b border-border-subtle pt-[clamp(64px,8vw,96px)] pb-12">
        <Container>
          <Reveal>
            <StatusPill tone="info">
              Règlement (UE) 2024/1689 — applicable août 2026
            </StatusPill>
            <h1 className="mt-6 max-w-[22ch] font-display text-[clamp(36px,4vw,48px)] font-semibold leading-[1.1] tracking-[-0.02em] text-fg">
              L&apos;AI Act, traduit en obligations concrètes pour votre PME.
            </h1>
            <p className="mt-5 max-w-[60ch] text-[clamp(18px,1.3vw,20px)] leading-relaxed text-fg-secondary">
              Le règlement européen sur l&apos;intelligence artificielle est entré en vigueur le
              1ᵉʳ août 2024 et déploie ses obligations par paliers jusqu&apos;en août 2027. Voici
              ce que cela signifie pour vous, et ce que AuditIQ vous aide à produire — sans
              jargon, sans promesse de certification qu&apos;il ne nous appartient pas de délivrer.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild variant="primary">
                <Link href="/contact">Demander une démo</Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href="/ressources/guide-ai-act">Lire le guide complet (PDF)</Link>
              </Button>
            </div>
          </Reveal>
        </Container>
      </header>

      {/* TIMELINE */}
      <section className="py-16">
        <Container>
          <Reveal className="mb-12 max-w-[720px]">
            <Eyebrow accent>Calendrier d&apos;application</Eyebrow>
            <h2 className="mt-3 text-h2 font-display font-medium tracking-tight text-fg">
              Ce qui s&apos;applique, et quand.
            </h2>
            <p className="mt-4 text-h4 leading-relaxed text-fg-secondary">
              Les obligations qui vous concernent en premier — sans inventaire complet, juste ce
              qui change concrètement pour une PME utilisant des systèmes d&apos;IA.
            </p>
          </Reveal>

          <Reveal delay={0.05}>
            <div className="rounded-2xl border border-border-default bg-surface p-8">
              <CalendarRow
                date="FÉVRIER 2025"
                sub="Phase 1 — déjà en vigueur"
                title="Interdiction des pratiques inacceptables"
                body="Notation sociale par autorité publique, exploitation de vulnérabilités, manipulation subliminale, identification biométrique à distance en temps réel dans l'espace public (avec exceptions). Concerne tous les opérateurs, immédiatement."
              />
              <CalendarRow
                date="AOÛT 2025"
                sub="Phase 2 — gouvernance"
                title="Modèles GPAI & gouvernance"
                body="Obligations applicables aux modèles d'IA à usage général. Mise en place des autorités nationales (en France : CNIL et DGCCRF en chef de file). Codes de conduite encouragés."
              />
              <CalendarRow
                date="AOÛT 2026"
                sub="Phase 3 — haut risque"
                title="Systèmes d'IA à haut risque"
                body={
                  <>
                    <strong className="font-medium text-fg">
                      C&apos;est ici que votre PME peut être concernée.
                    </strong>{' '}
                    Tri de CV, scoring crédit, scoring d&apos;assurance, tarification, services
                    essentiels (énergie, eau, transport), justice. Documentation Annexe IV,
                    gouvernance des données, traçabilité, supervision humaine, transparence,
                    performance désagrégée.
                  </>
                }
              />
              <CalendarRow
                date="AOÛT 2027"
                sub="Phase 4 — IA intégrées"
                title="Systèmes d'IA intégrés à des produits régulés"
                body="Application étendue aux IA intégrées dans des dispositifs médicaux, véhicules, équipements régulés. Phase de mise en cohérence des régulations sectorielles."
              />
            </div>
          </Reveal>
        </Container>
      </section>

      {/* RISK LEVELS */}
      <section className="py-24">
        <Container>
          <Reveal className="mb-12 max-w-[720px]">
            <Eyebrow accent>Niveaux de risque</Eyebrow>
            <h2 className="mt-3 text-h2 font-display font-medium tracking-tight text-fg">
              Quatre catégories. Une seule vous concerne probablement.
            </h2>
            <p className="mt-4 text-h4 leading-relaxed text-fg-secondary">
              L&apos;AI Act applique une approche par les risques. Plus l&apos;usage est sensible,
              plus les obligations sont nombreuses. Pour une PME, le périmètre « haut risque » est
              le seul qui exige une attention immédiate.
            </p>
          </Reveal>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Reveal>
              <RiskCard
                level="Inacceptable"
                tone="fail"
                title="Pratiques interdites"
                body="Notation sociale, manipulation subliminale, exploitation de vulnérabilités, certaines biométries publiques."
                bullets={['Application : février 2025', 'Obligation : abstention']}
              />
            </Reveal>
            <Reveal delay={0.05}>
              <RiskCard
                level="Haut risque"
                tone="warn"
                title="Systèmes à fort impact"
                body={
                  <>
                    RH, crédit, scoring, services essentiels, éducation, justice, biométrie ID.{' '}
                    <strong className="font-medium text-fg">Périmètre AuditIQ.</strong>
                  </>
                }
                bullets={['Application : août 2026', 'Obligation : conformité documentée (Annexe IV)']}
              />
            </Reveal>
            <Reveal delay={0.1}>
              <RiskCard
                level="Risque limité"
                tone="info"
                title="Transparence requise"
                body="Chatbots, deepfakes, IA générant du contenu — obligation d'informer l'utilisateur de l'interaction avec une IA."
                bullets={['Application : août 2026', 'Obligation : transparence']}
              />
            </Reveal>
            <Reveal delay={0.15}>
              <RiskCard
                level="Risque minimal"
                tone="pass"
                title="IA générales sans impact"
                body="Filtres spam, IA de recommandation interne, jeux. Aucune obligation spécifique — bonnes pratiques encouragées."
                bullets={['Application : N/A', 'Obligation : aucune']}
              />
            </Reveal>
          </div>
        </Container>
      </section>

      {/* ARTICLES DETAIL */}
      <section className="bg-surface py-24">
        <Container>
          <Reveal className="mb-12 max-w-[720px]">
            <Eyebrow accent>Articles couverts par AuditIQ</Eyebrow>
            <h2 className="mt-3 text-h2 font-display font-medium tracking-tight text-fg">
              Quatre articles, quatre obligations, quatre livrables.
            </h2>
            <p className="mt-4 text-h4 leading-relaxed text-fg-secondary">
              Pour chaque article applicable à votre système d&apos;IA à haut risque, AuditIQ
              documente et produit la preuve.
            </p>
          </Reveal>

          <div className="flex flex-col gap-4">
            <Reveal>
              <ArticleDetail
                num="Art. 10"
                title="Gouvernance des données"
                quote="Les jeux de données d'entraînement, de validation et d'essai sont soumis à des pratiques de gouvernance et de gestion des données appropriées […] notamment des examens visant à identifier d'éventuels biais."
                body="Obligation : documenter les biais possibles dans les données utilisées pour entraîner, valider et tester votre système. AuditIQ exécute ces examens via les Modules 1 et 2, et archive la trace dans un format opposable."
                role="Modules 01 et 02 — calcul automatique des écarts par groupe et signalement des proxies. Rapport Excel structuré selon Annexe IV § 2.f."
              />
            </Reveal>
            <Reveal delay={0.05}>
              <ArticleDetail
                num="Art. 13"
                title="Transparence et information"
                quote="Les systèmes d'IA à haut risque sont conçus et développés de manière à garantir que leur fonctionnement est suffisamment transparent pour permettre aux déployeurs d'interpréter les sorties du système."
                body="Obligation : fournir une notice d'utilisation détaillant les performances par sous-groupe et les limites connues. AuditIQ produit la section « performance désagrégée » de cette notice."
                role="Tous modules — décomposition par groupe et sous-groupe, intervalles de confiance, mention des limites identifiées dans le rapport."
              />
            </Reveal>
            <Reveal delay={0.1}>
              <ArticleDetail
                num="Art. 15"
                title="Exactitude, robustesse et cybersécurité"
                quote="Les systèmes d'IA à haut risque atteignent un niveau approprié d'exactitude, de robustesse et de cybersécurité, et fonctionnent de manière constante à cet égard tout au long de leur cycle de vie."
                body="Obligation : mesurer la performance du système et la suivre dans le temps. Les biais font partie des dimensions de performance à surveiller. AuditIQ archive les audits et permet la comparaison longitudinale."
                role="Historique 5 ans · comparaison entre audits · alertes en cas de dérive entre deux audits consécutifs."
              />
            </Reveal>
            <Reveal delay={0.15}>
              <ArticleDetail
                num="Annexe IV"
                title="Documentation technique"
                quote="Description générale du système d'IA […] mesures appropriées de surveillance, de fonctionnement et de contrôle, et notamment les outils, les méthodes et les techniques utilisés à cet effet."
                body="Obligation : tenir à jour une documentation technique exhaustive de votre système d'IA. AuditIQ génère la section relative aux audits fairness, prête à intégrer dans votre dossier technique global."
                role="Export Excel structuré selon les 9 rubriques d'Annexe IV, signé numériquement et horodaté."
              />
            </Reveal>
          </div>
        </Container>
      </section>

      {/* FRENCH LAW */}
      <section className="py-24">
        <Container>
          <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-2 lg:gap-12">
            <Reveal>
              <Eyebrow accent>Droit français applicable</Eyebrow>
              <h2 className="mt-3 mb-4 text-h2 font-display font-medium tracking-[-0.015em] text-fg">
                L&apos;AI Act ne remplace pas le droit français — il s&apos;y ajoute.
              </h2>
              <p className="text-base leading-relaxed text-fg-secondary">
                Les obligations européennes se superposent à un corpus français déjà robuste.
                AuditIQ rattache chaque écart détecté aux textes français pertinents, en plus de
                l&apos;article AI Act concerné.
              </p>
            </Reveal>
            <Reveal delay={0.08}>
              <div className="flex flex-col gap-3">
                <LawCard
                  title="Code du travail · Art. L.1132-1"
                  badge="Recrutement"
                  body="Interdiction de discrimination dans l'embauche et la gestion de carrière, sur 25 critères protégés (genre, origine, âge, handicap…)."
                />
                <LawCard
                  title="Code pénal · Art. 225-1"
                  badge="Pénal"
                  body="Définit la discrimination directe et indirecte. Sanctions pouvant aller jusqu'à 3 ans d'emprisonnement et 45 000 € d'amende."
                />
                <LawCard
                  title="Loi Informatique & Libertés · Art. 22 RGPD"
                  badge="Données"
                  body="Droit de ne pas faire l'objet d'une décision entièrement automatisée produisant des effets juridiques. Cadre la légitimité des décisions IA."
                />
              </div>
            </Reveal>
          </div>
        </Container>
      </section>

      {/* DISCLAIMER */}
      <section className="py-16">
        <Container>
          <Reveal>
            <div className="rounded-2xl border border-border-default bg-surface p-8 sm:p-12">
              <Eyebrow accent>Ce que AuditIQ n&apos;est pas</Eyebrow>
              <h2 className="mt-3 mb-6 text-h3 font-display font-medium tracking-[-0.015em] text-fg">
                AuditIQ outille votre conformité. Il ne la délivre pas.
              </h2>
              <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                <div>
                  <h4 className="mb-3 text-[15px] font-medium text-fg">Nous ne sommes pas</h4>
                  <ul className="flex flex-col gap-2 text-sm leading-relaxed text-fg-secondary">
                    <li>— Un organisme notifié au sens de l&apos;article 43</li>
                    <li>— Un cabinet de conseil juridique</li>
                    <li>— Un certificateur reconnu par les autorités</li>
                    <li>— Un substitut à votre DPO ou responsable conformité</li>
                  </ul>
                </div>
                <div>
                  <h4 className="mb-3 text-[15px] font-medium text-fg">Nous sommes</h4>
                  <ul className="flex flex-col gap-2 text-sm leading-relaxed text-fg-secondary">
                    <li>+ Un outil d&apos;audit technique de la fairness</li>
                    <li>+ Une plateforme de documentation opposable</li>
                    <li>+ Un support de dialogue avec vos auditeurs</li>
                    <li>+ Un accélérateur pour vos équipes conformité</li>
                  </ul>
                </div>
              </div>
              <div className="mt-6 rounded-md border border-status-info-border bg-status-info-bg p-5 text-sm leading-relaxed text-fg-secondary">
                <strong className="font-medium text-fg">Disclaimer juridique.</strong> AuditIQ
                produit une analyse documentée des écarts mesurés et propose un rattachement aux
                textes applicables. La qualification réglementaire finale, la décision de
                remédiation et l&apos;éventuelle déclaration à une autorité relèvent de votre
                organisation. AuditIQ n&apos;est pas un certificat de conformité au sens du
                règlement (UE) 2024/1689.
              </div>
            </div>
          </Reveal>
        </Container>
      </section>

      <FinalCta
        eyebrow="Prochaine étape"
        title="Évaluons votre exposition AI Act ensemble."
        body="Démo de 30 minutes : on identifie votre périmètre haut risque et on lance un audit pilote."
        primary={{ label: 'Réserver une démo', href: '/contact' }}
        secondary={{ label: 'Lire les guides', href: '/ressources' }}
      />
    </>
  );
}
