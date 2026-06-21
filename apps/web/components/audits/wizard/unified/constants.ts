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
    title: 'Une caractéristique sensible à tester',
    description: 'Vous utilisez un logiciel qui prend des décisions (tri de CV, scoring crédit, sélection de dossiers…), vous disposez d\'un fichier de ses décisions ET vous savez quelle caractéristique (sexe, âge, origine…) pourrait être source de discrimination.',
    bullets: [
      'Compare les taux de décision favorable entre les groupes (règle des 4/5 : le groupe défavorisé doit atteindre au moins 80 % du taux du groupe de référence)',
      'Vérifie que des personnes au profil comparable sont traitées de la même façon (si la décision réellement attendue est fournie)',
      'Permet de croiser deux caractéristiques sensibles (par exemple sexe et âge) en option',
    ],
  },
  {
    value: 'tabular-unknown',
    title: 'Un biais à découvrir',
    description: 'Vous avez un fichier de décisions de votre outil, mais sans savoir où le biais se cache : aucune caractéristique sensible n\'est déclarée. AuditIQ repère automatiquement les groupes de dossiers traités différemment.',
    bullets: [
      'Détecte automatiquement les groupes de dossiers traités différemment des autres',
      'Décrit en clair ce qui distingue chaque groupe signalé',
      'Ne nécessite aucune donnée sensible (compatible RGPD)',
    ],
  },
  {
    value: 'llm-api',
    title: 'Un chatbot à auditer',
    description: 'Vous voulez vérifier qu\'un assistant conversationnel / chatbot (service client, présélection…) traite les utilisateurs de façon équitable. AuditIQ lui envoie des paires de messages comparables et mesure les écarts.',
    bullets: [
      'Envoie 12 paires de messages quasi identiques (seule la caractéristique sensible change)',
      'Compare le ton, la longueur et les refus de réponse entre les deux messages',
      'S\'appuie sur l\'AI Act (art. 50) et les recommandations CNIL',
    ],
  },
];

/** Groupe d'usage pour le regroupement (`<optgroup>`) de la liste secteur. */
export type SectorGroup =
  | 'Haut risque (AI Act Annexe III)'
  | 'Autres usages réglementés';

export interface SectorOption {
  value: Sector;
  label: string;
  group: SectorGroup;
}

/**
 * Liste des 11 secteurs d'usage proposés dans le wizard (étape 1), regroupés
 * pour la liste déroulante. Chaque secteur pilote, côté API, les références
 * légales des recommandations (cf. `recommendations_catalog.py`).
 */
export const SECTORS: ReadonlyArray<SectorOption> = [
  // Groupe « Haut risque (AI Act Annexe III) »
  { value: 'hr', label: 'Ressources humaines / Recrutement', group: 'Haut risque (AI Act Annexe III)' },
  { value: 'credit', label: 'Crédit & scoring financier', group: 'Haut risque (AI Act Annexe III)' },
  { value: 'insurance', label: 'Assurance', group: 'Haut risque (AI Act Annexe III)' },
  { value: 'health', label: 'Santé & médico-social', group: 'Haut risque (AI Act Annexe III)' },
  { value: 'education', label: 'Éducation & formation', group: 'Haut risque (AI Act Annexe III)' },
  { value: 'public_services', label: 'Services publics & accès aux droits', group: 'Haut risque (AI Act Annexe III)' },
  { value: 'justice', label: 'Justice & sécurité', group: 'Haut risque (AI Act Annexe III)' },
  // Groupe « Autres usages réglementés »
  { value: 'housing', label: 'Logement & immobilier', group: 'Autres usages réglementés' },
  { value: 'marketing', label: 'Marketing & ciblage publicitaire', group: 'Autres usages réglementés' },
  { value: 'content_moderation', label: 'Modération de contenu', group: 'Autres usages réglementés' },
  { value: 'other', label: 'Autre usage à fort enjeu', group: 'Autres usages réglementés' },
];

/** Ordre d'affichage des groupes dans la liste déroulante. */
export const SECTOR_GROUPS: ReadonlyArray<SectorGroup> = [
  'Haut risque (AI Act Annexe III)',
  'Autres usages réglementés',
];
