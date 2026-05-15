import Link from 'next/link';
import type { Metadata } from 'next';
import { Container } from '@/components/layout/Container';
import { Reveal } from '@/components/layout/Reveal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eyebrow } from '@/components/marketing/Eyebrow';
import { StatusPill } from '@/components/marketing/StatusPill';

export const metadata: Metadata = {
  title: 'PME : pourquoi maintenant',
  description:
    "Pourquoi les PME françaises doivent s'emparer du sujet fairness IA dès 2026 — risques, calendrier, profils-type d'exposition.",
};

/* ============================================================================
   Page-local components
   ============================================================================ */

function StatCard({
  big,
  label,
  source,
}: {
  big: string;
  label: string;
  source: string;
}) {
  return (
    <div className="rounded-xl border border-border-default bg-surface p-8">
      <div className="mb-3 font-display text-[clamp(48px,5vw,64px)] font-semibold leading-none tracking-[-0.025em] text-accent tabular-nums">
        {big}
      </div>
      <div className="mb-3 text-h4 text-fg">{label}</div>
      <p className="text-xs text-fg-muted">{source}</p>
    </div>
  );
}

function ReasonBlock({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div>
      <h4 className="mb-2 text-h4 font-medium text-fg">
        {n} · {title}
      </h4>
      <p className="text-sm leading-relaxed text-fg-secondary">{body}</p>
    </div>
  );
}

function ProfileCard({
  title,
  example,
  risk,
  body,
  chips,
}: {
  title: string;
  example: string;
  risk: { tone: 'fail' | 'warn'; label: string };
  body: string;
  chips: string[];
}) {
  return (
    <div className="rounded-xl border border-border-default bg-surface p-7">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="text-h4 font-medium text-fg">{title}</h4>
          <span className="mt-1 block text-xs text-fg-muted">{example}</span>
        </div>
        <StatusPill tone={risk.tone}>{risk.label}</StatusPill>
      </div>
      <p className="text-sm leading-relaxed text-fg-secondary">{body}</p>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {chips.map((c) => (
          <Badge key={c}>{c}</Badge>
        ))}
      </div>
    </div>
  );
}

const CHECKLIST = [
  'Nous utilisons une IA pour trier ou scorer des candidatures.',
  'Nous utilisons une IA pour scorer ou tarifer des clients.',
  "Notre IA influence directement une décision affectant une personne (acceptation, refus, niveau de service).",
  'Nous opérons un chatbot ou assistant LLM en contact avec des particuliers.',
  'Notre IA traite des données qui peuvent corréler avec des critères protégés (genre, origine, âge).',
  'Nous éditons un logiciel intégrant une IA et le distribuons en B2B.',
  "Notre IA est utilisée dans la santé, l'éducation, la justice ou les services essentiels.",
  "Nous n'avons jamais audité formellement notre IA pour le biais.",
  "Nos donneurs d'ordre commencent à nous interroger sur la fairness de nos systèmes.",
  "Nous n'avons ni data scientist dédié, ni cabinet conformité IA en interne.",
];

/* ============================================================================
   Page
   ============================================================================ */

