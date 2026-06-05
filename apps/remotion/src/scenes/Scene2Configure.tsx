import { useCurrentFrame } from 'remotion';
import { theme } from '../theme';
import { slideUp, easeFill, fadeIn } from '../ui/anim';
import { StepHeader } from '../ui/StepHeader';

const FIELDS = [
  { label: 'Module', value: '01 · Audit supervisé', kind: 'select' },
  { label: 'Variable de décision', value: 'decision_rh', kind: 'pill' },
  {
    label: 'Attributs sensibles',
    value: ['genre', 'age'],
    kind: 'multi',
  },
];

export const Scene2Configure: React.FC = () => {
  const frame = useCurrentFrame();
  const sliderT = easeFill(frame, 70, 110);
  const sliderPct = 60 + sliderT * 20; // 60% → 80%

  return (
    <>
      <StepHeader
        step="Étape 02"
        title="Configurez l'audit"
        caption="Choisissez le module, la décision et les attributs sensibles. Seuils par défaut prêts à l'emploi."
      />

      {/* Form card */}
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
          width: 1080,
          background: theme.surface,
          border: `1px solid ${theme.border}`,
          borderRadius: 18,
          padding: '28px 32px 32px',
          display: 'flex',
          flexDirection: 'column',
          gap: 22,
          ...slideUp(frame, 8, 22),
        }}
      >
        {FIELDS.map((f, i) => (
          <div
            key={f.label}
            style={{
              display: 'grid',
              gridTemplateColumns: '280px 1fr',
              gap: 24,
              alignItems: 'center',
              ...slideUp(frame, 28 + i * 14, 12),
            }}
          >
            <span
              style={{
                color: theme.fgSecondary,
                fontSize: 15,
                fontWeight: 500,
              }}
            >
              {f.label}
            </span>
            {f.kind === 'select' && (
              <div
                style={{
                  padding: '12px 16px',
                  background: theme.surface2,
                  border: `1px solid ${theme.border}`,
                  borderRadius: 10,
                  color: theme.fg,
                  fontSize: 15,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span>{f.value as string}</span>
                <span style={{ color: theme.fgMuted, fontSize: 12 }}>▾</span>
              </div>
            )}
            {f.kind === 'pill' && (
              <div style={{ display: 'flex', gap: 8 }}>
                <span
                  style={{
                    fontFamily: theme.fontMono,
                    fontSize: 13,
                    padding: '8px 14px',
                    borderRadius: 8,
                    background: theme.accentSoft,
                    border: `1px solid ${theme.accentBorder}`,
                    color: theme.accent,
                  }}
                >
                  {f.value as string}
                </span>
              </div>
            )}
            {f.kind === 'multi' && (
              <div style={{ display: 'flex', gap: 8 }}>
                {(f.value as string[]).map((v) => (
                  <span
                    key={v}
                    style={{
                      fontFamily: theme.fontMono,
                      fontSize: 13,
                      padding: '8px 14px',
                      borderRadius: 8,
                      background: theme.surface2,
                      border: `1px solid ${theme.borderStrong}`,
                      color: theme.fg,
                    }}
                  >
                    {v}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Threshold slider */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '280px 1fr',
            gap: 24,
            alignItems: 'center',
            ...slideUp(frame, 70, 12),
          }}
        >
          <span
            style={{ color: theme.fgSecondary, fontSize: 15, fontWeight: 500 }}
          >
            Seuil règle des 4/5
          </span>
          <div>
            <div
              style={{
                position: 'relative',
                height: 8,
                background: theme.bg,
                borderRadius: 99,
                border: `1px solid ${theme.borderSubtle}`,
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: `${sliderPct}%`,
                  background: theme.accent,
                  borderRadius: 99,
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  left: `calc(${sliderPct}% - 10px)`,
                  top: -6,
                  width: 20,
                  height: 20,
                  borderRadius: 99,
                  background: theme.accent,
                  border: `3px solid ${theme.bg}`,
                  boxShadow: `0 0 0 1px ${theme.accentBorder}`,
                }}
              />
            </div>
            <div
              style={{
                marginTop: 10,
                display: 'flex',
                justifyContent: 'space-between',
                fontFamily: theme.fontMono,
                fontSize: 12,
                color: theme.fgMuted,
              }}
            >
              <span>0.60</span>
              <span style={{ color: theme.accent }}>
                {(sliderPct / 100).toFixed(2)}
              </span>
              <span>1.00</span>
            </div>
          </div>
        </div>

        {/* Launch button */}
        <div
          style={{
            marginTop: 8,
            display: 'flex',
            justifyContent: 'flex-end',
            ...fadeIn(frame, 130, 16),
          }}
        >
          <div
            style={{
              padding: '14px 26px',
              background: theme.accent,
              color: theme.bg,
              fontSize: 16,
              fontWeight: 600,
              borderRadius: 10,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              boxShadow: '0 0 0 4px rgba(122,223,181,0.15)',
            }}
          >
            Lancer l'audit
            <span style={{ fontSize: 14 }}>→</span>
          </div>
        </div>
      </div>
      </div>
    </>
  );
};
