import type { Metadata } from 'next';
import { Container } from '@/components/layout/Container';
import { Reveal } from '@/components/layout/Reveal';
import { Eyebrow } from '@/components/marketing/Eyebrow';
import { FinalCta } from '@/components/marketing/FinalCta';

export const metadata: Metadata = {
  title: 'Scénarios illustratifs',
  description:
    "Scénarios illustratifs d'audits de fairness avec AuditIQ — RH, banque, industrie, santé. Cas fictifs construits à des fins pédagogiques.",
};

/* ============================================================================
   Page-local components
   ============================================================================ */

function CaseStat({
  label,
  value,
  tone = 'accent',
}: {
  label: string;
  value: string;
  tone?: 'accent' | 'fail';
}) {
  return (
    <div className="rounded-lg border border-border-default bg-surface-2 p-3.5">
      <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.12em] text-fg-muted">
        {label}
      </div>
      <div
        className={`font-display text-[22px] font-semibold tracking-[-0.015em] ${tone === 'fail' ? 'text-status-fail' : 'text-accent'}`}
      >
        {value}
      </div>
    </div>
  );
}

function StoryBlock({ title, body }: { title: string; body: string }) {
  return (
    <div className="mb-5 last:mb-0">
      <h4 className="mb-2 text-h4 font-medium text-fg">{title}</h4>
      <p className="text-sm leading-relaxed text-fg-secondary">{body}</p>
    </div>
  );
}

function QuoteCard({
  quote,
  initials,
  name,
  role,
}: {
  quote: string;
  initials: string;
  name: string;
  role: string;
}) {
  return (
    <div className="flex flex-col gap-6 rounded-2xl border border-border-default bg-surface p-10">
      <blockquote className="font-display text-[clamp(20px,2vw,24px)] italic leading-[1.4] tracking-[-0.015em] text-fg">
        « {quote} »
      </blockquote>
      <div className="flex items-center gap-3 border-t border-border-subtle pt-6">
        <div
          aria-hidden
          className="flex size-12 items-center justify-center rounded-full border border-border-default bg-surface-3 font-display text-base text-fg-secondary"
        >
          {initials}
        </div>
        <div>
          <div className="text-sm font-medium text-fg">{name}</div>
          <div className="text-xs text-fg-muted">{role}</div>
        </div>
      </div>
    </div>
  );
}

function CompactQuote({
  quote,
  initials,
  name,
  role,
}: {
  quote: string;
  initials: string;
  name: string;
  role: string;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border-default bg-surface p-6">
      <blockquote className="text-[15px] leading-[1.5] text-fg-secondary">« {quote} »</blockquote>
      <div className="flex items-center gap-2.5">
        <div
          aria-hidden
          className="flex size-8 items-center justify-center rounded-full border border-border-default bg-surface-3 text-xs text-fg-secondary"
        >
          {initials}
        </div>
        <div>
          <div className="text-sm font-medium text-fg">{name}</div>
          <div className="text-xs text-fg-muted">{role}</div>
        </div>
      </div>
    </div>
  );
}

