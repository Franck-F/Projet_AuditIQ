import { useCurrentFrame } from 'remotion';
import { theme } from '../theme';
import { slideUp, easeFill, fadeIn } from '../ui/anim';
import { StepHeader } from '../ui/StepHeader';

interface Metric {
  label: string;
  target: number;
  threshold: number;
  status: 'warn' | 'pass';
  note: string;
}

const METRICS: Metric[] = [
  {
    label: 'Demographic Parity',
    target: 0.78,
    threshold: 0.8,
    status: 'warn',
    note: 'Sous le seuil 4/5',
  },
  {
    label: 'Equal Opportunity',
    target: 0.92,
    threshold: 0.8,
    status: 'pass',
    note: 'Conforme',
  },
  {
    label: 'Equalized Odds',
    target: 0.74,
    threshold: 0.8,
    status: 'warn',
    note: 'À corriger',
  },
];

const colorFor = (s: Metric['status']) =>
  s === 'pass' ? theme.pass : theme.warn;

export const Scene3Diagnostic: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <>
      <StepHeader
        step="Étape 03"
        title="Recevez le diagnostic"
        caption="Feu tricolore, écarts par groupe, explication en langage clair."
      />

      {/* Ledger card */}
      <div
        style={{
          position: 'absolute',
          top: 380,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
        }}
      >
      <div
        style={{
          width: 1280,
          background: theme.surface,
          border: `1px solid ${theme.border}`,
          borderRadius: 18,
          padding: '26px 32px 30px',
          ...slideUp(frame, 6, 22),
        }}
      >
        {/* Top row */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingBottom: 22,
            borderBottom: `1px solid ${theme.borderSubtle}`,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span
              style={{
                fontFamily: theme.fontMono,
                fontSize: 12,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: theme.fgMuted,
              }}
            >
              AUD-2026-0314
            </span>
            <span
              style={{
                color: theme.fg,
                fontSize: 17,
                fontWeight: 500,
              }}
            >
              Recrutement_2024.csv
            </span>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              ...fadeIn(frame, 95),
            }}
          >
            <div style={{ display: 'flex', gap: 6 }}>
              <span
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 99,
                  background: theme.warn,
                }}
              />
              <span
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 99,
                  background: theme.warn,
                }}
              />
              <span
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 99,
                  background: theme.borderStrong,
                }}
              />
            </div>
            <span
              style={{
                padding: '8px 16px',
                borderRadius: 99,
                background: theme.warnBg,
                border: `1px solid ${theme.warn}`,
                color: theme.warn,
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              Vigilance · 2 alertes sur 5
            </span>
          </div>
        </div>

        {/* Metrics row */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 28,
            paddingTop: 28,
          }}
        >
          {METRICS.map((m, i) => {
            const fillStart = 40 + i * 12;
            const fillEnd = fillStart + 50;
            const t = easeFill(frame, fillStart, fillEnd);
            const animatedVal = (m.target * t).toFixed(2);
            const widthPct = m.target * 100 * t;

            return (
              <div
                key={m.label}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 14,
                  paddingRight: i < METRICS.length - 1 ? 28 : 0,
                  borderRight:
                    i < METRICS.length - 1
                      ? `1px solid ${theme.borderSubtle}`
                      : 'none',
                  ...slideUp(frame, 25 + i * 8, 14),
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                  }}
                >
                  <span
                    style={{
                      fontFamily: theme.fontMono,
                      fontSize: 12,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: theme.fgMuted,
                    }}
                  >
                    {m.label}
                  </span>
                  <span
                    style={{
                      fontFamily: theme.fontMono,
                      fontSize: 30,
                      fontWeight: 600,
                      color: colorFor(m.status),
                    }}
                  >
                    {animatedVal}
                  </span>
                </div>
                <div
                  style={{
                    position: 'relative',
                    height: 8,
                    background: theme.bg,
                    borderRadius: 99,
                    border: `1px solid ${theme.borderSubtle}`,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      width: `${widthPct}%`,
                      background: colorFor(m.status),
                      borderRadius: 99,
                    }}
                  />
                </div>
                <div
                  style={{
                    position: 'relative',
                    fontSize: 12,
                    color: theme.fgMuted,
                  }}
                >
                  <span>Seuil {m.threshold.toFixed(2)} · {m.note}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Explanation footnote */}
        <div
          style={{
            marginTop: 28,
            padding: '14px 18px',
            background: theme.bg,
            border: `1px solid ${theme.borderSubtle}`,
            borderLeft: `3px solid ${theme.warn}`,
            borderRadius: 8,
            color: theme.fgSecondary,
            fontSize: 14,
            lineHeight: 1.55,
            ...fadeIn(frame, 160, 18),
          }}
        >
          <strong style={{ color: theme.fg, fontWeight: 500 }}>
            Interprétation :
          </strong>{' '}
          le taux d'acceptation femmes / hommes tombe à 0.78 — sous la règle des
          4/5. Recommandation : ré-équilibrer le jeu d'entraînement (Art. 10
          AI Act).
        </div>
      </div>
      </div>
    </>
  );
};