export default function PmePage() {
  return (
    <>
      <header className="border-b border-border-subtle pt-[clamp(64px,8vw,96px)] pb-12">
        <Container>
          <Reveal>
            <Eyebrow accent>PME : pourquoi maintenant</Eyebrow>
            <h1 className="mt-4 max-w-[22ch] font-display text-[clamp(36px,4vw,48px)] font-semibold leading-[1.1] tracking-[-0.02em] text-fg">
              Vous avez 18 mois pour vous mettre en conformité. C&apos;est le moment de s&apos;en
              occuper.
            </h1>
            <p className="mt-5 max-w-[60ch] text-[clamp(18px,1.3vw,20px)] leading-relaxed text-fg-secondary">
              L&apos;AI Act ne concerne pas que les géants de la tech. Si vous utilisez une IA pour
              trier des CV, scorer des clients, calculer une prime ou répondre via un chatbot —
              vous êtes potentiellement dans le périmètre « haut risque ». Voici comment
              l&apos;évaluer simplement.
            </p>
          </Reveal>
        </Container>
      </header>

      {/* KEY STATS */}
      <section className="py-16">
        <Container>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Reveal>
              <StatCard
                big="2 août 2026"
                label="Date d'application"
                source="Les obligations sur les systèmes d'IA à haut risque deviennent contraignantes. Toute IA déployée en production doit pouvoir produire sa documentation."
              />
            </Reveal>
            <Reveal delay={0.06}>
              <StatCard
                big="7 %"
                label="Plafond d'amende"
                source="Pour les manquements les plus graves (pratiques interdites). Pour les infractions sur les systèmes à haut risque : jusqu'à 3 % du chiffre d'affaires mondial — règlement (UE) 2024/1689 art. 99."
              />
            </Reveal>
            <Reveal delay={0.12}>
              <StatCard
                big="68 %"
                label="PME utilisant déjà une IA"
                source="Pourcentage de PME françaises de 50+ salariés utilisant au moins un outil IA en production en 2025. Source : Bpifrance Le Lab, étude « IA & PME » 2025."
              />
            </Reveal>
          </div>
        </Container>
      </section>

      {/* WHY NOW */}
      <section className="py-24">
        <Container>
          <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-2 lg:gap-16">
            <Reveal>
              <Eyebrow accent>Trois raisons d&apos;agir maintenant</Eyebrow>
              <h2 className="mt-3 mb-6 text-h2 font-display font-medium tracking-[-0.015em] text-fg">
                Plus on attend, plus c&apos;est coûteux.
              </h2>
              <div className="flex flex-col gap-6">
                <ReasonBlock
                  n="01"
                  title="La charge de la preuve est inversée"
                  body="En cas de plainte, vous devrez prouver que votre IA n'a pas discriminé. Sans audit préalable, vous partez avec un dossier vide. AuditIQ archive vos audits avec horodatage notarié."
                />
                <ReasonBlock
                  n="02"
                  title="Les remédiations prennent du temps"
                  body="Si un audit révèle un biais, le re-développement, le ré-entraînement et la re-validation peuvent prendre 3 à 6 mois. Mieux vaut auditer maintenant que découvrir l'urgence en juillet 2026."
                />
                <ReasonBlock
                  n="03"
                  title="Vos donneurs d'ordre l'exigeront avant la régulation"
                  body="Les grands comptes commencent à demander des audits fairness dans les appels d'offres dès 2025. Pour une PME en B2B, c'est déjà un avantage commercial — ou un critère excluant."
                />
              </div>
            </Reveal>

            <Reveal delay={0.08}>
              <div className="rounded-xl border border-border-default bg-surface-2 p-8">
                <Eyebrow accent>Cas réel</Eyebrow>
                <h3 className="mt-3 mb-4 text-h3 font-display font-medium tracking-[-0.015em] text-fg">
                  Banque Loiret — 7 mois pour se mettre en conformité.
                </h3>
                <p className="mb-4 text-sm leading-relaxed text-fg-secondary">
                  Romain Mathys, responsable conformité, a lancé l&apos;audit en janvier 2026.
                  AuditIQ a détecté un proxy géographique dans le modèle de scoring crédit.
                  Re-développement du modèle : 4 mois. Validation : 1,5 mois. Documentation finale
                  : 1,5 mois. Total : 7 mois — pour une mise en production conforme avant la
                  deadline.
                </p>
                <blockquote className="my-4 border-l-2 border-accent pl-4 font-display text-h4 italic leading-[1.5]">
                  « Si on avait attendu juin, on n&apos;aurait jamais tenu. »
                </blockquote>
                <p className="text-xs text-fg-muted">Romain Mathys, Banque Loiret</p>
              </div>
            </Reveal>
          </div>
        </Container>
      </section>

      {/* RISK PROFILES */}
      <section className="bg-surface py-24">
        <Container>
          <Reveal className="mb-12 max-w-[720px]">
            <Eyebrow accent>Profils-type</Eyebrow>
            <h2 className="mt-3 text-h2 font-display font-medium tracking-tight text-fg">
              Vous reconnaissez-vous ?
            </h2>
            <p className="mt-4 text-h4 leading-relaxed text-fg-secondary">
              Cinq profils de PME exposées à l&apos;AI Act. Si votre organisation correspond à
              l&apos;un d&apos;eux, le périmètre haut risque s&apos;applique probablement.
            </p>
          </Reveal>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Reveal>
              <ProfileCard
                title="Cabinet de recrutement ou ETI RH"
                example="50 à 500 collaborateurs · ATS avec scoring IA"
                risk={{ tone: 'fail', label: 'Haut risque' }}
                body="Tout outil de scoring ou de tri automatisé de candidatures relève du périmètre haut risque (annexe III, point 4.a). L'audit doit couvrir le genre, l'âge et l'origine présumée a minima."
                chips={['Annexe III · 4.a', 'Art. L.1132-1', 'Module 01']}
              />
            </Reveal>
            <Reveal delay={0.05}>
              <ProfileCard
                title="Banque régionale ou organisme de crédit"
                example="Scoring crédit, anti-fraude, KYC"
                risk={{ tone: 'fail', label: 'Haut risque' }}
                body="Évaluation de la solvabilité et établissement d'un score de crédit relèvent du périmètre (annexe III, point 5.b). L'audit doit examiner les attributs sensibles, et particulièrement les proxies géographiques."
                chips={['Annexe III · 5.b', 'RGPD art. 22', 'Module 01+02']}
              />
            </Reveal>
            <Reveal delay={0.1}>
              <ProfileCard
                title="Mutuelle ou compagnie d'assurance"
                example="Tarification, sélection des risques"
                risk={{ tone: 'fail', label: 'Haut risque' }}
                body="La tarification basée sur l'IA pour les assurances santé et vie est explicitement listée (annexe III, point 5.c). L'attention porte sur l'âge, le genre, et les zones géographiques."
                chips={['Annexe III · 5.c', 'Module 01']}
              />
            </Reveal>
            <Reveal delay={0.15}>
              <ProfileCard
                title="Service client avec chatbot LLM"
                example="Assistant intégré au site, IA conversationnelle"
                risk={{ tone: 'warn', label: 'Risque limité' }}
                body="Les chatbots relèvent du « risque limité » et doivent informer l'utilisateur qu'il interagit avec une IA (art. 50). En cas d'usage en assistance médicale, juridique ou RH, le périmètre peut basculer en haut risque."
                chips={['Art. 50', 'Module 03']}
              />
            </Reveal>
            <Reveal delay={0.2}>
              <ProfileCard
                title="Éditeur de logiciel intégrant une IA RH ou crédit"
                example="Vous êtes fournisseur d'une IA à haut risque"
                risk={{ tone: 'fail', label: 'Haut risque · Fournisseur' }}
                body="Le statut de « fournisseur » d'IA à haut risque entraîne des obligations renforcées (art. 16) : système qualité, surveillance post-marché, documentation technique complète. Vos clients (déployeurs) demanderont la documentation."
                chips={['Art. 16', 'Annexe IV', 'Module 01+02']}
              />
            </Reveal>
            <Reveal delay={0.25}>
              <ProfileCard
                title="Plateforme de santé numérique"
                example="Triage, prédiction de pathologie, support diagnostic"
                risk={{ tone: 'fail', label: 'Haut risque · double régulation' }}
                body="Les IA médicales relèvent à la fois de l'AI Act et du règlement MDR (dispositifs médicaux). L'audit fairness s'ajoute aux obligations cliniques. Genre, âge, et origine sont incontournables."
                chips={['Annexe III · 5.h', 'MDR (UE) 2017/745', 'Module 01+03']}
              />
            </Reveal>
          </div>
        </Container>
      </section>

      {/* CHECKLIST */}
      <section className="py-24">
        <Container>
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-16">
            <Reveal>
              <Eyebrow accent>Mini-checklist d&apos;auto-évaluation</Eyebrow>
              <h2 className="mt-3 mb-4 text-h2 font-display font-medium tracking-[-0.015em] text-fg">
                Êtes-vous concerné ? Dix questions, trois minutes.
              </h2>
              <p className="text-base leading-relaxed text-fg-secondary">
                Si vous répondez « oui » à au moins trois questions ci-contre, votre organisation
                est probablement dans le périmètre haut risque. La démo gratuite d&apos;AuditIQ vous
                donne une qualification précise sous 30 minutes.
              </p>
              <Button asChild variant="primary" className="mt-6">
                <Link href="/contact">Demander la démo de qualification</Link>
              </Button>
            </Reveal>

            <Reveal delay={0.08}>
              <div className="rounded-xl border border-border-default bg-surface-2 p-8">
                <ul className="flex flex-col gap-3">
                  {CHECKLIST.map((q) => (
                    <li
                      key={q}
                      className="grid grid-cols-[24px_1fr] gap-3 text-sm leading-relaxed"
                    >
                      <span
                        aria-hidden
                        className="mt-0.5 inline-block size-[18px] rounded-[4px] border border-border-strong"
                      />
                      <span>{q}</span>
                    </li>
                  ))}
                </ul>
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
                <Eyebrow accent>Avancez maintenant</Eyebrow>
                <h2 className="mt-3 text-h2 font-display font-medium tracking-tight text-fg">
                  Qualifions ensemble votre exposition.
                </h2>
                <p className="mt-3 max-w-[56ch] text-fg-secondary">
                  30 minutes pour cadrer votre périmètre, lancer un audit pilote et estimer votre
                  charge de mise en conformité.
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <Button asChild variant="primary" size="lg">
                  <Link href="/contact">Réserver une démo</Link>
                </Button>
                <Button asChild variant="secondary">
                  <Link href="/ai-act">Approfondir l&apos;AI Act</Link>
                </Button>
              </div>
            </div>
          </Reveal>
        </Container>
      </section>
    </>
  );
}
