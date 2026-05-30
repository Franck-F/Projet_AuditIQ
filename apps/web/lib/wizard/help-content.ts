/**
 * Wizard d'audit — banque de contenu d'aide contextuelle.
 *
 * SP2 expose la structure et un seul stub (canary) pour valider la
 * mécanique de lookup. SP3 alimentera ce record avec les vraies entrées
 * par module/étape/champ au fur et à mesure que les wizards seront construits.
 */

import type { HelpEntry, HelpKey } from './types';

/**
 * Glossaire transversal — termes métier qui reviennent sur plusieurs
 * étapes. Définitions courtes (1-2 phrases).
 */
export const GLOSSARY: Record<string, string> = {
  'attribut protégé':
    "Une caractéristique légalement sensible (sexe, âge, origine...) sur laquelle on cherche d'éventuels écarts de traitement.",
  'décision favorable':
    "La valeur de la décision du modèle qui représente le bénéfice (accepté, embauché, prêt accordé...).",
  'disparate impact':
    'Ratio du taux de décisions favorables entre groupes — convention : seuil ≥ 0.80 selon la règle des 4/5.',
};

/**
 * Banque d'aide indexée par HelpKey.
 *
 * SP2 = un seul stub canary pour les tests. SP3 = entrées réelles
 * par étape/champ (`m1.step3.decision_column`, `m2.step4.k`, etc.).
 */
export const STEP_HELP: Record<HelpKey, HelpEntry> = {
  'canary.test': {
    title: 'Canary',
    body: 'Entrée de test pour valider la mécanique de lookup.',
  },
};

/**
 * Lookup tolérant : renvoie l'entrée si présente, sinon undefined.
 * Le composant HelpPanel décide du fallback à afficher.
 */
export function getHelp(key: HelpKey): HelpEntry | undefined {
  return STEP_HELP[key];
}
