'use client';

import * as React from 'react';
import { Check, Sparkles, Database, Scale, Brain, FileSearch } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

/* ──────────────────────────────────────────────────────────────────────────
   AuditRunningState
   Polished waiting screen while an audit is being computed by the backend.
   The backend doesn't expose per-step progress, so we approximate it with
   a time-based simulation: each phase advances when its expected duration
   has elapsed since `startedAt`, but the LAST phase never "completes" —
   it stays in progress until the parent re-renders with status=completed.
   ────────────────────────────────────────────────────────────────────── */

interface Phase {
  key: string;
  label: string;
  hint: string;
  Icon: typeof Database;
  /** cumulative end second (rough expectation) */
  endsAt: number;
}

const M1_PHASES: Phase[] = [
  {
    key: 'validate',
    label: 'Validation du jeu de données',
    hint: 'Vérification des colonnes, encodage, valeurs manquantes',
    Icon: Database,
    endsAt: 4,
  },
  {
    key: 'metrics',
    label: 'Calcul des métriques de fairness',
    hint: 'Demographic Parity · Equal Opportunity · Equalized Odds',
    Icon: Scale,
    endsAt: 12,
  },
  {
    key: 'gaps',
    label: 'Détection des écarts par groupe',
    hint: 'Règle des 4/5 · décomposition par sous-groupe',
    Icon: FileSearch,
    endsAt: 20,
  },
  {
    key: 'interpret',
    label: 'Génération de l’interprétation',
    hint: 'Explication en langage clair · niveau de risque réglementaire',
    Icon: Brain,
    endsAt: 28,
  },
];

const M2_PHASES: Phase[] = [
  { key: 'validate', label: 'Validation du jeu de données', hint: 'Lecture et nettoyage', Icon: Database, endsAt: 4 },
  { key: 'cluster', label: 'Clustering non supervisé', hint: 'Identification de groupes latents', Icon: Sparkles, endsAt: 14 },
  { key: 'proxy', label: 'Détection de proxies', hint: 'Variables corrélées à des critères protégés', Icon: FileSearch, endsAt: 24 },
  { key: 'interpret', label: 'Synthèse de l’analyse', hint: 'Lecture du risque et recommandations', Icon: Brain, endsAt: 32 },
];

const M3_PHASES: Phase[] = [
  { key: 'prompts', label: 'Chargement de la banque de prompts', hint: '400+ paires de prompts', Icon: Database, endsAt: 5 },
  { key: 'query', label: 'Requêtes au modèle', hint: 'Appels API + collecte des réponses', Icon: Sparkles, endsAt: 30 },
  { key: 'analyze', label: 'Analyse multi-axes', hint: 'Sentiment · refus · longueur · biais', Icon: Scale, endsAt: 45 },
  { key: 'interpret', label: 'Synthèse comparative', hint: 'Score par axe et extraits annotés', Icon: Brain, endsAt: 55 },
];

const TIPS = [
  'AuditIQ s’appuie sur Fairlearn, AIF360 et Aequitas — les références open-source de la fairness ML.',
  'La règle des 4/5 (80 %) est issue de la jurisprudence américaine sur la discrimination à l’embauche.',
  'L’AI Act exige des « performances désagrégées par sous-groupe » à l’article 15 — c’est exactement ce que vous obtiendrez.',
  'Le rapport généré est aligné sur l’annexe IV : il peut servir de pièce auditable pour votre DPO.',
  'Demographic Parity mesure l’écart de taux d’acceptation entre groupes. Equal Opportunity, l’écart de vrais positifs.',
];

interface Props {
  module?: 'M1' | 'M2' | 'M3';
  startedAt?: string | null;
}

