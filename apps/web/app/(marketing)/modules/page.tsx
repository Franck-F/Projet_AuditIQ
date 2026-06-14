import type { Metadata } from 'next';
import { Container } from '@/components/layout/Container';
import { Reveal } from '@/components/layout/Reveal';
import { Badge } from '@/components/ui/badge';
import { Eyebrow } from '@/components/marketing/Eyebrow';
import { FinalCta } from '@/components/marketing/FinalCta';
import { AnchorNav } from '@/components/marketing/AnchorNav';

export const metadata: Metadata = {
  title: 'Modules',
  description:
    "Détail des 3 modules d'audit AuditIQ : caractéristique connue, biais cachés, assistant conversationnel. Métriques, méthodes, livrables.",
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
  plain,
  formula,
  body,
}: {
  title: string;
  plain: string;
  formula: string;
  body: string;
}) {
  return (
    <div className="rounded-md border border-border-default bg-surface p-5">
      <h4 className="text-[15px] font-medium text-fg">{title}</h4>
      <p className="mt-1.5 text-sm leading-relaxed text-fg-secondary">{plain}</p>
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
  { href: '#supervise', label: '01 · Caractéristique connue' },
  { href: '#non-supervise', label: '02 · Biais cachés' },
  { href: '#llm', label: '03 · Assistant conversationnel' },
];

const PROMPT_BANK_AXES = [
  'Genre',
  'Origine',
  'Âge',
  'Religion',
  'Handicap',
  'Orientation',
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
              title="Caractéristique connue."
              lede="Pour les modèles de classification binaire ou multi-classes, et de scoring. Compatible avec vos modèles internes via un export CSV de leurs décisions."
            />
          </Reveal>

          <div className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Reveal>
              <Spec
                eyebrow="Entrées"
                title="Données acceptées"
                items={[
                  'Fichier CSV (UTF-8) — seul format aujourd’hui',
                  "Jusqu'à 1 million de lignes selon le palier",
                  'Colonne de décision (cible) requise',
                  'Une ou plusieurs colonnes sensibles',
                ]}
              />
            </Reveal>
            <Reveal delay={0.05}>
              <Spec
                eyebrow="Méthodes"
                title="Métriques calculées"
                items={[
                  'Disparate Impact et règle des 4/5',
                  'Égalité de traitement (Demographic Parity)',
                  'Égalité des chances (Equal Opportunity)',
                  "Égalité des taux d'erreur (Equalized Odds)",
                  'Analyse intersectionnelle (croisement de deux attributs)',
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
                  'Rapport PDF (synthèse dirigeants) + Excel annexe IV',
                  'Recommandations d’actions',
                ]}
              />
            </Reveal>
          </div>

          <Reveal>
            <Eyebrow className="mb-3 block">Métriques calculées</Eyebrow>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <MetricDef
                title="Égalité de traitement (Demographic Parity)"
                plain="En français simple : chaque groupe doit obtenir une décision favorable à peu près aussi souvent que les autres."
                formula="P(Ŷ=1 | A=a) ≈ P(Ŷ=1 | A=b)"
                body="Mesure si la probabilité d'obtenir une décision favorable est équivalente entre groupes. Un ratio < 0.80 enfreint la règle des 4/5."
              />
              <MetricDef
                title="Égalité des chances (Equal Opportunity)"
                plain="En français simple : à profil également qualifié, chaque groupe doit avoir la même chance d'être retenu."
                formula="P(Ŷ=1 | Y=1, A=a) ≈ P(Ŷ=1 | Y=1, A=b)"
                body="Vérifie si, parmi les profils qualifiés, la probabilité d'être correctement sélectionné est équivalente entre groupes."
              />
              <MetricDef
                title="Égalité des taux d'erreur (Equalized Odds)"
                plain="En français simple : le modèle doit se tromper aussi rarement — dans les deux sens — pour chaque groupe. TPR = taux de vrais positifs, FPR = taux de faux positifs."
                formula="TPR(a) ≈ TPR(b) ET FPR(a) ≈ FPR(b)"
                body="Conjugue l'égalité des chances et l'égalité des taux de faux positifs. Métrique la plus stricte parmi les quatre."
              />
              <MetricDef
                title="Règle des quatre cinquièmes (4/5)"
                plain="En français simple : le taux de sélection du groupe le moins favorisé doit atteindre au moins 80 % de celui du groupe le plus favorisé."
                formula="min(SR_a) / max(SR_a) ≥ 0.80"
                body="Convention issue de l'EEOC américaine (1978), utilisée comme repère pratique — ce n'est pas un seuil légal européen. Seuil par défaut 0.80, ajustable."
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
              title="Biais cachés."
              lede="Pour les jeux de données sans modèle entraîné. Utile en amont de l'entraînement, sur des datasets d'entraînement bruts, ou pour analyser des bases clients avant déploiement d'une IA."
            />
          </Reveal>

          <div className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Reveal>
              <Spec
                eyebrow="Entrées"
                title="Données acceptées"
                items={[
                  'Fichier CSV (UTF-8) — seul format aujourd’hui',
                  'Pas de variable cible requise',
                  'Variables numériques et catégorielles',
                  'Indication optionnelle des colonnes sensibles',
                ]}
              />
            </Reveal>
            <Reveal delay={0.05}>
              <Spec
                eyebrow="Méthodes"
                title="Algorithmes utilisés"
                items={[
                  'Clustering k-means (nombre de clusters paramétrable)',
                  "Test du χ² d'indépendance sur la composition des clusters",
                  'Identification des variables dominantes par cluster',
                  'Pré-vérifications de qualité des données',
                ]}
              />
            </Reveal>
            <Reveal delay={0.1}>
              <Spec
                eyebrow="Livrables"
                title="Sorties produites"
                items={[
                  'Signalement de clusters déviants',
                  'Liste des variables dominantes par cluster',
                  'Signal de proxy possible quand un groupe protégé est sur-représenté',
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
                un code postal qui reflète l&apos;origine présumée. AuditIQ teste, via le test du
                χ², si la composition des clusters s&apos;écarte significativement de celle de
                l&apos;ensemble du jeu de données : un cluster où un groupe protégé est
                sur-représenté est un signal de proxy possible, à investiguer par vos équipes.
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
              title="Assistant conversationnel."
              lede="Pour les assistants conversationnels intégrés à votre service client, vos RH ou vos outils internes. L'audit compare les réponses de votre assistant à des paires de prompts ne variant que sur un attribut protégé."
            />
          </Reveal>

          <div className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Reveal>
              <Spec
                eyebrow="Entrées"
                title="Configuration nécessaire"
                items={[
                  'Banque de paires de prompts versionnée (français et anglais)',
                  'Définition des axes à auditer (1 à 6)',
                  'Réponses du chatbot à analyser',
                ]}
              />
            </Reveal>
            <Reveal delay={0.05}>
              <Spec
                eyebrow="Méthodes"
                title="Tests appliqués"
                items={[
                  'Paires de prompts contrefactuels — deux requêtes identiques, un seul attribut varie',
                  "Mesure d'écart de longueur des réponses",
                  'Analyse de polarité par lexique bilingue — méthode déterministe et documentée',
                  'Taux de refus / redirection par axe',
                ]}
              />
            </Reveal>
            <Reveal delay={0.1}>
              <Spec
                eyebrow="Livrables"
                title="Sorties produites"
                items={[
                  'Score global + score par axe',
                  'Tableau de comparaison des réponses',
                  'Extraits significatifs annotés',
                  'Rapport audit LLM PDF + Excel',
                ]}
              />
            </Reveal>
          </div>

          <Reveal>
            <div className="rounded-xl border border-border-default bg-surface-2 p-6">
              <Eyebrow accent>Banque de prompts</Eyebrow>
              <h4 className="mt-2 text-h4 font-medium text-fg">Une banque versionnée de paires de prompts</h4>
              <p className="mt-3 text-sm leading-relaxed text-fg-secondary">
                AuditIQ maintient une banque versionnée de paires de prompts contrefactuels, en
                français et en anglais, couvrant six axes de discrimination : genre, origine, âge,
                religion, handicap, orientation. Chaque paire teste une situation concrète
                (demande de remboursement, demande de prêt, sollicitation de support) en ne
                faisant varier qu&apos;un seul attribut. La personnalisation de la banque avec vos
                prompts métiers est en feuille de route.
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

      <FinalCta
        eyebrow="Aller plus loin"
        title="Voyez les modules tourner sur vos données."
        body="Une démo guidée de 30 minutes, sur vos cas concrets, par un de nos consultants."
        primary={{ label: 'Réserver une démo', href: '/contact' }}
        secondary={{ label: "Voir les cas d'usage", href: '/cas-usage' }}
      />
    </>
  );
}
