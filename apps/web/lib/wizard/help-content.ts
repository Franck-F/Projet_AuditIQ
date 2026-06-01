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

  // M1 — Audit supervisé
  'm1.step1': {
    title: 'Donnez un nom à votre audit',
    body: "Choisissez un titre court et descriptif. Il vous servira à retrouver ce rapport plus tard dans le tableau de bord.",
    example: '« Audit recrutement Q1 2026 » ou « Modèle scoring crédit v2 »',
  },
  'm1.step1.title': {
    title: 'Titre de l\'audit',
    body: 'Un nom court (3-50 caractères) qui identifie l\'audit. Apparaît dans le tableau de bord et les rapports PDF/Excel.',
    example: '« Audit recrutement Q1 2026 »',
  },
  'm1.step2': {
    title: 'Importez votre jeu de données',
    body: "Vous pouvez glisser-déposer un fichier CSV, choisir un exemple, ou importer depuis une source externe. Après l'import, AuditIQ analyse automatiquement vos colonnes pour suggérer les bons paramètres.",
    example: 'Un CSV de 1 000 décisions de crédit avec colonnes : sex, age, income, approved.',
  },
  'm1.step3': {
    title: 'Quelle décision allons-nous auditer ?',
    body: "Indiquez quelle colonne contient la décision du modèle, et quelle valeur représente une issue favorable pour la personne (acceptation, embauche, prêt accordé, etc.).",
  },
  'm1.step3.decision_column': {
    title: 'Colonne de décision',
    body: "C'est la colonne qui contient la sortie de votre modèle : acceptation/refus, score, classification. AuditIQ propose la plus probable d'après le nom et la cardinalité.",
    example: "Pour un audit de prêt bancaire, ce serait la colonne « approved » ou « loan_status ».",
  },
  'm1.step3.favorable_value': {
    title: 'Valeur favorable',
    body: "La valeur qui représente le bénéfice : « oui », « accepté », « 1 ». On vérifiera si cette valeur est attribuée équitablement selon votre attribut protégé.",
    example: "Si votre colonne « approved » contient « 0 » (refusé) et « 1 » (accepté), la valeur favorable est « 1 ».",
  },
  'm1.step4': {
    title: 'Sur quelle caractéristique chercher des écarts ?',
    body: "Choisissez l'attribut protégé (sexe, âge, origine…) sur lequel mesurer un éventuel écart de traitement. Vous pouvez aussi ajouter des options avancées : groupe de référence, vérité-terrain, analyse intersectionnelle.",
  },
  'm1.step4.protected_attribute': {
    title: 'Attribut protégé',
    body: "Une caractéristique légalement sensible. AuditIQ propose la plus plausible d'après le nom de colonne et la corrélation avec la décision (test du χ²).",
    example: "« sex », « age_group », « origine »",
    learnMoreHref: '/docs/concepts/attribut-protege',
  },
  'm1.step4.privileged_value': {
    title: 'Groupe de référence (facultatif)',
    body: "Valeur de l'attribut protégé considérée comme « groupe de référence » pour le calcul du Disparate Impact. Si vous laissez vide, AuditIQ utilise le groupe au plus fort taux d'acceptation.",
    example: "Pour « sex », mettre « M » fixe les hommes comme référence ; sinon AuditIQ détecte automatiquement.",
  },
  'm1.step4.ground_truth_column': {
    title: 'Colonne vérité-terrain (facultatif)',
    body: "Si vous avez la « vraie » étiquette pour chaque ligne (pas seulement la prédiction du modèle), AuditIQ calculera Equal Opportunity et Equalized Odds en plus du Disparate Impact.",
    example: "Une colonne « actually_repaid » à côté de la colonne « approved » du modèle.",
  },
  'm1.step4.secondary_protected_attribute': {
    title: 'Attribut secondaire — analyse intersectionnelle (facultatif)',
    body: "Pour croiser deux caractéristiques (ex. genre × âge) et détecter des biais qui n'apparaissent qu'à l'intersection (paradoxe de Simpson).",
    example: "Si attribut principal = « sex » et secondaire = « age_group », on auditera chaque combinaison (F-jeune, F-âgé, M-jeune, M-âgé).",
  },
  'm1.step5': {
    title: 'Récapitulatif',
    body: "Vérifiez les paramètres avant de lancer l'audit. Le calcul prend généralement 5-30 secondes selon la taille du dataset. Vous pourrez télécharger les rapports Excel et PDF une fois terminé.",
  },

  // M2 — Détection non supervisée
  'm2.step1': {
    title: 'Donnez un nom à votre détection',
    body: "Choisissez un titre court et descriptif. La détection non supervisée cherche des groupes de décisions inhabituels sans connaître l'attribut sensible.",
    example: '« Détection biais octrois crédit 2026 »',
  },
  'm2.step1.title': {
    title: 'Titre de la détection',
    body: 'Un nom court (3-50 caractères) qui identifie l\'audit. Apparaît dans le tableau de bord et les rapports.',
  },
  'm2.step2': {
    title: 'Importez votre jeu de données',
    body: "Importez le CSV des décisions à analyser. Inutile d'inclure un attribut protégé : M2 détecte les écarts à partir des features comportementales (montant, durée, ancienneté, etc.).",
    example: 'Un CSV de 1 000 décisions de crédit avec colonnes : montant, duree, garantie, anciennete, decision.',
  },
  'm2.step3': {
    title: 'Quelle décision auditer ?',
    body: "Indiquez la colonne de décision et la valeur favorable. M2 mesurera comment cette valeur se distribue entre les clusters découverts automatiquement.",
  },
  'm2.step3.decision_column': {
    title: 'Colonne de décision',
    body: "Colonne qui contient la sortie binaire ou catégorielle du modèle. AuditIQ propose la plus probable.",
    example: '« accorde » avec valeurs 0 / 1.',
  },
  'm2.step3.favorable_value': {
    title: 'Valeur favorable',
    body: "Valeur représentant le bénéfice (accordé, accepté, 1). M2 mesure le taux de cette valeur dans chaque cluster.",
  },
  'm2.step4': {
    title: 'Paramètres avancés (facultatif)',
    body: "Les valeurs par défaut conviennent à la plupart des cas (k=5 clusters, seuil 20 pp, alpha 0.05). N'ajustez que si vous savez ce que vous faites — par exemple plus de clusters sur un grand dataset.",
  },
  'm2.step4.k': {
    title: 'Nombre de clusters (k)',
    body: "Nombre de groupes que KMeans cherchera. Plus k est grand, plus la segmentation est fine — mais aussi plus sensible au bruit. Par défaut k=5 convient à 100-10 000 lignes.",
    example: 'k=3 pour un petit dataset (<200 lignes), k=8 pour un grand (>10 000).',
  },
  'm2.step4.deviation_pp': {
    title: 'Seuil de déviation (points)',
    body: "Un cluster est considéré « déviant » si son taux de décision favorable s'écarte de cette valeur (en points de pourcentage) du taux global. 20 pp = écart d'environ 20 points avec la moyenne.",
    example: 'Taux global 50 %, seuil 20 pp → un cluster à 25 % ou à 75 % est marqué déviant.',
  },
  'm2.step4.chi2_alpha': {
    title: 'Seuil χ² (alpha)',
    body: "Niveau de significativité du test du chi-deux d'indépendance. 0.05 = on accepte 5 % de chance de fausse alerte.",
    example: 'alpha=0.01 (plus strict), 0.05 (standard), 0.10 (plus permissif).',
  },
  'm2.step5': {
    title: 'Récapitulatif',
    body: "Vérifiez les paramètres avant de lancer la détection. KMeans + chi² prennent généralement 5-30 secondes selon la taille du dataset.",
  },
};

/**
 * Lookup tolérant : renvoie l'entrée si présente, sinon undefined.
 * Le composant HelpPanel décide du fallback à afficher.
 */
export function getHelp(key: HelpKey): HelpEntry | undefined {
  return STEP_HELP[key];
}