function fmtElapsed(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function AuditRunningState({ module = 'M1', startedAt }: Props) {
  const phases =
    module === 'M2' ? M2_PHASES : module === 'M3' ? M3_PHASES : M1_PHASES;

  // Stable fallback: captured once in the lazy initializer (before first render),
  // so Date.now() is never called during the render phase.
  const [fallbackMs] = React.useState(() => Date.now());
  const startMs = React.useMemo(() => {
    if (startedAt) {
      const t = new Date(startedAt).getTime();
      if (Number.isFinite(t)) return t;
    }
    return fallbackMs;
  }, [startedAt, fallbackMs]);

  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  const elapsedSec = Math.max(0, (now - startMs) / 1000);

  const expectedTotal = phases[phases.length - 1]?.endsAt ?? 28;
  /* Cap the visual progress at 92 % — the last bit lands when the parent
     re-renders with status=completed, which lets us avoid promising "done"
     while we're still waiting on the API. */
  const rawT = Math.min(1, elapsedSec / expectedTotal);
  const progressPct = Math.min(92, rawT * 100);

  /* Current phase index: largest phase whose endsAt <= elapsedSec.
     The last phase stays "running" once reached. */
  const currentIdx = phases.findIndex((p) => elapsedSec < p.endsAt);
  const activeIdx = currentIdx === -1 ? phases.length - 1 : currentIdx;

  const tipIdx = Math.floor(elapsedSec / 5) % TIPS.length;

  return (
    <div className="page flex-1">
      <div
        className="relative mx-auto max-w-[760px]"
        style={{ paddingBlock: 'clamp(24px, 4vw, 48px)' }}
      >
        {/* Decorative radial glow that drifts subtly */}
        <div
          aria-hidden
          className="audit-running-glow pointer-events-none absolute inset-x-0 -top-10 mx-auto h-72 w-72 rounded-full opacity-50 blur-3xl"
          style={{
            background:
              'radial-gradient(circle, var(--accent-soft) 0%, transparent 70%)',
          }}
        />

        <Card style={{ position: 'relative', padding: '32px 36px' }}>
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 16,
              marginBottom: 20,
            }}
          >
            <div>
              <p
                className="audit-running-pulse"
                style={{
                  fontFamily: 'var(--mono)',
                  fontSize: 11,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: 'var(--accent)',
                  marginBottom: 6,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <span className="audit-running-dot" />
                Analyse en cours
              </p>
              <h1
                style={{
                  fontSize: 22,
                  fontWeight: 600,
                  letterSpacing: '-0.02em',
                  lineHeight: 1.2,
                }}
              >
                Calcul des métriques de fairness…
              </h1>
              <p
                style={{
                  marginTop: 6,
                  fontSize: 13.5,
                  color: 'var(--fg-secondary)',
                  lineHeight: 1.5,
                }}
              >
                Cela prend généralement entre 15 et 45 secondes selon la taille
                du dataset.
              </p>
            </div>
            <div
              style={{
                textAlign: 'right',
                fontFamily: 'var(--mono)',
                color: 'var(--fg-muted)',
                fontSize: 12,
                letterSpacing: '0.06em',
              }}
            >
              <div style={{ textTransform: 'uppercase', marginBottom: 4 }}>
                Temps écoulé
              </div>
              <div
                className="tnum"
                style={{ fontSize: 24, color: 'var(--fg)', fontWeight: 500 }}
              >
                {fmtElapsed(elapsedSec)}
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progressPct)}
            aria-label="Progression de l'audit"
            style={{
              position: 'relative',
              height: 6,
              background: 'var(--surface-2)',
              borderRadius: 99,
              overflow: 'hidden',
              marginBottom: 28,
            }}
          >
            <div
              className="audit-running-bar"
              style={{
                position: 'absolute',
                inset: 0,
                width: `${progressPct}%`,
                background: 'var(--accent)',
                borderRadius: 99,
                transition: 'width .4s var(--ease, ease-out)',
              }}
            />
          </div>

          {/* Phase list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {phases.map((phase, i) => {
              const status =
                i < activeIdx
                  ? 'done'
                  : i === activeIdx
                    ? 'active'
                    : 'pending';
              const Icon = phase.Icon;
              return (
                <div
                  key={phase.key}
                  className={cn(
                    'audit-phase-row',
                    status === 'active' && 'is-active',
                    status === 'done' && 'is-done',
                  )}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    padding: '12px 14px',
                    borderRadius: 10,
                    border: '1px solid var(--border-subtle)',
                    background:
                      status === 'active' ? 'var(--surface-2)' : 'transparent',
                    transition:
                      'background-color .3s, border-color .3s, opacity .3s',
                    opacity: status === 'pending' ? 0.55 : 1,
                  }}
                >
                  <span
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      display: 'grid',
                      placeItems: 'center',
                      background:
                        status === 'done'
                          ? 'var(--accent-soft)'
                          : status === 'active'
                            ? 'var(--accent-soft)'
                            : 'var(--surface-2)',
                      border:
                        status === 'done' || status === 'active'
                          ? '1px solid var(--accent-border)'
                          : '1px solid var(--border-subtle)',
                      color:
                        status === 'done' || status === 'active'
                          ? 'var(--accent)'
                          : 'var(--fg-muted)',
                      flexShrink: 0,
                    }}
                  >
                    {status === 'done' ? (
                      <Check size={16} strokeWidth={2.4} />
                    ) : status === 'active' ? (
                      <span className="audit-phase-spinner" />
                    ) : (
                      <Icon size={15} />
                    )}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 500,
                        color:
                          status === 'pending'
                            ? 'var(--fg-secondary)'
                            : 'var(--fg)',
                      }}
                    >
                      {phase.label}
                    </div>
                    <div
                      style={{
                        marginTop: 2,
                        fontSize: 12,
                        color: 'var(--fg-muted)',
                      }}
                    >
                      {phase.hint}
                    </div>
                  </div>
                  <span
                    style={{
                      fontFamily: 'var(--mono)',
                      fontSize: 11,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      color:
                        status === 'done'
                          ? 'var(--accent)'
                          : status === 'active'
                            ? 'var(--accent)'
                            : 'var(--fg-muted)',
                    }}
                  >
                    {status === 'done'
                      ? 'Terminé'
                      : status === 'active'
                        ? 'En cours'
                        : 'En attente'}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Rotating tip */}
          <div
            key={tipIdx}
            className="audit-running-tip"
            style={{
              marginTop: 24,
              padding: '14px 16px',
              borderRadius: 10,
              background: 'var(--surface-2)',
              border: '1px solid var(--border-subtle)',
              borderLeft: '3px solid var(--accent)',
              fontSize: 13,
              color: 'var(--fg-secondary)',
              lineHeight: 1.55,
              display: 'flex',
              gap: 10,
              alignItems: 'flex-start',
            }}
          >
            <Sparkles
              size={14}
              style={{
                color: 'var(--accent)',
                flexShrink: 0,
                marginTop: 2,
              }}
            />
            <span>
              <strong style={{ color: 'var(--fg)', fontWeight: 500 }}>
                Le saviez-vous —{' '}
              </strong>
              {TIPS[tipIdx]}
            </span>
          </div>
        </Card>

        <p
          style={{
            marginTop: 14,
            textAlign: 'center',
            fontSize: 12,
            color: 'var(--fg-muted)',
          }}
        >
          Vous pouvez fermer cet onglet — l’audit continue côté serveur. Vous
          serez notifié à la fin.
        </p>
      </div>
    </div>
  );
}
