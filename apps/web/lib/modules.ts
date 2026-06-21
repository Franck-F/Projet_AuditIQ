/**
 * Noms canoniques des modules d'audit, du point de vue du déployeur (non-tech).
 * Source unique — à utiliser partout où « M1 / M2 / M3 » ou un nom de module
 * apparaît (pastilles de tableaux, badges, en-têtes, paramètres, rapports).
 *
 * Convention validée :
 *   M1 → « Module 1 · Caractéristique connue » (pastille « Connue »)
 *   M2 → « Module 2 · Biais cachés »          (pastille « Cachés »)
 *   M3 → « Module 3 · Assistant conversationnel » (pastille « Chatbot »)
 */
export type ModuleCode = 'M1' | 'M2' | 'M3';

export interface ModuleNaming {
  /** Numéro de repère, ex. « Module 1 ». */
  number: string;
  /** Nom complet, ex. « Module 1 · Caractéristique connue ». */
  full: string;
  /** Nom humain seul, ex. « Caractéristique connue ». */
  name: string;
  /** Pastille courte pour les tableaux/badges, ex. « Connue ». */
  short: string;
  /** Sous-titre explicatif. */
  tagline: string;
}

const MODULES: Record<ModuleCode, ModuleNaming> = {
  M1: {
    number: 'Module 1',
    full: 'Module 1 · Caractéristique connue',
    name: 'Caractéristique connue',
    short: 'Connue',
    tagline: 'Vous savez quelle caractéristique pourrait discriminer (sexe, âge, origine…).',
  },
  M2: {
    number: 'Module 2',
    full: 'Module 2 · Biais cachés',
    name: 'Biais cachés',
    short: 'Cachés',
    tagline: 'AuditIQ repère les groupes traités différemment, sans rien déclarer.',
  },
  M3: {
    number: 'Module 3',
    full: 'Module 3 · Assistant conversationnel',
    name: 'Assistant conversationnel',
    short: 'Chatbot',
    tagline: "Vous vérifiez l'équité d'un chatbot / assistant conversationnel.",
  },
};

const AUDIT_TYPE_TO_MODULE: Record<string, ModuleCode> = {
  'tabular-known': 'M1',
  'tabular-unknown': 'M2',
  'llm-api': 'M3',
};

/** Renvoie les noms d'un module à partir de son code (« M1 »/« M2 »/« M3 »). */
export function moduleNaming(code: string | null | undefined): ModuleNaming | null {
  if (!code) return null;
  return MODULES[code as ModuleCode] ?? null;
}

/** Renvoie les noms d'un module à partir d'un audit_type interne du wizard. */
export function moduleNamingFromAuditType(auditType: string): ModuleNaming | null {
  const code = AUDIT_TYPE_TO_MODULE[auditType];
  return code ? MODULES[code] : null;
}
