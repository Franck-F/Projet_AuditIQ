import type { AuditType, Sector } from './types';

interface CardDef<TValue extends string> {
  value: TValue;
  title: string;
  description: string;
  bullets: string[];
}

export const AUDIT_TYPE_CARDS: ReadonlyArray<CardDef<AuditType>> = [
  {
    value: 'tabular-known',
    title: 'Module 1 — Audit supervisé : j\'ai un attribut protégé à tester',
    description: 'Vous avez un fichier CSV des décisions du modèle ET vous savez quelle caractéristique (sexe, âge, origine…) pourrait être discriminante.',
    bullets: [
      'Écart de taux d\'acceptation entre groupes — règle des 4/5 : le groupe défavorisé doit atteindre au moins 80 % du taux du groupe de référence',
      'Égalité des chances à profil égal (si le résultat réel des décisions est fourni)',
      'Analyse croisée de deux attributs protégés (option)',
    ],
  },
  {
    value: 'tabular-unknown',
    title: 'Module 2 — Détection non supervisée : je cherche où le biais peut se cacher',
    description: 'Vous avez un fichier CSV de décisions mais aucun attribut protégé déclaré. AuditIQ repère automatiquement des groupes au traitement atypique.',
    bullets: [
      'Détection automatique de groupes au traitement atypique',
      'Explication des caractéristiques dominantes de chaque groupe signalé',
      'Aucune donnée sensible requise (compatible RGPD)',
    ],
  },
  {
    value: 'llm-api',
    title: 'Module 3 — Audit LLM & chatbot : j\'audite un agent conversationnel via API',
    description: 'AuditIQ envoie 12 paires de questions quasi identiques (seul l\'attribut protégé change) à votre chatbot et compare les réponses.',
    bullets: [
      '12 paires de questions × 6 catégories d\'attributs protégés',
      'Comparaison du ton, de la longueur et des refus de réponse',
      'AI Act art. 50 + recommandations CNIL',
    ],
  },
];

export const SECTOR_CARDS: ReadonlyArray<CardDef<Sector>> = [
  {
    value: 'credit',
    title: 'Crédit & scoring financier',
    description: 'Octroi de prêt, notation, éligibilité',
    bullets: ['RGPD art. 22 (décision automatisée)', 'Directive sur le crédit'],
  },
  {
    value: 'hr',
    title: 'Ressources humaines',
    description: 'Recrutement, tri de CV, promotion',
    bullets: ['Code du travail L.1132-1', 'AI Act annexe III (RH = système à haut risque)'],
  },
  {
    value: 'insurance',
    title: 'Assurance',
    description: 'Tarification, gestion des sinistres',
    bullets: ['Code des assurances', 'Loi anti-discrimination 2008-496'],
  },
  {
    value: 'other',
    title: 'Autre usage à fort enjeu',
    description: 'Santé, justice, accès aux services publics',
    bullets: ['AI Act art. 6 + annexe III', 'Ancrages spécifiques selon secteur'],
  },
];