export default function TemoignagesPage() {
  return (
    <>
      <header className="border-b border-border-subtle pt-[clamp(64px,8vw,96px)] pb-12">
        <Container>
          <Reveal>
            <Eyebrow accent>Scénarios illustratifs</Eyebrow>
            <h1 className="mt-4 max-w-[22ch] font-display text-[clamp(36px,4vw,48px)] font-semibold leading-[1.1] tracking-[-0.02em] text-fg">
              Six scénarios illustratifs d&apos;audit de fairness.
            </h1>
            <p className="mt-5 max-w-[60ch] text-[clamp(18px,1.3vw,20px)] leading-relaxed text-fg-secondary">
              Comment un responsable conformité, RH ou innovation peut utiliser AuditIQ dans sa
              routine. Les organisations, personnes et chiffres ci-dessous sont{' '}
              <strong className="font-medium text-fg">fictifs</strong> : ces scénarios sont
              construits à des fins pédagogiques, pour montrer ce qu&apos;un audit produit
              concrètement.
            </p>
          </Reveal>
        </Container>
      </header>

      {/* CASE 1 */}
      <section className="py-20">
        <Container>
          <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
            <Reveal>
              <div className="mb-4 flex items-center gap-4">
                <div
                  aria-hidden
                  className="flex size-14 items-center justify-center rounded-xl border border-border-default bg-surface-2 font-display text-[22px] font-semibold tracking-[-0.02em] text-fg-secondary"
                >
                  T&amp;A
                </div>
                <div>
                  <div className="text-h4 font-medium text-fg">Cabinet Tessier &amp; Associés</div>
                  <div className="mt-0.5 text-xs text-fg-muted">
                    Conseil RH · 180 collaborateurs · Lyon
                  </div>
                </div>
              </div>
              <Eyebrow accent>Scénario illustratif — données fictives · RH &amp; recrutement</Eyebrow>
              <h2 className="mt-3 mb-5 text-[clamp(28px,3vw,36px)] font-display font-medium leading-[1.15] tracking-[-0.02em] text-fg">
                Comment T&amp;A a remplacé trois jours d&apos;audit interne par 50 minutes sur
                AuditIQ.
              </h2>
              <p className="mb-6 text-h4 leading-[1.5] text-fg-secondary">
                Le cabinet utilisait depuis 18 mois un outil de scoring automatique des CV. Le
                besoin : documenter formellement l&apos;absence de biais avant le contrôle annuel.
              </p>
              <StoryBlock
                title="Le défi"
                body="Personne en interne n'avait la compétence statistique pour produire un audit fairness reconnu. Le précédent audit, mené sur Excel, avait pris 3 jours de travail répartis sur deux semaines, et n'était ni structuré annexe IV ni daté de façon traçable."
              />
              <StoryBlock
                title="La solution"
                body="Audit Module 1 sur 412 candidatures de l'année. Trois attributs sensibles audités simultanément (genre, âge, origine présumée). Rapport produit en 50 minutes, dont 30 minutes de configuration."
              />
              <StoryBlock
                title="Le résultat"
                body="Détection d'un écart de 12 % sur l'axe genre, lié au poids du critère « expérience continue » dans le scoring. Recommandation appliquée : pondération réduite. Audit de suivi 3 mois plus tard : score remonté de 3/5 à 4,5/5."
              />
              <div className="mt-6 grid grid-cols-3 gap-3">
                <CaseStat label="Temps gagné" value="3 j → 50 min" />
                <CaseStat label="Score audit 1" value="3 / 5" />
                <CaseStat label="Score après correction" value="4,5 / 5" />
              </div>
            </Reveal>

            <Reveal delay={0.08}>
              <QuoteCard
                quote="Notre outil de scoring CV avait dérivé sans qu'on le sache. AuditIQ nous a montré l'écart entre les profils en moins de quinze minutes, avec un vocabulaire que mon CODIR pouvait comprendre. Et le rapport Excel structuré, c'est ce qui a fini de convaincre la directrice juridique."
                initials="CT"
                name="Claire Tessier"
                role="DRH · Cabinet Tessier & Associés"
              />
            </Reveal>
          </div>
        </Container>
      </section>

      {/* CASE 2 */}
      <section className="border-t border-border-subtle py-20">
        <Container>
          <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
            <Reveal>
              <div className="mb-4 flex items-center gap-4">
                <div
                  aria-hidden
                  className="flex size-14 items-center justify-center rounded-xl border border-border-default bg-surface-2 font-display text-[22px] font-semibold tracking-[-0.02em] text-fg-secondary"
                >
                  BL
                </div>
                <div>
                  <div className="text-h4 font-medium text-fg">Banque Loiret</div>
                  <div className="mt-0.5 text-xs text-fg-muted">
                    Banque régionale · 420 collaborateurs · Orléans
                  </div>
                </div>
              </div>
              <Eyebrow accent>Scénario illustratif — données fictives · Crédit</Eyebrow>
              <h2 className="mt-3 mb-5 text-[clamp(28px,3vw,36px)] font-display font-medium leading-[1.15] tracking-[-0.02em] text-fg">
                Comment une banque régionale identifierait un proxy géographique et tiendrait
                l&apos;échéance AI Act.
              </h2>
              <p className="mb-6 text-h4 leading-[1.5] text-fg-secondary">
                La banque utilisait un modèle de scoring crédit entraîné en 2024 sur des données
                historiques internes. Aucun audit préalable n&apos;avait été conduit. Le
                calendrier : 7 mois pour être conforme avant août 2026.
              </p>
              <StoryBlock
                title="Le défi"
                body="Le périmètre haut risque AI Act s'applique au scoring crédit (annexe III, point 5.b). Documenter et corriger les éventuels biais devenait critique. Le département data interne ne disposait pas d'outillage spécialisé pour la fairness."
              />
              <StoryBlock
                title="La solution"
                body="Audit combiné Module 2 + Module 1 sur 2 840 demandes de crédit. Clustering k-means pour identifier les regroupements naturels, test du χ² sur leur composition, puis audit fairness sur les attributs déclarés."
              />
              <StoryBlock
                title="Le résultat"
                body="Identification d'un cluster déviant représentant 18 % de l'échantillon et 60 % des refus, fortement structuré par le code postal — un signal de proxy géographique de l'origine présumée. Plan type : re-développement du modèle en 4 mois, validation en 1,5 mois, documentation finale en 1,5 mois, pour une mise en production avant l'échéance d'août 2026."
              />
              <div className="mt-6 grid grid-cols-3 gap-3">
                <CaseStat label="Demandes auditées" value="2 840" />
                <CaseStat label="Score audit initial" value="1 / 5" tone="fail" />
                <CaseStat label="Délai mise en conformité" value="7 mois" />
              </div>
            </Reveal>

            <Reveal delay={0.08}>
              <QuoteCard
                quote="Le rapport généré par AuditIQ a remplacé trois jours de travail interne. Et surtout, il parle la langue de l'AI Act, ce qui n'est pas une évidence dans notre métier. Si on avait attendu juin, on n'aurait jamais tenu."
                initials="RM"
                name="Romain Mathys"
                role="Responsable conformité · Banque Loiret"
              />
            </Reveal>
          </div>
        </Container>
      </section>

      {/* CASE 3 */}
      <section className="border-t border-border-subtle py-20">
        <Container>
          <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
            <Reveal>
              <div className="mb-4 flex items-center gap-4">
                <div
                  aria-hidden
                  className="flex size-14 items-center justify-center rounded-xl border border-border-default bg-surface-2 font-display text-[22px] font-semibold tracking-[-0.02em] text-fg-secondary"
                >
                  MS
                </div>
                <div>
                  <div className="text-h4 font-medium text-fg">Mathys SA</div>
                  <div className="mt-0.5 text-xs text-fg-muted">
                    Équipement industriel · 240 collaborateurs · Strasbourg
                  </div>
                </div>
              </div>
              <Eyebrow accent>Scénario illustratif — données fictives · Chatbot SAV</Eyebrow>
              <h2 className="mt-3 mb-5 text-[clamp(28px,3vw,36px)] font-display font-medium leading-[1.15] tracking-[-0.02em] text-fg">
                Comment Mathys SA a corrigé son chatbot SAV après audit LLM.
              </h2>
              <p className="mb-6 text-h4 leading-[1.5] text-fg-secondary">
                L&apos;entreprise opérait un chatbot Mistral-7B fine-tuné, traitant 12 000
                sollicitations par mois. Une plainte client interne avait évoqué un traitement
                différencié selon le profil.
              </p>
              <StoryBlock
                title="Le défi"
                body="Vérifier de manière documentée si le chatbot traitait équitablement les sollicitations, et corriger si nécessaire avant qu'un signalement RGPD soit déposé."
              />
              <StoryBlock
                title="La solution"
                body="Audit Module 3 avec la banque versionnée de paires de prompts (français et anglais), sur six axes de discrimination. Test mené en condition de production, sans modification de l'endpoint."
              />
              <StoryBlock
                title="Le résultat"
                body="Score global 3,2/5. Axe handicap : 2,1/5 — le chatbot redirigeait systématiquement les sollicitations mentionnant un handicap vers un « service spécialisé », sans répondre directement. Recommandation : ajouter aux exemples de fine-tuning des sollicitations avec mention de handicap correctement traitées. Audit de suivi : 4/5 sur tous les axes."
              />
              <div className="mt-6 grid grid-cols-3 gap-3">
                <CaseStat label="Axes audités" value="6" />
                <CaseStat label="Axe le plus touché" value="Handicap" tone="fail" />
                <CaseStat label="Score après correction" value="4 / 5" />
              </div>
            </Reveal>

            <Reveal delay={0.08}>
              <QuoteCard
                quote="Sans AuditIQ, on aurait dû refaire toute notre banque d'évaluation maison. Là, on a un rapport documenté, daté et traçable, prêt à montrer si la CNIL pose la question."
                initials="EM"
                name="Élise Maréchal"
                role="Responsable produit digital · Mathys SA"
              />
            </Reveal>
          </div>
        </Container>
      </section>

      {/* COMPACT QUOTES */}
      <section className="py-24">
        <Container>
          <Reveal className="mb-12 max-w-[720px]">
            <Eyebrow accent>D&apos;autres scénarios</Eyebrow>
            <h2 className="mt-3 text-h2 font-display font-medium tracking-tight text-fg">
              Quatre extraits illustratifs.
            </h2>
            <p className="mt-4 text-sm text-fg-muted">
              Scénarios illustratifs — personnes et organisations fictives.
            </p>
          </Reveal>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Reveal>
              <CompactQuote
                quote="Le score de risque global affiché à l'écran est devenu un point d'agenda mensuel dans notre comité de direction. C'est rare qu'un outil change aussi vite une habitude de gouvernance."
                initials="PD"
                name="Pierre Duval"
                role="DG · Crédit Régional Méditerranée"
              />
            </Reveal>
            <Reveal delay={0.04}>
              <CompactQuote
                quote='Nous avons fait un audit pilote sur notre triage de patients avant déploiement. Le rapport produit nous a permis de cocher la case "fairness" du dossier MDR avec un livrable réel — pas un document de promesse.'
                initials="SA"
                name="Dr Samia Aliotti"
                role="Directrice médicale · Hôpital Saint-Marc"
              />
            </Reveal>
            <Reveal delay={0.08}>
              <CompactQuote
                quote="Nos donneurs d'ordre nous demandent désormais un audit fairness annuel. AuditIQ nous l'a rendu opérationnel en 6 semaines, alors qu'on n'avait jamais touché à ces sujets."
                initials="JV"
                name="Julien Verlaine"
                role="CTO · Groupe Verlaine SaaS"
              />
            </Reveal>
            <Reveal delay={0.12}>
              <CompactQuote
                quote="L'export Excel structuré annexe IV est ce qui a convaincu notre DPO. Plus besoin d'écrire une note de synthèse à la main : tout est déjà au bon format."
                initials="AB"
                name="Amélie Bénard"
                role="DPO · Mutuelle Verte"
              />
            </Reveal>
          </div>
        </Container>
      </section>

      <FinalCta
        eyebrow="Votre histoire"
        title="Écrivez le premier cas réel."
        body="Lancez un premier audit sur vos propres données, ou échangez avec nous sur votre périmètre. Réservez un créneau."
        primary={{ label: 'Réserver une démo', href: '/contact' }}
        secondary={{ label: "Voir les cas d'usage", href: '/cas-usage' }}
      />
    </>
  );
}
