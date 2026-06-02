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
    title: 'Modèle ML tabulaire — j\'ai un attribut sensible à tester',
    description: 'Audit supervisé classique : vous avez un CSV de décisions du modèle ET vous savez quelle caractéristique (sexe, âge, origine…) pourrait être discriminante.',
    bullets: ['Disparate Impact + règle des 4/5', 'Demographic Parity, Equal Opportunity, Equalized Odds', 'Analyse intersectionnelle 2-voies (option)'],
  },
  {
    value: 'tabular-unknown',
    title: 'Modèle ML tabulaire — je cherche où le biais peut se cacher',
    description: 'Détection non supervisée : vous avez un CSV de décisions mais aucun attribut sensible déclaré. AuditIQ découvre des clusters de traitement déviants à partir des features comportementales.',
    bullets: ['KMeans + χ² par cluster', 'Caractérisation top-3 features par cluster déviant', 'Aucune donnée sensible requise (RGPD-friendly)'],
  },
  {
    value: 'llm-api',
    title: 'Chatbot / LLM — j\'audite un agent conversationnel via API',
    description: 'Audit LangBiTe : AuditIQ envoie 12 paires de prompts × 6 catégories d\'attributs protégés à votre chatbot et mesure les écarts de traitement.',
    bullets: ['12 paires de prompts paired-counterfactual', 'Métriques : sentiment, longueur, refus structuré', 'AI Act art. 50 + recommandations CNIL'],
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
