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

  // Unified wizard (R2)
  'wizard.step1': {
    title: 'Pourquoi définir un contexte ?',
    body: "Le cadre d'usage détermine les seuils réglementaires appliqués. Un modèle de scoring crédit relève du RGPD et de la directive sur le crédit ; un outil RH relève du droit du travail. AuditIQ adapte automatiquement les métriques et les seuils légaux.",
  },
  'wizard.step1.title': {
    title: 'Titre de l\'audit',
    body: 'Un nom court (3-50 caractères) qui identifie l\'audit dans le tableau de bord et les rapports.',
  },
  'wizard.step1.audit_type': {
    title: 'Type d\'audit',
    body: "Trois choix possibles selon votre artefact : un modèle ML tabulaire avec un attribut sensible déjà identifié, un modèle ML tabulaire pour lequel vous cherchez où le biais peut se cacher, ou un chatbot/LLM accessible via une API REST.",
  },
  'wizard.step1.sector': {
    title: 'Secteur d\'usage',
    body: "Le secteur détermine les ancrages réglementaires affichés dans le rapport (RGPD, droit du travail, code des assurances…) mais ne change pas le calcul des métriques.",
  },
  'wizard.step2': {
    title: 'Source de données',
    body: "Selon le type d'audit : importez un CSV (modèle ML) ou configurez l'URL de l'API du chatbot. AuditIQ ne stocke jamais les données brutes — seules les métriques agrégées sont conservées.",
  },
  'wizard.step2.upload': {
    title: 'Import du CSV',
    body: "Glissez-déposez votre CSV. AuditIQ analyse automatiquement les colonnes pour proposer la colonne de décision et l'attribut protégé probables.",
    example: 'Un CSV de 1 000 décisions de crédit avec colonnes : sex, age, income, approved.',
  },
  'wizard.step2.url': {
    title: 'URL de l\'API du chatbot',
    body: "Endpoint HTTPS publiquement résolvable. Les URLs internes (10.x, 127.0.0.1, métadonnées cloud) sont refusées (anti-SSRF).",
    example: 'https://api.openai.com/v1/chat/completions',
  },
  'wizard.step2.auth_header': {
    title: 'En-tête d\'authentification',
    body: "Bearer token ou clé API. Le secret est utilisé pour les appels uniquement, JAMAIS persisté en base.",
    example: 'Bearer sk-proj-abc123...',
  },
  'wizard.step3': {
    title: 'Configuration de l\'audit',
    body: "Précisez les colonnes à auditer (CSV) ou le format des requêtes (LLM). AuditIQ propose automatiquement les meilleurs candidats.",
  },
  'wizard.step3.decision_column': {
    title: 'Colonne de décision',
    body: "Colonne qui contient la sortie du modèle : acceptation/refus, score, classification.",
    example: '« approved » ou « loan_status »',
  },
  'wizard.step3.favorable_value': {
    title: 'Valeur favorable',
    body: "Valeur qui représente le bénéfice (accepté, embauché, prêt accordé). On vérifie son attribution équitable.",
  },
  'wizard.step3.protected_attribute': {
    title: 'Attribut protégé',
    body: "Caractéristique légalement sensible (sexe, âge, origine…) sur laquelle mesurer l'écart de traitement.",
    example: '« sex », « age_group », « origine »',
  },
  'wizard.step3.body_template': {
    title: 'Corps de requête (gabarit JSON)',
    body: "Le JSON envoyé à votre API. Doit contenir le placeholder {prompt} (sans guillemets autour) — AuditIQ y injecte chaque prompt encodé JSON-safe.",
    example: '{"messages":[{"role":"user","content":"{prompt}"}]}',
  },
  'wizard.step3.response_path': {
    title: 'Chemin de la réponse',
    body: "Chemin dot-notation vers le champ texte dans la réponse JSON. AuditIQ extrait cette valeur pour analyse.",
    example: 'choices.0.message.content',
  },
  'wizard.step4': {
    title: 'Vérification',
    body: "Avant le lancement : récap des métriques qui seront produites, options avancées si pertinent, ou test de connexion pour le LLM.",
  },
  'wizard.step4.metrics': {
    title: 'Métriques de fairness',
    body: "AuditIQ produit toujours le Disparate Impact + la règle des 4/5. Si vous avez fourni une colonne vérité-terrain, Equal Opportunity et Equalized Odds sont ajoutés.",
  },
  'wizard.step4.advanced': {
    title: 'Paramètres avancés (M2)',
    body: "Les valeurs par défaut (k=5, déviation 20 pp, alpha 0.05) conviennent à la plupart des cas. N'ajustez que si vous savez ce que vous faites.",
  },
  'wizard.step4.test_connection': {
    title: 'Tester la connexion',
    body: "Étape facultative : envoie un prompt anodin (« Bonjour ») à votre chatbot pour valider la config avant l'audit complet (12 paires × 6 catégories).",
  },
  'wizard.step5': {
    title: 'Récapitulatif',
    body: "Vérifiez la config avant de lancer. M1/M2 prennent 5-30 secondes ; M3 prend 1-3 minutes selon la latence du chatbot.",
  },
};

/**
 * Lookup tolérant : renvoie l'entrée si présente, sinon undefined.
 * Le composant HelpPanel décide du fallback à afficher.
 */
export function getHelp(key: HelpKey): HelpEntry | undefined {
  return STEP_HELP[key];
}
