/**
 * Module central des libellés de verdict et de la sémantique du score de risque.
 *
 * Principe produit : « détection ≠ verdict, jamais certifié conforme ».
 * - Aucun « Conforme / Non conforme » à l'écran.
 * - Le score renvoyé par l'API est un score de RISQUE 0–100 (plus bas = mieux).
 *   Sémantique alignée sur la jauge (Gauge.tsx) : ≤ 30 bon, 31–70 vigilance, > 70 élevé.
 */

export type Verdict = 'pass' | 'warn' | 'fail';

/** Libellés canoniques des verdicts — à utiliser partout à l'écran. */
export const VERDICT_LABELS: Record<Verdict, string> = {
  pass: 'Risque faible',
  warn: 'Vigilance',
  fail: 'Risque élevé',
};

/** Libellé unique du score affiché dans l'app. */
export const RISK_SCORE_LABEL = 'Score de risque';

/** Seuils du score de risque — identiques aux segments de la jauge. */
export const RISK_THRESHOLDS = { pass: 30, warn: 70 } as const;

/** Tone (pass/warn/fail) dérivé d'un score de risque 0–100 (plus bas = mieux). */
export function riskTone(score: number): Verdict {
  if (score <= RISK_THRESHOLDS.pass) return 'pass';
  if (score <= RISK_THRESHOLDS.warn) return 'warn';
  return 'fail';
}

/** Libellé d'un verdict, avec repli neutre pour les valeurs inconnues. */
export function verdictLabel(verdict: string | null | undefined): string {
  if (verdict === 'pass' || verdict === 'warn' || verdict === 'fail') {
    return VERDICT_LABELS[verdict];
  }
  return '—';
}

/** Format français d'un nombre (virgule décimale, espace des milliers). */
export function formatNumberFr(value: number, options?: Intl.NumberFormatOptions): string {
  return value.toLocaleString('fr-FR', options);
}

/**
 * Formatage d'une p-value pour affichage non technicien :
 * « p < 0,001 » quand elle est inférieure à 0,001, sinon « p = 0,042 ».
 */
export function formatPValue(p: number): string {
  if (p < 0.001) return 'p < 0,001';
  return `p = ${p.toLocaleString('fr-FR', { maximumFractionDigits: 3 })}`;
}
