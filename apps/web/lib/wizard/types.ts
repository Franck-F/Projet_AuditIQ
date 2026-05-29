/**
 * Wizard d'audit — types partagés.
 *
 * HelpKey est string typé : SP2 ne contraint pas la liste exhaustive
 * (SP3 ajoutera les clés concrètes par module/étape). Le runtime
 * tolère les clés absentes via getHelp() → undefined.
 */

export type HelpKey = string;

export interface HelpEntry {
  /** Titre affiché en tête du panneau (texte court). */
  title: string;
  /** Corps en markdown (1-3 paragraphes). */
  body: string;
  /** Exemple concret, optionnel — rendu dans un encart visuel distinct. */
  example?: string;
  /** Lien doc, optionnel — ouvre dans un nouvel onglet. */
  learnMoreHref?: string;
}

export interface WizardStepDef<TValues = unknown> {
  /** Identifiant unique de l'étape dans le wizard (ex. "step1", "step2"). */
  id: string;
  /** Titre court affiché dans la barre de progression. */
  title: string;
  /**
   * Clé d'aide par défaut quand on arrive sur l'étape (sans focus de champ).
   * Le HelpPanel l'affiche jusqu'au prochain focus.
   */
  helpKey: HelpKey;
  /**
   * Validateur synchrone — retourne true si l'étape est complète et qu'on
   * peut activer "Suivant". WizardShell désactive Next tant que false.
   */
  isValid: (values: TValues) => boolean;
}
