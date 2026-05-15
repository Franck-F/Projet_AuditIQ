import Link from 'next/link';
import type { Metadata } from 'next';
import { Container } from '@/components/layout/Container';
import { Reveal } from '@/components/layout/Reveal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eyebrow } from '@/components/marketing/Eyebrow';
import { AnchorNav } from '@/components/marketing/AnchorNav';

export const metadata: Metadata = {
  title: 'Modules',
  description:
    "Détail des 3 modules d'audit AuditIQ : audit supervisé, détection non supervisée, audit LLM. Métriques, méthodes, livrables.",
};

/* ============================================================================
   Page-local components
   ============================================================================ */

function Spec({ eyebrow, title, items }: { eyebrow: string; title: string; items: string[] }) {
  return (
    <div className="rounded-xl border border-border-default bg-surface p-6">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h4 className="mt-2 mb-3 text-h4 font-medium text-fg">{title}</h4>
      <ul className="flex flex-col gap-2">
        {items.map((it) => (
          <li
            key={it}
            className="grid grid-cols-[14px_1fr] gap-2.5 text-sm leading-relaxed text-fg-secondary"
          >
            <span
              aria-hidden
              className="mt-[9px] inline-block size-1 rounded-full bg-accent"
            />
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function MetricDef({
  title,
  formula,
  body,
}: {
  title: string;
  formula: string;
  body: string;
}) {
  return (
    <div className="rounded-md border border-border-default bg-surface p-5">
      <h4 className="text-[15px] font-medium text-fg">{title}</h4>
      <div className="my-3 inline-block rounded-[4px] bg-accent-soft px-2.5 py-2 font-mono text-xs text-accent">
        {formula}
      </div>
      <p className="text-sm leading-relaxed text-fg-secondary">{body}</p>
    </div>
  );
}

function ModuleHeader({
  num,
  title,
  lede,
}: {
  num: string;
  title: string;
  lede: string;
}) {
  return (
    <div className="mb-10 grid grid-cols-1 items-end gap-6 lg:grid-cols-2 lg:gap-16">
      <div>
        <Eyebrow accent>{num}</Eyebrow>
        <h2 className="mt-3 max-w-[16ch] text-[clamp(32px,4vw,40px)] font-display font-medium tracking-[-0.02em] text-fg">
          {title}
        </h2>
      </div>
      <p className="text-h4 leading-relaxed text-fg-secondary">{lede}</p>
    </div>
  );
}

const ANCHORS = [
  { href: '#supervise', label: '01 · Audit supervisé' },
  { href: '#non-supervise', label: '02 · Détection non supervisée' },
  { href: '#llm', label: '03 · Audit LLM' },
];

const PROMPT_BANK_AXES = [
  'Genre · 86 prompts',
  'Origine · 78 prompts',
  'Âge · 64 prompts',
  'Religion · 52 prompts',
  'Handicap · 68 prompts',
  'Orientation · 64 prompts',
];

/* ============================================================================
   Page
   ============================================================================ */

export default function ModulesPage() {
  return (
    <>
      <header className="border-b border-border-subtle pt-[clamp(64px,8vw,96px)] pb-12">
        <Container>
          <Reveal>
            <Eyebrow accent>Modules</Eyebrow>
            <h1 className="mt-4 max-w-[22ch] font-display text-[clamp(36px,4vw,48px)] font-semibold leading-[1.1] tracking-[-0.02em] text-fg">
              Trois angles d&apos;analyse. Une seule logique de conformité.
            </h1>
            <p className="mt-5 max-w-[60ch] text-[clamp(18px,1.3vw,20px)] leading-relaxed text-fg-secondary">
              Chaque module d&apos;AuditIQ correspond à une famille d&apos;IA réellement déployée en
              PME. Voici les méthodes, les métriques, les livrables — détail technique pour vos
              data analysts, traduction pédagogique pour vos décideurs.
            </p>
          </Reveal>
        </Container>
      </header>

      <AnchorNav items={ANCHORS} />

      {/* MODULE 1 */}
      <section id="supervise" className="py-24 scroll-mt-32">
        <Container>
          <Reveal>
            <ModuleHeader
              num="Module 01"
              title="Audit supervisé classique."
              lede="Pour les modèles de classification binaire ou multi-classes, et de scoring. Compatible avec vos modèles internes (export CSV des prédictions) ou via intégration API."
            />
          </Reveal>

          <div className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Reveal>
              <Spec
                eyebrow="Entrées"
                title="Données acceptées"
                items={[
                  'CSV, XLSX, Parquet, JSON',
                  '5M lignes max en standard',
                  'Colonne cible (target) requise',
                  'Une ou plusieurs colonnes sensibles',
                  'Colonne de prédiction du modèle',
                ]}
              />
            </Reveal>
            <Reveal delay={0.05}>
              <Spec
                eyebrow="Méthodes"
                title="Algorithmes utilisés"
                items={[
                  'Test de proportions par groupe',
                  "Test du χ² d'indépendance",
                  'Intervalles de confiance bootstrap',
                  'Décomposition intersectionnelle',
                  'Stratification automatique',
                ]}
              />
            </Reveal>
            <Reveal delay={0.1}>
              <Spec
                eyebrow="Livrables"
                title="Sorties produites"
                items={[
                  'Feu tricolore par métrique + global',
                  'Visualisation des écarts par groupe',
                  'Explication en langage naturel',
                  'Rapport PDF executive + Excel annexe IV',
                  'Recommandations priorisées',
                ]}
              />
            </Reveal>
          </div>

          <Reveal>
            <Eyebrow className="mb-3 block">Métriques calculées</Eyebrow>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <MetricDef
                title="Demographic Parity (DP)"
                formula="P(Ŷ=1 | A=a) ≈ P(Ŷ=1 | A=b)"
                body="Mesure si la probabilité d'obtenir une décision favorable est équivalente entre groupes. Un score < 0.80 viole la règle des 4/5."
              />
              <MetricDef
                title="Equal Opportunity (EO)"
                formula="P(Ŷ=1 | Y=1, A=a) ≈ P(Ŷ=1 | Y=1, A=b)"
                body="Vérifie si, parmi les profils qualifiés, la probabilité d'être correctement sélectionné est équivalente entre groupes."
              />
              <MetricDef
                title="Equalized Odds (EOdds)"
                formula="TPR(a) ≈ TPR(b) ET FPR(a) ≈ FPR(b)"
                body="Conjugue Equal Opportunity et égalité des taux de faux positifs. Métrique la plus stricte parmi les quatre."
              />
              <MetricDef
                title="Règle des quatre cinquièmes"
                formula="min(SR_a) / max(SR_a) ≥ 0.80"
                body="Standard EEOC (US) et référence dans la jurisprudence européenne. Seuil par défaut 0.80, ajustable."
              />
            </div>
          </Reveal>
        </Container>
      </section>

      {/* MODULE 2 */}
      <section
        id="non-supervise"
        className="border-t border-border-subtle bg-surface py-24 scroll-mt-32"
      >
        <Container>
          <Reveal>
            <ModuleHeader
              num="Module 02"
              title="Détection non supervisée."
              lede="Pour les jeux de données sans modèle entraîné. Utile en amont de l'entraînement, sur des datasets d'entraînement bruts, ou pour analyser des bases clients avant déploiement d'une IA."
            />
          </Reveal>

          <div className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Reveal>
              <Spec
                eyebrow="Entrées"
                title="Données acceptées"
                items={[
                  'CSV, XLSX, Parquet, JSON',
                  'Pas de variable cible requise',
                  'Features numériques et catégorielles',
                  'Indication optionnelle des colonnes sensibles',
                ]}
              />
            </Reveal>
            <Reveal delay={0.05}>
              <Spec
                eyebrow="Méthodes"
                title="Algorithmes utilisés"
                items={[
                  'k-means (clusters compacts)',
                  'DBSCAN (clusters de densité)',
                  'Mixtures gaussiennes (clusters probabilistes)',
                  'Sélection automatique par silhouette',
                  'SHAP pour features dominantes',
                ]}
              />
            </Reveal>
            <Reveal delay={0.1}>
              <Spec
                eyebrow="Livrables"
                title="Sorties produites"
                items={[
                  'Carte des clusters (projection 2D)',
                  'Signalement de clusters déviants',
                  'Liste des features dominantes',
                  'Alerte sur proxies de critères protégés',
                  'Rapport pédagogique avec niveau de risque',
                ]}
              />
            </Reveal>
          </div>

          <Reveal>
            <div className="rounded-xl border border-border-default bg-surface-2 p-6">
              <Eyebrow accent>Focus : détection de proxies</Eyebrow>
              <h4 className="mt-2 text-h4 font-medium text-fg">Pourquoi c&apos;est important ?</h4>
              <p className="mt-3 text-sm leading-relaxed text-fg-secondary">
                Un modèle peut discriminer sans utiliser directement l&apos;attribut sensible — en
                s&apos;appuyant sur des variables fortement corrélées (proxies). Exemple typique :
                un code postal qui corrèle à 0,82 avec l&apos;origine présumée. AuditIQ calcule
                l&apos;information mutuelle entre chaque feature et les attributs sensibles
                déclarés, et signale tout dépassement du seuil de 0,4.
              </p>
            </div>
          </Reveal>
        </Container>
      </section>

      {/* MODULE 3 */}
      <section id="llm" className="border-t border-border-subtle py-24 scroll-mt-32">
        <Container>
          <Reveal>
            <ModuleHeader
              num="Module 03"
              title="Audit LLM & chatbot."
              lede="Pour les assistants conversationnels intégrés à votre service client, vos RH ou vos outils internes. Compatible avec OpenAI, Mistral, Anthropic, Llama, modèles fine-tunés et endpoints custom."
            />
          </Reveal>

          <div className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Reveal>
              <Spec
                eyebrow="Entrées"
                title="Configuration nécessaire"
                items={[
                  "URL d'endpoint API ou clé fournisseur",
                  'Choix de la banque de prompts (générale ou métier)',
                  'Définition des axes à auditer (1 à 6)',
                  'Paramètres de température et de tokens max',
                  'Mode de coût contrôlé (budget API plafond)',
                ]}
              />
            </Reveal>
            <Reveal delay={0.05}>
              <Spec
                eyebrow="Méthodes"
                title="Tests appliqués"
                items={[
                  'Prompts pairs (Counterfactual Pairs)',
                  "Mesure d'écart de longueur (token count)",
                  'Analyse de sentiment (RoBERTa-FR)',
                  'Taux de refus / déflexion par axe',
                  'Polarité et présence de stéréotypes',
                ]}
              />
            </Reveal>
            <Reveal delay={0.1}>
              <Spec
                eyebrow="Livrables"
                title="Sorties produites"
                items={[
                  'Score global / 5 + score par axe',
                  'Tableau de comparaison réponses',
                  'Extraits significatifs annotés',
                  "Recommandations d'instructions système",
                  'Rapport audit LLM PDF + Excel',
                ]}
              />
            </Reveal>
          </div>

          <Reveal>
            <div className="rounded-xl border border-border-default bg-surface-2 p-6">
              <Eyebrow accent>Banque de prompts</Eyebrow>
              <h4 className="mt-2 text-h4 font-medium text-fg">400+ prompts pairs maintenus</h4>
              <p className="mt-3 text-sm leading-relaxed text-fg-secondary">
                Notre équipe maintient une banque de 412 prompts pairs en français (228 en anglais,
                96 en espagnol), répartis sur six axes : genre, origine, âge, religion, handicap,
                orientation. Chaque prompt teste une situation concrète : demande de remboursement,
                demande de prêt, sollicitation de support, demande d&apos;avis. Vous pouvez aussi
                importer vos propres prompts métiers.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {PROMPT_BANK_AXES.map((axis) => (
                  <Badge key={axis}>{axis}</Badge>
                ))}
              </div>
            </div>
          </Reveal>
        </Container>
      </section>

      {/* CTA */}
      <section className="py-16">
        <Container>
          <Reveal>
            <div className="grid grid-cols-1 items-center gap-8 rounded-2xl border border-border-default bg-surface p-[clamp(40px,6vw,64px)] lg:grid-cols-[1fr_auto]">
              <div>
                <Eyebrow accent>Aller plus loin</Eyebrow>
                <h2 className="mt-3 text-h2 font-display font-medium tracking-tight text-fg">
                  Voyez les modules tourner sur vos données.
                </h2>
                <p className="mt-3 max-w-[56ch] text-fg-secondary">
                  Une démo guidée de 30 minutes, sur vos cas concrets, par un de nos consultants.
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <Button asChild variant="primary" size="lg">
                  <Link href="/contact">Réserver une démo</Link>
                </Button>
                <Button asChild variant="secondary">
                  <Link href="/cas-usage">Voir les cas d&apos;usage</Link>
                </Button>
              </div>
            </div>
          </Reveal>
        </Container>
      </section>
    </>
  );
}
