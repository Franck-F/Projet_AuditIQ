import path from 'node:path';
import { type Page, expect } from '@playwright/test';

/**
 * Helpers partagés pilotant le flux unifié à 5 étapes du wizard
 * (`app/app/audits/nouveau/page.tsx` + `components/audits/wizard/unified/*`).
 *
 * Navigation : bouton « Continuer → » (étapes 1-4), « Lancer l'audit » (étape 5).
 * Le bouton « Continuer » est DÉSACTIVÉ tant que l'étape courante n'est pas
 * valide (cf. `STEPS[i].isValid` dans la page) — chaque helper remplit donc les
 * champs requis avant de cliquer, et attend que le bouton soit activé.
 *
 * Titres courts des cartes de l'étape 1 (constants.ts ; le détail est dans
 * « En savoir plus ») :
 *   M1 = « Une caractéristique sensible à tester »
 *   M2 = « Un biais à découvrir »
 *   M3 = « Un chatbot à auditer »
 * Secteurs : « Ressources humaines », « Crédit & scoring financier »,
 *            « Assurance », « Autre usage à fort enjeu ».
 */

export const FIXTURES = path.resolve(__dirname, '..', 'fixtures');

export type Sector = 'hr' | 'credit' | 'insurance' | 'other';

const SECTOR_TITLE: Record<Sector, RegExp> = {
  hr: /Ressources humaines/i,
  credit: /Crédit\s*&\s*scoring financier/i,
  insurance: /Assurance/i,
  other: /Autre usage à fort enjeu/i,
};

const TYPE_CARD: Record<'M1' | 'M2' | 'M3', RegExp> = {
  // Titre court de la carte (le détail est dans « En savoir plus »).
  M1: /Une caractéristique sensible à tester/i,
  M2: /Un biais à découvrir/i,
  M3: /Un chatbot à auditer/i,
};

/* ─── Navigation primitives ─────────────────────────────────────────────── */

/** Clique « Continuer → » une fois le bouton activé (étape valide). */
async function clickContinue(page: Page): Promise<void> {
  const next = page.getByRole('button', { name: /Continuer/i });
  await expect(next).toBeEnabled({ timeout: 30_000 });
  await next.click();
}

