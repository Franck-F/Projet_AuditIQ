/* =============================================================================
   AuditIQ — Article data.
   10 articles extracted from docs/design/auditiq-vitrine-v3/article-*.html
   ============================================================================= */

export type ArticleCategory =
  | 'Méthode'
  | 'Réglementation'
  | "Cas d'usage"
  | 'Recherche'
  | 'Annonce'
  | 'AI Act'
  | 'Livre blanc'
  | 'Produit'
  | 'Retour d\'expérience'
  | 'Secteur · RH'
  | 'Secteur · Crédit'
  | 'Méthode · LLM'
  | 'Guide · AI Act';

export type ArticleBlock =
  | { kind: 'p'; text: string }
  | { kind: 'h2'; text: string }
  | { kind: 'h3'; text: string }
  | { kind: 'ul'; items: string[] }
  | { kind: 'ol'; items: string[] }
  | { kind: 'callout'; text: string }
  | { kind: 'note-info'; text: string }
  | { kind: 'note-warn'; text: string }
  | { kind: 'kpi'; values: { value: string; label: string }[] }
  | { kind: 'sources'; items: { title: string; url: string }[] }
  | { kind: 'disclaimer'; text: string }
  | {
      kind: 'compare';
      left: { title: string; items: string[] };
      right: { title: string; items: string[] };
    }
  | {
      kind: 'timeline';
      items: { date: string; title: string; body: string; current?: boolean }[];
    };

export type Article = {
  slug: string;
  title: string;
  lede: string;
  category: ArticleCategory;
  author: string;
  role: string;
  date: string;
  readMinutes: number;
  body: ArticleBlock[];
};

