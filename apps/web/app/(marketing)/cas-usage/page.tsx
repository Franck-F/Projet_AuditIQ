import Link from 'next/link';
import type { Metadata } from 'next';
import { Container } from '@/components/layout/Container';
import { Reveal } from '@/components/layout/Reveal';
import { Button } from '@/components/ui/button';
import { Eyebrow } from '@/components/marketing/Eyebrow';
import { StatusPill } from '@/components/marketing/StatusPill';
import { AnchorNav } from '@/components/marketing/AnchorNav';

export const metadata: Metadata = {
  title: "Cas d'usage",
  description:
    "Cas d'usage AuditIQ : RH et recrutement, scoring crédit, finance, chatbot SAV, scoring marketing, service client.",
};

/* ============================================================================
   Page-local components
   ============================================================================ */

function StoryBlock({ title, body }: { title: string; body: React.ReactNode }) {
  return (
    <div>
      <h4 className="mb-1.5 text-h4 font-medium text-fg">{title}</h4>
      <p className="text-sm leading-relaxed text-fg-secondary">{body}</p>
    </div>
  );
}

function MetricRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'pass' | 'warn' | 'fail';
}) {
  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-3 border-b border-border-subtle py-3 last:border-b-0">
      <span className="text-sm text-fg">{label}</span>
      <StatusPill tone={tone}>{value}</StatusPill>
    </div>
  );
}

function ScenarioCard({
  name,
  org,
  pill,
  what,
  children,
  disclaimer,
}: {
  name: string;
  org: string;
  pill: React.ReactNode;
  what?: string;
  children: React.ReactNode;
  disclaimer: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border-default bg-surface p-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-h4 font-medium text-fg">{name}</div>
          <div className="text-xs text-fg-muted">{org}</div>
        </div>
        {pill}
      </div>
      {what && (
        <div className="rounded-lg bg-surface-2 px-4 py-3 text-sm leading-relaxed text-fg-secondary">
          {what}
        </div>
      )}
      {children}
      <div className="rounded-md border border-status-info-border bg-status-info-bg p-4 text-xs leading-relaxed text-fg-secondary">
        {disclaimer}
      </div>
    </div>
  );
}

