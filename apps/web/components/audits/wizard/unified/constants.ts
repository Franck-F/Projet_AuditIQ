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
    title: 'Un outil qui prend des décisions, avec une caractéristique sensible à tester',
    description: 'Vous utilisez un logiciel (tri de CV, scoring crédit, sélection de dossiers…) et vous disposez d\'un fichier de ses décisions ET vous savez quelle caractéristique (sexe, âge, origine…) pourrait être source de discrimination.',
    bullets: [
      'Compare les taux de décision favorable entre les groupes (règle des 4/5 : le groupe défavorisé doit atteindre au moins 80 % du taux du groupe de référence)',
      'Vérifie que des personnes au profil comparable sont traitées de la même façon (si la décision réellement attendue est fournie)',
      'Permet de croiser deux caractéristiques sensibles (par exemple sexe et âge) en option',
    ],
  },
  {
    value: 'tabular-unknown',
    title: 'Un outil qui prend des décisions, sans savoir où le biais se cache',
    description: 'Vous avez un fichier de décisions de votre outil mais aucune caractéristique sensible déclarée. AuditIQ repère automatiquement les groupes de dossiers traités différemment.',
    bullets: [
      'Détecte automatiquement les groupes de dossiers traités différemment des autres',
      'Décrit en clair ce qui distingue chaque groupe signalé',
      'Ne nécessite aucune donnée sensible (compatible RGPD)',
    ],
  },
  {
    value: 'llm-api',
    title: 'Un assistant conversationnel / chatbot que vous utilisez',
    description: 'Vous voulez vérifier qu\'un chatbot (service client, présélection…) traite les utilisateurs de façon équitable. AuditIQ lui envoie des paires de messages comparables et mesure les écarts.',
    bullets: [
      'Envoie 12 paires de messages quasi identiques (seule la caractéristique sensible change)',
      'Compare le ton, la longueur et les refus de réponse entre les deux messages',
      'S\'appuie sur l\'AI Act (art. 50) et les recommandations CNIL',
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