export const ARTICLES: Article[] = [
  // ─── 1. regle-4-5 ────────────────────────────────────────────────────────────
  {
    slug: 'regle-4-5',
    title: 'La règle des quatre cinquièmes, expliquée concrètement.',
    lede:
      'Le test de fairness le plus ancien et le plus utilisé. D\'où il vient, comment on le calcule, ce qu\'il vaut juridiquement — et ses limites.',
    category: 'Méthode',
    author: 'Équipe AuditIQ',
    role: 'Recherche & conformité · AuditIQ',
    date: '2026-05-08',
    readMinutes: 8,
    body: [
      {
        kind: 'p',
        text: 'La **règle des quatre cinquièmes** (ou « règle des 4/5 », « 80 % rule ») est le test de disparité le plus connu. Simple à calculer, il reste une première grille de lecture précieuse — à condition d\'en connaître les limites.',
      },
      { kind: 'h2', text: '01 — D\'où vient-elle ?' },
      {
        kind: 'p',
        text: 'Elle provient des *Uniform Guidelines on Employee Selection Procedures* adoptées en 1978 aux États-Unis par l\'EEOC et plusieurs agences fédérales. L\'idée : un processus de sélection est suspect de discrimination si le taux de sélection d\'un groupe protégé est inférieur à 80 % de celui du groupe le plus favorisé.',
      },
      { kind: 'h2', text: '02 — Comment la calculer' },
      {
        kind: 'p',
        text: 'On calcule le **taux de sélection** de chaque groupe (part de décisions favorables), puis le ratio entre le taux d\'un groupe et celui du groupe le plus favorisé. Si ce ratio passe sous `0,80`, la règle est enfreinte.',
      },
      {
        kind: 'kpi',
        values: [
          { value: '71 %', label: 'Taux groupe de référence' },
          { value: '49 %', label: 'Taux groupe comparé' },
          { value: '0,69', label: 'Ratio — sous le seuil 0,80' },
        ],
      },
      { kind: 'h2', text: '03 — Sa portée en Europe' },
      {
        kind: 'p',
        text: 'En Europe, la règle des 4/5 n\'a pas de valeur contraignante en tant que telle, mais elle sert de **repère pratique** reconnu pour objectiver une disparité. L\'AI Act et le droit de la non-discrimination raisonnent en termes de *discrimination indirecte*, pour laquelle un écart statistique constitue un signal, pas une preuve définitive.',
      },
      {
        kind: 'note-warn',
        text: '**Limites à connaître :** la règle est sensible à la taille des échantillons, ne teste pas la significativité statistique, et peut masquer des effets de structure (paradoxe de Simpson). À compléter par d\'autres métriques.',
      },
      { kind: 'h2', text: '04 — En pratique' },
      {
        kind: 'p',
        text: 'AuditIQ calcule automatiquement le ratio des 4/5 sur chaque attribut protégé, le situe par rapport au seuil, et le met en regard d\'autres métriques (parité démographique, égalité des chances) pour éviter les fausses conclusions.',
      },
      {
        kind: 'disclaimer',
        text: '**Avertissement.** Cet article est une synthèse à visée d\'information, à jour à sa date de publication, et ne constitue pas un conseil juridique. Reportez-vous aux textes officiels et à votre conseil pour toute décision de conformité.',
      },
    ],
  },

  // ─── 2. dp-vs-eo ─────────────────────────────────────────────────────────────
  {
    slug: 'dp-vs-eo',
    title: 'Demographic Parity vs Equal Opportunity : laquelle choisir, et quand ?',
    lede:
      'Deux métriques qui peuvent conclure l\'inverse sur le même modèle. Comprendre leurs hypothèses et savoir les articuler.',
    category: 'Méthode',
    author: 'Équipe AuditIQ',
    role: 'Recherche & conformité · AuditIQ',
    date: '2026-04-10',
    readMinutes: 7,
    body: [
      {
        kind: 'p',
        text: 'Parité démographique et égalité des chances sont les deux métriques de fairness les plus citées. Elles répondent à des questions différentes — et peuvent donner des verdicts opposés sur le **même modèle**.',
      },
      { kind: 'h2', text: '01 — Deux définitions' },
      {
        kind: 'compare',
        left: {
          title: 'Parité démographique',
          items: [
            'Les taux de décision favorable doivent être proches entre groupes, indépendamment de la « vérité terrain ». Elle vise l\'égalité de résultat.',
          ],
        },
        right: {
          title: 'Égalité des chances',
          items: [
            'À mérite égal (même issue réelle), les taux de vrais positifs doivent être proches entre groupes. Elle vise l\'égalité de traitement à profil égal.',
          ],
        },
      },
      { kind: 'h2', text: '02 — Pourquoi elles divergent' },
      {
        kind: 'p',
        text: 'Si la distribution de la « vérité terrain » diffère entre groupes, satisfaire l\'une éloigne souvent de l\'autre. Des résultats théoriques montrent qu\'on ne peut généralement pas satisfaire toutes les notions de fairness simultanément.',
      },
      { kind: 'h2', text: '03 — Laquelle choisir' },
      {
        kind: 'ul',
        items: [
          'Quand la vérité terrain est fiable et pertinente, l\'égalité des chances est souvent plus juste.',
          'Quand la vérité terrain est elle-même suspecte de biais historique, la parité démographique protège mieux.',
          'Le contexte réglementaire et métier doit trancher — pas un réglage par défaut.',
        ],
      },
      { kind: 'h2', text: '04 — En pratique' },
      {
        kind: 'p',
        text: 'AuditIQ calcule les deux et signale leurs tensions, plutôt que d\'imposer une seule définition. Le choix final est documenté, ce qui est précisément ce qu\'attend un auditeur.',
      },
      {
        kind: 'disclaimer',
        text: '**Avertissement.** Cet article est une synthèse à visée d\'information, à jour à sa date de publication, et ne constitue pas un conseil juridique. Reportez-vous aux textes officiels et à votre conseil pour toute décision de conformité.',
      },
    ],
  },

  // ─── 3. article-10-gouvernance-donnees ───────────────────────────────────────
  {
    slug: 'article-10-gouvernance-donnees',
    title: 'Article 10 de l\'AI Act : « gouvernance des données » en pratique.',
    lede:
      'Lecture de l\'article qui fonde l\'obligation d\'auditer les biais des systèmes à haut risque, paragraphe par paragraphe.',
    category: 'AI Act',
    author: 'Équipe AuditIQ',
    role: 'Recherche & conformité · AuditIQ',
    date: '2026-04-24',
    readMinutes: 9,
    body: [
      {
        kind: 'p',
        text: 'L\'**article 10** du Règlement (UE) 2024/1689 impose des exigences précises sur les jeux de données d\'entraînement, de validation et de test des systèmes à haut risque. C\'est le fondement réglementaire de l\'audit de fairness.',
      },
      { kind: 'h2', text: '01 — Les exigences clés' },
      {
        kind: 'p',
        text: 'L\'article demande des jeux de données **pertinents, suffisamment représentatifs, exempts d\'erreurs autant que possible et complets** au regard de la finalité. Il impose aussi un **examen des biais possibles** susceptibles d\'affecter la santé, la sécurité ou les droits fondamentaux.',
      },
      { kind: 'h2', text: '02 — L\'examen des biais' },
      {
        kind: 'p',
        text: 'Le texte demande explicitement des mesures appropriées pour détecter, prévenir et atténuer les biais. C\'est là qu\'intervient la mesure des écarts entre groupes : sans elle, l\'obligation ne peut être documentée.',
      },
      { kind: 'h2', text: '03 — Qui est concerné' },
      {
        kind: 'p',
        text: 'L\'article 10 s\'applique aux systèmes à haut risque, notamment ceux de l\'Annexe III (emploi, accès aux services essentiels comme le crédit, etc.). Les obligations correspondantes s\'appliquent à partir du 2 août 2026.',
      },
      { kind: 'h2', text: '04 — En pratique' },
      {
        kind: 'p',
        text: 'Concrètement, satisfaire l\'article 10 suppose : documenter la provenance et la représentativité des données, mesurer les écarts par sous-groupe, et conserver une trace auditable. AuditIQ automatise cette chaîne et produit un rapport aligné sur l\'Annexe IV.',
      },
      {
        kind: 'sources',
        items: [
          {
            title: 'Règlement (UE) 2024/1689 — texte officiel',
            url: 'https://eur-lex.europa.eu/eli/reg/2024/1689/oj',
          },
          {
            title: 'Commission européenne — cadre réglementaire IA',
            url: 'https://digital-strategy.ec.europa.eu/fr/policies/regulatory-framework-ai',
          },
        ],
      },
      {
        kind: 'disclaimer',
        text: '**Avertissement.** Cet article est une synthèse à visée d\'information, à jour à sa date de publication, et ne constitue pas un conseil juridique. Reportez-vous aux textes officiels et à votre conseil pour toute décision de conformité.',
      },
    ],
  },

  // ─── 4. counterfactual-prompt-pairs ──────────────────────────────────────────
  {
    slug: 'counterfactual-prompt-pairs',
    title: 'Counterfactual prompt pairs : auditer un LLM, méthode de référence.',
    lede:
      'Pourquoi cette méthode, comment construire ses prompts pairs, quels biais elle révèle — et lesquels elle ne voit pas.',
    category: 'Méthode · LLM',
    author: 'Équipe AuditIQ',
    role: 'Recherche & conformité · AuditIQ',
    date: '2026-04-28',
    readMinutes: 6,
    body: [
      {
        kind: 'p',
        text: 'Pour auditer un chatbot ou un assistant LLM, on ne peut pas calculer des métriques tabulaires classiques. La méthode de référence est celle des **prompts pairs contrefactuels** : deux requêtes identiques, ne variant que sur un attribut protégé.',
      },
      { kind: 'h2', text: '01 — Le principe' },
      {
        kind: 'p',
        text: 'On construit des paires de prompts strictement identiques à un détail près — le genre, l\'origine, l\'âge évoqué. Si la réponse change de façon systématique entre les deux, c\'est le signe d\'un traitement différencié.',
      },
      { kind: 'h2', text: '02 — Construire ses paires' },
      {
        kind: 'ul',
        items: [
          'Partir de cas d\'usage réels du système (SAV, RH, médical).',
          'Varier un seul axe à la fois pour isoler l\'effet.',
          'Couvrir plusieurs formulations pour éviter les artefacts de surface.',
          'Tester en condition de production, sans modifier l\'endpoint.',
        ],
      },
      { kind: 'h2', text: '03 — Ce qu\'on mesure' },
      {
        kind: 'p',
        text: 'Sur chaque paire, on compare la **longueur** de réponse, le **sentiment**, et le **taux de refus** ou de redirection. Un écart récurrent sur un axe (ex. handicap) révèle un biais de traitement.',
      },
      { kind: 'h2', text: '04 — Ses limites' },
      {
        kind: 'p',
        text: 'La méthode révèle les biais de traitement explicites, mais pas les biais de connaissance plus diffus, ni ce que le modèle ne dit pas. Elle se complète d\'une revue qualitative d\'extraits significatifs.',
      },
      {
        kind: 'disclaimer',
        text: '**Avertissement.** Cet article est une synthèse à visée d\'information, à jour à sa date de publication, et ne constitue pas un conseil juridique. Reportez-vous aux textes officiels et à votre conseil pour toute décision de conformité.',
      },
    ],
  },

  // ─── 5. audit-tri-cv ──────────────────────────────────────────────────────────
  {
    slug: 'audit-tri-cv',
    title: 'Auditer un outil de tri de CV, concrètement.',
    lede:
      'Cinq étapes pour une DRH qui veut vérifier son outil de présélection sans équipe data, avec les écueils typiques et un modèle de cahier des charges fournisseur.',
    category: 'Secteur · RH',
    author: 'Équipe AuditIQ',
    role: 'Recherche & conformité · AuditIQ',
    date: '2026-05-05',
    readMinutes: 10,
    body: [
      {
        kind: 'p',
        text: 'Un outil de présélection de CV qui score les candidatures relève, en droit européen, d\'un usage **à haut risque**. Voici comment l\'auditer sans expertise statistique interne.',
      },
      { kind: 'h2', text: '01 — Pourquoi c\'est un enjeu' },
      {
        kind: 'p',
        text: 'Un outil de tri trie aussi, mécaniquement, selon des corrélations apprises. En droit français, l\'article L.1132-1 du Code du travail interdit toute discrimination à l\'embauche ; l\'AI Act ajoute des obligations de documentation et de mesure des biais.',
      },
      { kind: 'h2', text: '02 — Les cinq étapes' },
      {
        kind: 'ul',
        items: [
          '**Cadrer le périmètre.** Quel modèle, quelle décision (présélection, scoring), quelles populations.',
          '**Extraire un échantillon représentatif** des décisions passées, avec la prédiction et, si possible, l\'issue réelle.',
          '**Désigner les attributs sensibles** à surveiller (genre, âge, origine présumée).',
          '**Mesurer les écarts** entre groupes (parité démographique, règle des 4/5, égalité des chances).',
          '**Documenter et corriger** : consigner les résultats, identifier la cause, ajuster le modèle ou le seuil.',
        ],
      },
      { kind: 'h2', text: '03 — Les écueils typiques' },
      {
        kind: 'ul',
        items: [
          'Auditer sur un échantillon trop petit ou non représentatif.',
          'Confondre absence d\'attribut sensible dans le modèle et absence de biais (les proxies existent).',
          'Ne regarder qu\'une seule métrique.',
          'Oublier l\'intersectionnalité (ex. femmes de plus de 50 ans).',
        ],
      },
      { kind: 'h2', text: '04 — Cahier des charges fournisseur' },
      {
        kind: 'p',
        text: 'Exigez de votre fournisseur les éléments minimaux suivants :',
      },
      {
        kind: 'ul',
        items: [
          'La documentation technique du système (finalité, données, performances).',
          'Les performances désagrégées par sous-groupe.',
          'La possibilité d\'exporter les décisions pour audit indépendant.',
          'Un engagement de correction en cas d\'écart avéré.',
        ],
      },
      {
        kind: 'disclaimer',
        text: '**Avertissement.** Cet article est une synthèse à visée d\'information, à jour à sa date de publication, et ne constitue pas un conseil juridique. Reportez-vous aux textes officiels et à votre conseil pour toute décision de conformité.',
      },
    ],
  },

  // ─── 6. scoring-credit-proxies ───────────────────────────────────────────────
  {
    slug: 'scoring-credit-proxies',
    title: 'Scoring crédit et proxies géographiques : le risque du code postal.',
    lede:
      'Comment une variable apparemment neutre peut introduire une discrimination indirecte, ce que dit le cadre juridique, et comment la détecter.',
    category: 'Secteur · Crédit',
    author: 'Équipe AuditIQ',
    role: 'Recherche & conformité · AuditIQ',
    date: '2026-05-02',
    readMinutes: 12,
    body: [
      {
        kind: 'p',
        text: 'Dans un modèle de scoring crédit, le **code postal** est l\'exemple type du *proxy* : une variable légale en apparence, mais fortement corrélée à des critères protégés comme l\'origine présumée. Le résultat peut constituer une **discrimination indirecte**.',
      },
      { kind: 'h2', text: '01 — Qu\'est-ce qu\'un proxy ?' },
      {
        kind: 'p',
        text: 'Un proxy est une variable qui, sans nommer un critère protégé, en porte l\'information. Le code postal corrèle avec la composition sociale et l\'origine présumée d\'un quartier ; l\'utiliser dans une décision de crédit peut reproduire des écarts interdits, même sans intention.',
      },
      { kind: 'h2', text: '02 — Ce que dit le cadre juridique' },
      {
        kind: 'p',
        text: 'Le droit français sanctionne la discrimination, y compris indirecte (article 225-1 du Code pénal, loi de 1972 et suivantes). Le RGPD encadre les décisions entièrement automatisées (article 22). L\'AI Act classe le scoring de crédit parmi les usages à haut risque et impose la gouvernance des données (article 10). La qualification d\'un cas précis relève toutefois du juge et de votre conseil.',
      },
      {
        kind: 'note-info',
        text: 'Cet article décrit des principes généraux. Il ne cite pas de décision de justice précise et ne vaut pas analyse juridique d\'un cas particulier.',
      },
      { kind: 'h2', text: '03 — Comment le détecter' },
      {
        kind: 'p',
        text: 'Deux approches complémentaires : mesurer l\'**information mutuelle** entre une feature (code postal) et un attribut protégé estimé, et détecter les **clusters déviants** par apprentissage non supervisé. Un proxy se révèle quand une variable neutre concentre les décisions défavorables sur un groupe.',
      },
      { kind: 'h2', text: '04 — Comment corriger' },
      {
        kind: 'ul',
        items: [
          'Retirer ou neutraliser la variable proxy et réentraîner.',
          'Recalibrer le seuil de décision par groupe.',
          'Documenter toute justification métier réelle de l\'écart résiduel.',
        ],
      },
      {
        kind: 'disclaimer',
        text: '**Avertissement.** Cet article est une synthèse à visée d\'information, à jour à sa date de publication, et ne constitue pas un conseil juridique. Reportez-vous aux textes officiels et à votre conseil pour toute décision de conformité.',
      },
    ],
  },

  // ─── 7. corriger-proxy-geographique ──────────────────────────────────────────
  {
    slug: 'corriger-proxy-geographique',
    title: 'Corriger un proxy géographique en sept mois : récit d\'une mise en conformité.',
    lede:
      'Calendrier, choix techniques, coûts cachés et leçons retenues — un scénario de remédiation illustratif inspiré de cas clients.',
    category: 'Retour d\'expérience',
    author: 'Équipe AuditIQ',
    role: 'Étude de cas · AuditIQ',
    date: '2026-04-20',
    readMinutes: 11,
    body: [
      {
        kind: 'p',
        text: 'Comment une banque régionale a ramené un modèle de scoring crédit en conformité après la détection d\'un proxy géographique. **Scénario illustratif** reconstitué à partir de cas types, à des fins pédagogiques.',
      },
      { kind: 'h2', text: '01 — Le point de départ' },
      {
        kind: 'p',
        text: 'Un audit révèle qu\'un cluster concentrant 60 % des refus pour 18 % des dossiers est tiré par le code postal, fortement corrélé à l\'origine présumée. Parité démographique à 0,71 sur cet axe : non conforme.',
      },
      { kind: 'h2', text: '02 — Le plan en sept mois' },
      {
        kind: 'timeline',
        items: [
          {
            date: 'Mois 1',
            title: 'Cadrage & gouvernance',
            body: 'Constitution d\'un comité, périmètre, attribution des rôles.',
            current: true,
          },
          {
            date: 'Mois 2–3',
            title: 'Diagnostic approfondi',
            body: 'Audit non supervisé + supervisé, identification des proxies.',
          },
          {
            date: 'Mois 4–5',
            title: 'Remédiation',
            body: 'Retrait de la variable, réentraînement, recalibrage du seuil.',
          },
          {
            date: 'Mois 6',
            title: 'Contre-audit',
            body: 'Vérification du retour en conformité sur toutes les métriques.',
          },
          {
            date: 'Mois 7',
            title: 'Documentation & suivi',
            body: 'Rapport opposable, mise en place du monitoring continu.',
          },
        ],
      },
      { kind: 'h2', text: '03 — Les résultats' },
      {
        kind: 'kpi',
        values: [
          { value: '0,71', label: 'Parité avant' },
          { value: '0,86', label: 'Parité après' },
          { value: '−1,2 %', label: 'Performance globale' },
        ],
      },
      {
        kind: 'p',
        text: 'Le retour en conformité a coûté une légère baisse de précision (−1,2 %), jugée acceptable au regard du risque juridique évité.',
      },
      { kind: 'h2', text: '04 — Les leçons' },
      {
        kind: 'ul',
        items: [
          'Le coût caché n\'est pas technique mais organisationnel : aligner conformité, data et métier.',
          'Recalibrer le seuil est souvent plus efficace que retirer une variable.',
          'Documenter en continu évite de tout refaire au prochain contrôle.',
        ],
      },
      {
        kind: 'disclaimer',
        text: '**Avertissement.** Ce récit est un scénario illustratif reconstitué à partir de cas types. Les chiffres sont fournis à titre pédagogique et ne décrivent pas une organisation réelle nommée.',
      },
    ],
  },

  // ─── 8. ai-act-pme ───────────────────────────────────────────────────────────
  {
    slug: 'ai-act-pme',
    title: 'AI Act pour PME : ce qui change le 2 août 2026.',
    lede:
      'Le compte à rebours est lancé. Voici, sources officielles à l\'appui, quelles obligations s\'appliquent réellement à votre PME, ce que vous devez documenter, et comment cadrer votre mise en conformité sans data team.',
    category: 'Guide · AI Act',
    author: 'Franck FAMBOU',
    role: 'CEO · AuditIQ',
    date: '2026-05-12',
    readMinutes: 14,
    body: [
      {
        kind: 'p',
        text: 'Le règlement européen sur l\'intelligence artificielle — **Règlement (UE) 2024/1689**, dit « AI Act » — est **entré en vigueur le 1ᵉʳ août 2024** et s\'applique par vagues successives. La plus structurante pour les entreprises arrive le **2 août 2026**.',
      },
      {
        kind: 'p',
        text: 'Contrairement à une idée répandue, l\'AI Act ne concerne pas que les géants de la tech. Une PME qui utilise une IA pour **trier des CV**, **scorer une demande de crédit** ou **évaluer un dossier d\'assurance** peut exploiter un système classé « à haut risque » — et hériter à ce titre d\'obligations précises. Cet article fait le point sur le droit publié, avec un lien vers chaque source officielle.',
      },
      { kind: 'h2', text: '01 — Le calendrier d\'application' },
      {
        kind: 'p',
        text: 'L\'AI Act s\'applique de façon échelonnée. Voici les jalons issus du texte officiel :',
      },
      {
        kind: 'timeline',
        items: [
          {
            date: '1ᵉʳ août 2024',
            title: 'Entrée en vigueur',
            body: 'Le règlement entre en vigueur. Le compte à rebours des obligations démarre.',
          },
          {
            date: '2 février 2025',
            title: 'Pratiques interdites & littératie IA',
            body: 'Interdiction des usages à « risque inacceptable » (manipulation, notation sociale, certaines biométries). Obligation de littératie IA des équipes (article 4).',
          },
          {
            date: '2 août 2025',
            title: 'Modèles à usage général & gouvernance',
            body: 'Obligations des fournisseurs de modèles d\'IA à usage général (GPAI), mise en place des autorités nationales et du cadre de sanctions.',
          },
          {
            date: '2 août 2026',
            title: 'Systèmes à haut risque (Annexe III)',
            body: 'Application des obligations pour les systèmes à haut risque de l\'Annexe III, des règles de transparence (article 50), et début de l\'application effective (enforcement).',
            current: true,
          },
          {
            date: '2 août 2027',
            title: 'IA intégrée à des produits réglementés',
            body: 'Application aux systèmes à haut risque relevant de l\'Annexe I (sécurité des produits) et mise en conformité des GPAI mis sur le marché avant août 2025.',
          },
        ],
      },
      { kind: 'h2', text: '02 — Ce que change réellement le 2 août 2026' },
      {
        kind: 'p',
        text: 'À cette date, **la majorité des règles de l\'AI Act deviennent applicables et l\'application effective commence**, au niveau national comme européen. Trois blocs entrent en jeu :',
      },
      {
        kind: 'ul',
        items: [
          '**Les systèmes à haut risque de l\'Annexe III** doivent satisfaire aux exigences du chapitre III (gestion des risques, gouvernance des données, documentation, transparence, supervision humaine, robustesse).',
          '**Les règles de transparence de l\'article 50** s\'appliquent : un système qui interagit avec des personnes ou génère du contenu doit le signaler.',
          '**L\'enforcement démarre** : les autorités compétentes peuvent contrôler et sanctionner. Chaque État membre doit disposer d\'au moins un « bac à sable » réglementaire.',
        ],
      },
      { kind: 'h2', text: '03 — Votre PME est-elle concernée ?' },
      {
        kind: 'p',
        text: 'L\'Annexe III liste **huit domaines** dans lesquels un système d\'IA est présumé à haut risque. Plusieurs touchent directement les usages courants en PME :',
      },
      {
        kind: 'ul',
        items: [
          '**Emploi & gestion des travailleurs** — tri de CV, présélection, évaluation, décisions de promotion ou de licenciement.',
          '**Accès aux services essentiels (privés et publics)** — notamment l\'**évaluation de solvabilité et le scoring crédit**, ainsi que la tarification en assurance vie et santé.',
          '**Biométrie, infrastructures critiques, éducation, migration, justice et processus démocratiques** — les cinq autres domaines.',
        ],
      },
      { kind: 'h2', text: '04 — Les obligations concrètes' },
      {
        kind: 'p',
        text: 'Pour un système à haut risque, le règlement impose notamment :',
      },
      {
        kind: 'ul',
        items: [
          '**Article 9 — Gestion des risques.** Un processus continu d\'identification et d\'atténuation des risques sur tout le cycle de vie.',
          '**Article 10 — Gouvernance des données.** Des jeux d\'entraînement, de validation et de test pertinents, représentatifs et examinés pour détecter d\'éventuels biais. C\'est le cœur de l\'audit de fairness.',
          '**Article 11 & Annexe IV — Documentation technique.** Une documentation auditable décrivant la finalité, la conception et les performances du système.',
          '**Article 12 — Journalisation.** Un enregistrement automatique des événements, conservé pour assurer la traçabilité.',
          '**Articles 13 à 15 — Transparence, supervision humaine, exactitude & robustesse.** Des performances mesurées et désagrégées par sous-groupe.',
          '**Enregistrement & suivi.** Inscription du système dans la base de données européenne avant mise sur le marché (articles 49 et 71) et surveillance après commercialisation (article 72). Une analyse d\'impact sur les droits fondamentaux (FRIA) est requise pour certains déployeurs.',
        ],
      },
      {
        kind: 'callout',
        text: 'AuditIQ outille directement l\'article 10 (détection des biais), l\'article 15 (performances désagrégées) et la documentation de l\'Annexe IV : mesure des écarts entre groupes, explication en langage clair, et rapport opposable horodaté.',
      },
      { kind: 'h2', text: '05 — Les sanctions' },
      {
        kind: 'p',
        text: 'Le règlement prévoit trois paliers d\'amendes. Pour une PME, c\'est le montant le plus *faible* entre la somme fixe et le pourcentage qui s\'applique :',
      },
      {
        kind: 'ul',
        items: [
          '**35 M€ · 7 %** — Pour les **pratiques interdites** (article 5) — jusqu\'à 35 M€ ou 7 % du chiffre d\'affaires annuel mondial.',
          '**15 M€ · 3 %** — Pour le non-respect des **autres obligations**, dont celles des systèmes à haut risque — jusqu\'à 15 M€ ou 3 %.',
          '**7,5 M€ · 1 %** — Pour la fourniture d\'**informations inexactes** aux autorités — jusqu\'à 7,5 M€ ou 1 %.',
        ],
      },
      { kind: 'h2', text: '06 — Point de vigilance : le « Digital Omnibus »' },
      {
        kind: 'p',
        text: 'En novembre 2025, la Commission européenne a présenté un paquet « Digital Omnibus » proposant, entre autres, de **repousser certaines échéances haut risque** en les conditionnant à la disponibilité des normes techniques harmonisées.',
      },
      {
        kind: 'note-warn',
        text: '**À retenir :** cette proposition **n\'est pas adoptée** à ce jour et ne modifie pas le texte en vigueur. La date de référence reste le **2 août 2026**. Suivez le dossier, mais planifiez votre conformité sur le droit publié — pas sur un report hypothétique.',
      },
      { kind: 'h2', text: '07 — Plan d\'action en 6 étapes' },
      {
        kind: 'ul',
        items: [
          '**Inventoriez vos systèmes d\'IA.** Finalité, données utilisées, décisions affectées, populations concernées.',
          '**Classez chaque système** au regard des quatre niveaux de risque et des domaines de l\'Annexe III.',
          '**Vérifiez l\'absence d\'usage interdit** (article 5).',
          '**Auditez les biais** de vos systèmes à haut risque (article 10) et documentez les écarts.',
          '**Constituez la documentation technique** (Annexe IV) et le dispositif de supervision humaine.',
          '**Formez vos équipes** à la littératie IA (article 4) et désignez un référent conformité.',
        ],
      },
      { kind: 'h2', text: '08 — Sources officielles' },
      {
        kind: 'p',
        text: 'Ne vous fiez qu\'aux sources primaires. Voici les références à consulter directement :',
      },
      {
        kind: 'sources',
        items: [
          {
            title: 'Texte officiel — Règlement (UE) 2024/1689',
            url: 'https://eur-lex.europa.eu/eli/reg/2024/1689/oj',
          },
          {
            title: 'Commission européenne — Cadre réglementaire sur l\'IA',
            url: 'https://digital-strategy.ec.europa.eu/fr/policies/regulatory-framework-ai',
          },
          {
            title: 'AI Act Service Desk — Commission européenne',
            url: 'https://ai-act-service-desk.ec.europa.eu/',
          },
          {
            title: 'CNIL — Intelligence artificielle (droit français)',
            url: 'https://www.cnil.fr/fr/intelligence-artificielle',
          },
        ],
      },
      {
        kind: 'disclaimer',
        text: '**Avertissement.** Cet article est une synthèse à visée d\'information, à jour à sa date de publication, et ne constitue pas un conseil juridique. La qualification réglementaire de vos systèmes relève de votre responsable conformité ou de votre conseil. Reportez-vous toujours au texte officiel et à ses mises à jour.',
      },
    ],
  },

  // ─── 9. livre-blanc-audit-ai-act ─────────────────────────────────────────────
  {
    slug: 'livre-blanc-audit-ai-act',
    title: 'Livre blanc : préparer son audit AI Act en PME, en six mois.',
    lede:
      'Méthodologie complète, modèles de documents, check-lists et repères réglementaires. À télécharger gratuitement.',
    category: 'Livre blanc',
    author: 'Équipe AuditIQ',
    role: 'Recherche & conformité · AuditIQ',
    date: '2026-04-15',
    readMinutes: 64,
    body: [
      {
        kind: 'p',
        text: 'Ce livre blanc rassemble la méthode que nous appliquons pour accompagner une PME, de l\'inventaire de ses systèmes d\'IA jusqu\'au rapport opposable. **64 pages, téléchargement gratuit.**',
      },
      { kind: 'h2', text: '01 — Ce qu\'il contient' },
      {
        kind: 'ul',
        items: [
          'Une grille d\'inventaire et de classification des systèmes d\'IA.',
          'Des modèles de documentation technique (Annexe IV).',
          'Des check-lists par jalon réglementaire.',
          'Un calendrier de mise en conformité sur six mois.',
        ],
      },
      { kind: 'h2', text: '02 — À qui il s\'adresse' },
      {
        kind: 'p',
        text: 'Aux responsables conformité, DPO, dirigeants de PME et équipes data qui doivent cadrer leur préparation à l\'AI Act sans partir de zéro.',
      },
      { kind: 'h2', text: '03 — Le télécharger' },
      {
        kind: 'p',
        text: 'Le téléchargement se fait contre une adresse e-mail professionnelle. Aucune donnée n\'est revendue ; désinscription en un clic.',
      },
      {
        kind: 'callout',
        text: 'Le formulaire de téléchargement sera branché à la mise en ligne. En attendant, écrivez-nous pour recevoir le document.',
      },
      {
        kind: 'disclaimer',
        text: '**Avertissement.** Cet article est une synthèse à visée d\'information, à jour à sa date de publication, et ne constitue pas un conseil juridique. Reportez-vous aux textes officiels et à votre conseil pour toute décision de conformité.',
      },
    ],
  },

  // ─── 10. auditiq-v2 ───────────────────────────────────────────────────────────
  {
    slug: 'auditiq-v2',
    title: 'AuditIQ v2 : comparaison entre audits et alertes de dérive.',
    lede:
      'Les nouveautés du printemps : vue de comparaison longitudinale, alertes de dérive automatiques et recommandations améliorées.',
    category: 'Produit',
    author: 'Franck FAMBOU',
    role: 'CEO · AuditIQ',
    date: '2026-04-06',
    readMinutes: 5,
    body: [
      {
        kind: 'p',
        text: 'La version 2 d\'AuditIQ se concentre sur une idée : la conformité n\'est pas un instantané, c\'est un **suivi dans le temps**. Voici les trois nouveautés principales.',
      },
      { kind: 'h2', text: '01 — Comparaison longitudinale' },
      {
        kind: 'p',
        text: 'Vous pouvez désormais comparer deux audits d\'un même modèle et visualiser l\'évolution de chaque métrique. Utile pour prouver une amélioration après remédiation, ou repérer une régression.',
      },
      { kind: 'h2', text: '02 — Alertes de dérive' },
      {
        kind: 'p',
        text: 'AuditIQ surveille vos modèles en continu et vous alerte quand une métrique de fairness franchit un seuil. La conformité devient un signal de monitoring, pas un audit ponctuel.',
      },
      { kind: 'h2', text: '03 — Recommandations améliorées' },
      {
        kind: 'p',
        text: 'Les recommandations sont désormais priorisées par impact estimé et effort, avec une projection du score après application. Vous savez par quoi commencer.',
      },
      {
        kind: 'disclaimer',
        text: '**Avertissement.** Cet article est une synthèse à visée d\'information, à jour à sa date de publication, et ne constitue pas un conseil juridique. Reportez-vous aux textes officiels et à votre conseil pour toute décision de conformité.',
      },
    ],
  },
];

export function getArticleBySlug(slug: string): Article | undefined {
  return ARTICLES.find((a) => a.slug === slug);
}