function AxisMini({
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
  const borderHl = tone === 'fail' ? 'border-status-fail-border' : 'border-border-default';
  return (
    <div className={`rounded-md border ${borderHl} bg-surface-2 p-3`}>
      <Eyebrow>{axis}</Eyebrow>
      <div className={`mt-1 font-mono text-[18px] tabular-nums ${tone === 'fail' ? 'text-status-fail' : 'text-fg'}`}>
        {score} / 5
      </div>
      <div className={`text-xs ${labelColor[tone]}`}>{label}</div>
    </div>
  );
}

function UseCard({
  sector,
  title,
  body,
  module,
  id,
}: {
  sector: string;
  title: string;
  body: string;
  module: string;
  id?: string;
}) {
  return (
    <div
      id={id}
      className="flex flex-col gap-2.5 rounded-xl border border-border-default bg-surface p-6 scroll-mt-32"
    >
      <span className="font-mono text-xs uppercase tracking-[0.12em] text-accent">{sector}</span>
      <h4 className="text-h4 font-medium text-fg">{title}</h4>
      <p className="text-sm leading-relaxed text-fg-secondary">{body}</p>
      <div className="mt-auto border-t border-border-subtle pt-3 text-xs text-fg-muted">
        {module}
      </div>
    </div>
  );
}

const ANCHORS = [
  { href: '#rh', label: 'RH & recrutement' },
  { href: '#credit', label: 'Crédit & scoring' },
  { href: '#chatbot', label: 'Chatbot SAV' },
  { href: '#assurance', label: 'Assurance' },
  { href: '#marketing', label: 'Marketing & ciblage' },
  { href: '#service', label: 'Service client' },
];

/* ============================================================================
   Page
   ============================================================================ */

export default function CasUsagePage() {
  return (
    <>
      <header className="border-b border-border-subtle pt-[clamp(64px,8vw,96px)] pb-12">
        <Container>
          <Reveal>
            <Eyebrow accent>Cas d&apos;usage</Eyebrow>
            <h1 className="mt-4 max-w-[22ch] font-display text-[clamp(36px,4vw,48px)] font-semibold leading-[1.1] tracking-[-0.02em] text-fg">
              Six scénarios concrets, six fois où la fairness compte.
            </h1>
            <p className="mt-5 max-w-[60ch] text-[clamp(18px,1.3vw,20px)] leading-relaxed text-fg-secondary">
              AuditIQ a été conçu pour les IA réellement déployées en PME : scoring CV, scoring
              crédit, chatbot SAV, scoring d&apos;assurance, ciblage marketing, triage service
              client. Voici comment ça se passe en pratique, dossier par dossier.
            </p>
          </Reveal>
        </Container>
      </header>

      <AnchorNav items={ANCHORS} />

      {/* RH */}
      <section id="rh" className="py-20 scroll-mt-32">
        <Container>
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-16">
            <Reveal>
              <span className="font-mono text-xs uppercase tracking-[0.12em] text-accent">
                Ressources humaines
              </span>
              <h2 className="mt-3 mb-4 text-[clamp(28px,3.5vw,36px)] font-display font-medium tracking-[-0.02em] text-fg">
                IA de tri de CV en PME du conseil.
              </h2>
              <p className="mb-6 text-h4 leading-relaxed text-fg-secondary">
                Cabinet Tessier &amp; Associés — 180 collaborateurs, recrute 60 personnes/an avec
                un outil IA de présélection.
              </p>
              <div className="flex flex-col gap-5">
                <StoryBlock
                  title="Le contexte"
                  body={
                    <>
                      Depuis 18 mois, Claire Tessier utilise un outil de présélection automatique
                      des CV intégré à son ATS. Le système score chaque candidature ; les 20 % les
                      mieux scorés passent en entretien. Personne, en interne, n&apos;a la capacité
                      technique de vérifier les biais éventuels.
                    </>
                  }
                />
                <StoryBlock
                  title="L'audit AuditIQ"
                  body={
                    <>
                      Module 1 (supervisé). Variable cible :{' '}
                      <code className="font-mono text-[0.9em] text-accent">short_listed</code>.
                      Attribut sensible : genre déduit du prénom + revalidation manuelle. 412
                      candidatures sur 2024 analysées. Calcul des 4 métriques fairness canoniques.
                    </>
                  }
                />
                <StoryBlock
                  title="Le résultat"
                  body={
                    <>
                      Demographic Parity à 0,78 — sous le seuil de 0,80. L&apos;écart de
                      présélection entre profils Hommes et Femmes est de 12 points. Equal
                      Opportunity à 0,92 : le modèle ne pénalise pas les profils qualifiés, mais
                      sur-sélectionne les profils Hommes en amont. Recommandation AuditIQ : revoir
                      le poids du critère « expérience continue » dans le scoring.
                    </>
                  }
                />
              </div>
            </Reveal>

            <Reveal delay={0.08}>
              <ScenarioCard
                name="Recrutement_2024.csv"
                org="Tessier & Associés · audit du 14 mars 2026"
                pill={<StatusPill tone="warn">Score 3/5</StatusPill>}
                what="412 candidatures · variable cible : short_listed · attribut : genre · 4 métriques"
                disclaimer={
                  <>
                    <strong className="font-medium text-fg">Recommandation prioritaire.</strong>{' '}
                    Revoir le poids du critère « expérience continue » dans le modèle de scoring.
                    Ce critère pénalise mécaniquement les profils ayant pris un congé parental.
                  </>
                }
              >
                <div>
                  <MetricRow label="Demographic Parity" value="0.78" tone="warn" />
                  <MetricRow label="Equal Opportunity" value="0.92" tone="pass" />
                  <MetricRow label="Equalized Odds" value="0.81" tone="warn" />
                  <MetricRow label="Règle 4/5" value="0.73" tone="fail" />
                </div>
              </ScenarioCard>
            </Reveal>
          </div>
        </Container>
      </section>

      {/* CRÉDIT */}
      <section id="credit" className="border-t border-border-subtle py-20 scroll-mt-32">
        <Container>
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-16">
            <Reveal className="order-1 lg:order-2">
              <span className="font-mono text-xs uppercase tracking-[0.12em] text-accent">
                Crédit &amp; scoring
              </span>
              <h2 className="mt-3 mb-4 text-[clamp(28px,3.5vw,36px)] font-display font-medium tracking-[-0.02em] text-fg">
                Modèle de scoring crédit en banque régionale.
              </h2>
              <p className="mb-6 text-h4 leading-relaxed text-fg-secondary">
                Banque Loiret — 420 collaborateurs, 38 000 demandes de crédit par an, modèle de
                scoring entraîné en interne.
              </p>
              <div className="flex flex-col gap-5">
                <StoryBlock
                  title="Le contexte"
                  body="Romain Mathys, responsable conformité, doit produire avant juillet 2026 une preuve de fairness sur le modèle de scoring crédit auto-déployé. Le modèle a été entraîné il y a deux ans sur des données historiques internes, sans audit préalable."
                />
                <StoryBlock
                  title="L'audit AuditIQ"
                  body="Module 2 (non supervisé) + Module 1 (supervisé). Clustering du jeu d'entraînement pour détecter d'éventuels proxies, puis audit complet de la fonction de décision. 2 840 demandes Q3 2025 analysées."
                />
                <StoryBlock
                  title="Le résultat"
                  body="Cluster C4 détecté avec sur-représentation de refus (60 % des refus pour 18 % de l'échantillon). Feature dominante : code postal. Information mutuelle avec origine présumée : 0,82. Le code postal agit comme proxy. Module 1 confirme : Demographic Parity à 0,71 sur l'axe origine présumée."
                />
              </div>
            </Reveal>

            <Reveal delay={0.08} className="order-2 lg:order-1">
              <ScenarioCard
                name="Demandes_credit_Q3.csv"
                org="Banque Loiret · audit du 22 mars 2026"
                pill={<StatusPill tone="fail">Score 1/5</StatusPill>}
                what="2 840 demandes · clustering DBSCAN · 4 clusters · proxy détecté"
                disclaimer={
                  <>
                    <strong className="font-medium text-fg">Article AI Act 10 § 2.f.</strong>{' '}
                    Risque élevé. Une remédiation est nécessaire avant la date de mise en
                    application (août 2026).
                  </>
                }
              >
                <div className="rounded-lg border border-border-default bg-surface-2 p-4">
                  <Eyebrow>Cluster déviant C4</Eyebrow>
                  <h4 className="mt-1.5 text-[15px] font-medium text-fg">
                    60 % des refus pour 18 % de l&apos;échantillon
                  </h4>
                  <p className="mt-2 text-sm leading-relaxed text-fg-secondary">
                    Feature dominante : code postal (information mutuelle = 0,82 avec origine
                    présumée).
                  </p>
                </div>
                <div>
                  <MetricRow label="Demographic Parity (origine)" value="0.71" tone="fail" />
                  <MetricRow label="Règle 4/5" value="0.69" tone="fail" />
                </div>
              </ScenarioCard>
            </Reveal>
          </div>
        </Container>
      </section>

      {/* CHATBOT */}
      <section id="chatbot" className="border-t border-border-subtle py-20 scroll-mt-32">
        <Container>
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-16">
            <Reveal>
              <span className="font-mono text-xs uppercase tracking-[0.12em] text-accent">
                Chatbot service client
              </span>
              <h2 className="mt-3 mb-4 text-[clamp(28px,3.5vw,36px)] font-display font-medium tracking-[-0.02em] text-fg">
                Assistant LLM pour le SAV.
              </h2>
              <p className="mb-6 text-h4 leading-relaxed text-fg-secondary">
                Mathys SA — équipement industriel, 240 collaborateurs, chatbot Mistral-7B
                fine-tuné déployé sur le portail client B2B.
              </p>
              <div className="flex flex-col gap-5">
                <StoryBlock
                  title="Le contexte"
                  body="Le chatbot répond à 12 000 sollicitations/mois sur le portail. Une plainte client interne a signalé un traitement « plus court et moins pédagogique » selon le type d'interlocuteur. L'équipe veut documenter et corriger."
                />
                <StoryBlock
                  title="L'audit AuditIQ"
                  body="Module 3 (LLM). 412 prompts pairs sur six axes. Métriques par axe : longueur, sentiment, taux de refus. Test mené en condition de production, sans modification de l'endpoint."
                />
                <StoryBlock
                  title="Le résultat"
                  body={
                    <>
                      Score global 3,2/5. Axe handicap : 2,1/5 — écarts significatifs. Le chatbot
                      redirige plus fréquemment vers un « service spécialisé » lorsque le prompt
                      évoque un handicap, sans fournir la réponse directe. Recommandation : revoir
                      l&apos;instruction système et les exemples de fine-tuning.
                    </>
                  }
                />
              </div>
            </Reveal>

            <Reveal delay={0.08}>
              <ScenarioCard
                name="Chatbot SAV · Mistral-7B"
                org="Mathys SA · audit du 8 avril 2026"
                pill={<StatusPill tone="warn">Score 3.2/5</StatusPill>}
                disclaimer={
                  <>
                    <strong className="font-medium text-fg">Extrait significatif.</strong> Profil A
                    (handicap non mentionné) : 142 mots, ton informatif. Profil B (handicap
                    mentionné) : 38 mots, redirection systématique.
                  </>
                }
              >
                <div className="grid grid-cols-2 gap-2">
                  <AxisMini axis="Genre" score="4,1" label="Faibles écarts" tone="pass" />
                  <AxisMini axis="Origine" score="2,8" label="Écarts modérés" tone="warn" />
                  <AxisMini axis="Âge" score="3,5" label="Acceptable" tone="warn" />
                  <AxisMini axis="Handicap" score="2,1" label="Écarts significatifs" tone="fail" />
                </div>
              </ScenarioCard>
            </Reveal>
          </div>
        </Container>
      </section>

      {/* AUTRES CAS */}
      <section className="border-t border-border-subtle bg-surface py-24">
        <Container>
          <Reveal className="mb-12 max-w-[760px]">
            <Eyebrow accent>Autres cas d&apos;usage</Eyebrow>
            <h2 className="mt-3 text-h2 font-display font-medium tracking-tight text-fg">
              AuditIQ s&apos;adapte à toutes vos IA productives.
            </h2>
            <p className="mt-4 text-h4 leading-relaxed text-fg-secondary">
              Trois exemples complémentaires de mise en œuvre, sur des cas vus chez nos clients
              pilotes.
            </p>
          </Reveal>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <UseCard
              id="assurance"
              sector="Assurance"
              title="Tarification d'assurance auto"
              body="Modèle de tarification ML utilisé par une mutuelle régionale. Audit Module 1 sur l'attribut âge, avec décomposition par tranches de 5 ans. Détection d'une sur-tarification non justifiée sur la tranche 18-22 ans."
              module="Module 01 · Audit supervisé"
            />
            <UseCard
              id="marketing"
              sector="Marketing"
              title="Ciblage publicitaire B2C"
              body="Algorithme de scoring d'appétence pour une e-commerce mode. Audit Module 2 pour détecter d'éventuels proxies de genre dans les features comportementales (URL parsing, schéma de navigation, panier moyen)."
              module="Module 02 · Non supervisé"
            />
            <UseCard
              id="service"
              sector="Service client"
              title="Routage automatique de tickets"
              body="IA de classification de tickets entre niveau 1, 2 et 3 chez un éditeur SaaS. Audit Module 1 sur la cible « niveau de priorité » avec attributs sensibles déduits du contenu textuel — détection d'un sous-traitement systématique."
              module="Module 01 · Audit supervisé"
            />
            <UseCard
              sector="Santé"
              title="Triage de patients en téléconsultation"
              body="Système de triage symptômes-vers-urgence d'une plateforme de téléconsultation. Audit Module 3 avec banque de prompts médicaux personnalisée, sur les axes genre et origine."
              module="Module 03 · LLM"
            />
            <UseCard
              sector="RH"
              title="IA d'évaluation annuelle"
              body="Outil de synthèse automatique d'évaluation d'objectifs annuels chez un éditeur SaaS. Audit Module 3 sur les commentaires générés, axes genre et âge."
              module="Module 03 · LLM"
            />
            <UseCard
              sector="Logistique"
              title="Modèle de churn client B2B"
              body="Prédiction de churn pour une PME logistique B2B. Audit Module 2 sur le dataset CRM, recherche de clusters déviants sur la taille d'entreprise et le secteur."
              module="Module 02 · Non supervisé"
            />
          </div>
        </Container>
      </section>

      {/* CTA */}
      <section className="py-16">
        <Container>
          <Reveal>
            <div className="grid grid-cols-1 items-center gap-8 rounded-2xl border border-border-default bg-surface p-[clamp(40px,6vw,64px)] lg:grid-cols-[1fr_auto]">
              <div>
                <Eyebrow accent>Votre cas d&apos;usage</Eyebrow>
                <h2 className="mt-3 text-h2 font-display font-medium tracking-tight text-fg">
                  Et le vôtre, on en parle ?
                </h2>
                <p className="mt-3 max-w-[56ch] text-fg-secondary">
                  Demandez une démo. On configure ensemble un audit pilote sur l&apos;une de vos
                  IA productives.
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <Button asChild variant="primary" size="lg">
                  <Link href="/contact">Réserver une démo</Link>
                </Button>
                <Button asChild variant="secondary">
                  <Link href="/temoignages">Lire les études de cas</Link>
                </Button>
              </div>
            </div>
          </Reveal>
        </Container>
      </section>
    </>
  );
}