/** Clique « Lancer l'audit » (étape 5) une fois activé. */
async function clickLaunch(page: Page): Promise<void> {
  const launch = page.getByRole('button', { name: /Lancer l['’]audit/i });
  await expect(launch).toBeEnabled({ timeout: 30_000 });
  await launch.click();
}

/* ─── Étape 1 : Contexte ────────────────────────────────────────────────── */

async function fillStep1Context(
  page: Page,
  module: 'M1' | 'M2' | 'M3',
  sector: Sector,
  title: string,
): Promise<void> {
  await page.getByRole('textbox', { name: /Titre de l['’]audit/i }).fill(title);
  // Cartes Type d'audit — boutons avec aria-pressed ; on cible par le texte du titre.
  await page.getByRole('button', { name: TYPE_CARD[module] }).click();
  // Cartes Secteur — boutons ; on cible par le titre du secteur.
  await page.getByRole('button', { name: SECTOR_TITLE[sector] }).click();
  await clickContinue(page);
}

/* ─── Tabular (M1 / M2) ─────────────────────────────────────────────────── */

export interface TabularAuditOptions {
  module: 'M1' | 'M2';
  sector: Sector;
  title: string;
  csv: string;
  decisionColumn: string;
  favorableValue: string;
  /** M1 uniquement : 1 à 4 attributs protégés (cases à cocher). Ignoré pour M2. */
  protectedAttrs?: string[];
  /** M1 optionnel : colonne vérité-terrain (select des options avancées). */
  groundTruth?: string;
}

/**
 * Pilote le flux complet pour un audit tabulaire (M1 ou M2) puis lance l'audit.
 * Retourne après le clic « Lancer l'audit » — l'appelant attend la redirection.
 */
export async function createTabularAudit(
  page: Page,
  opts: TabularAuditOptions,
): Promise<void> {
  await page.goto('/app/audits/nouveau');

  // Étape 1 — Contexte
  await fillStep1Context(page, opts.module, opts.sector, opts.title);

  // Étape 2 — Données : upload CSV + attendre la fin de l'analyse auto.
  await page.getByTestId('csv-input').setInputFiles(path.join(FIXTURES, opts.csv));
  // Le récapitulatif du dataset (« X lignes, Y colonnes ») confirme l'upload ;
  // « Analyse automatique » apparaît si l'analyse a réussi. On attend l'un OU
  // l'autre, puis on s'assure que « Analyse en cours… » a disparu.
  await expect(
    page.getByText(/Analyse automatique|colonnes/i).first(),
  ).toBeVisible({ timeout: 30_000 });
  await expect(
    page.getByText(/Analyse en cours/i),
  ).toHaveCount(0, { timeout: 30_000 });
  await clickContinue(page);

  // Étape 3 — Configuration
  // Colonne de décision (select) — idempotent (selectOption pose la valeur).
  await page
    .getByRole('combobox', { name: /Colonne de décision/i })
    .selectOption(opts.decisionColumn);
  // Valeur favorable (select) — les options dérivent du profil de la colonne
  // sélectionnée (top_values), donc disponibles après le choix ci-dessus.
  const favorable = page.getByRole('combobox', { name: /Valeur favorable/i });
  await expect(favorable).toBeEnabled({ timeout: 10_000 });
  await favorable.selectOption(opts.favorableValue);

  if (opts.module === 'M1') {
    // Attributs protégés = CASES À COCHER (aria-label = nom de colonne).
    // .check() est idempotent : ne décoche jamais une case déjà cochée par
    // le pré-remplissage de l'analyse.
    const attrs = opts.protectedAttrs ?? [];
    for (const attr of attrs) {
      await page.getByRole('checkbox', { name: attr, exact: true }).check();
    }
    // Vérité-terrain (option avancée, select) — le panneau « Options avancées »
    // s'ouvre automatiquement quand l'analyse détecte une colonne vérité-terrain.
    if (opts.groundTruth) {
      const advancedToggle = page.getByRole('button', { name: /Options avancées/i });
      // Ouvrir le panneau s'il est replié.
      if ((await advancedToggle.getAttribute('aria-expanded')) === 'false') {
        await advancedToggle.click();
      }
      await page
        .getByRole('combobox', { name: /Vérité-terrain/i })
        .selectOption(opts.groundTruth);
    }
  }
  await clickContinue(page);

  // Étape 4 — Vérification (récap des métriques, rien à saisir)
  await clickContinue(page);

  // Étape 5 — Revue & lancement
  await expect(page.getByText(/Récapitulatif/i).first()).toBeVisible();
  await clickLaunch(page);
}

/* ─── LLM (M3) ──────────────────────────────────────────────────────────── */

export interface LlmAuditOptions {
  sector: Sector;
  title: string;
  url: string;
  /** Gabarit JSON (doit contenir {prompt}). Défaut adapté à httpbin. */
  bodyTemplate?: string;
  /** Chemin dot-notation pour extraire la réponse. */
  responsePath?: string;
  method?: string;
  authHeader?: string;
}

/**
 * Pilote le flux complet pour un audit LLM/chatbot (M3).
 *
 * Quand `bodyTemplate`/`responsePath` sont fournis, on bascule le préréglage
 * sur « Personnalisé » AVANT de les saisir : le préréglage « OpenAI » réécrit
 * ces deux champs via un effet (cf. Step3ConfigM3), ce qui écraserait nos
 * valeurs httpbin.
 *
 * Ne clique PAS « Lancer » lorsque `launch: false` (utile pour le cas SSRF qui
 * doit observer l'erreur sans redirection). Par défaut, lance l'audit.
 */
export async function createLlmAudit(
  page: Page,
  opts: LlmAuditOptions,
  { launch = true }: { launch?: boolean } = {},
): Promise<void> {
  await page.goto('/app/audits/nouveau');

  // Étape 1 — Contexte (carte M3)
  await fillStep1Context(page, 'M3', opts.sector, opts.title);

  // Étape 2 — Configuration de l'API : URL (+ méthode / auth si fournis).
  await page.getByRole('textbox', { name: /^URL$/i }).fill(opts.url);
  if (opts.method) {
    await page.getByRole('textbox', { name: /Méthode HTTP/i }).fill(opts.method);
  }
  if (opts.authHeader) {
    await page
      .getByRole('textbox', { name: /En-tête d['’]authentification/i })
      .fill(opts.authHeader);
  }
  await clickContinue(page);

  // Étape 3 — Format des requêtes LLM
  if (opts.bodyTemplate != null || opts.responsePath != null) {
    // Basculer sur « Personnalisé » pour empêcher l'auto-remplissage OpenAI.
    await page.getByRole('combobox', { name: /Préréglage/i }).selectOption('custom');
    if (opts.bodyTemplate != null) {
      await page
        .getByRole('textbox', { name: /Corps de requête/i })
        .fill(opts.bodyTemplate);
    }
    if (opts.responsePath != null) {
      await page
        .getByRole('textbox', { name: /Chemin de la réponse/i })
        .fill(opts.responsePath);
    }
  }
  await clickContinue(page);

  // Étape 4 — Test de connexion (facultatif, on passe directement).
  await clickContinue(page);

  // Étape 5 — Revue & lancement
  await expect(page.getByText(/Récapitulatif/i).first()).toBeVisible();
  if (launch) {
    await clickLaunch(page);
  }
}
