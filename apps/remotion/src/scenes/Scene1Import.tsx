import { useCurrentFrame } from 'remotion';
import { theme } from '../theme';
import { slideUp, fadeIn } from '../ui/anim';
import { StepHeader } from '../ui/StepHeader';

const COLUMNS = [
  { src: 'nom_candidat', dst: 'identifiant', type: 'string' },
  { src: 'genre', dst: 'attribut sensible', type: 'string' },
  { src: 'age', dst: 'attribut sensible', type: 'int' },
  { src: 'decision_rh', dst: 'variable cible', type: 'binary' },
];

export const Scene1Import: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <>
      <StepHeader
        step="Étape 01"
        title="Importez vos données"
        caption="CSV, Excel ou API. Le mapping des colonnes est automatique."
      />

      {/* Drop zone */}
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
          border: `1.5px dashed ${theme.borderStrong}`,
          borderRadius: 18,
          padding: 32,
          display: 'flex',
          flexDirection: 'column',
          gap: 22,
          ...slideUp(frame, 40, 18),
        }}
      >
        {/* File card */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            padding: '16px 20px',
            background: theme.surface2,
            border: `1px solid ${theme.border}`,
            borderRadius: 12,
            ...slideUp(frame, 70, 14),
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              background: theme.accentSoft,
              border: `1px solid ${theme.accentBorder}`,
              color: theme.accent,
              display: 'grid',
              placeItems: 'center',
              fontFamily: theme.fontMono,
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.05em',
            }}
          >
            CSV
          </div>
          <div style={{ flex: 1 }}>
            <div
              style={{
                color: theme.fg,
                fontSize: 17,
                fontWeight: 500,
                marginBottom: 4,
              }}
            >
              Recrutement_2024.csv
            </div>
            <div style={{ color: theme.fgMuted, fontSize: 13 }}>
              4 234 lignes · 12 colonnes · 318 Ko
            </div>
          </div>
          <div
            style={{
              padding: '6px 14px',
              borderRadius: 99,
              background: theme.accentSoft,
              border: `1px solid ${theme.accentBorder}`,
              color: theme.accent,
              fontSize: 12,
              fontWeight: 500,
              fontFamily: theme.fontMono,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              ...fadeIn(frame, 92),
            }}
          >
            ✓ Validé
          </div>
        </div>

        {/* Column mapping */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            paddingTop: 4,
            ...fadeIn(frame, 105),
          }}
        >
          <div
            style={{
              fontFamily: theme.fontMono,
              fontSize: 11,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: theme.fgMuted,
              marginBottom: 4,
            }}
          >
            Mapping automatique des colonnes
          </div>
          {COLUMNS.map((c, i) => (
            <div
              key={c.src}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto 1.4fr auto',
                gap: 16,
                alignItems: 'center',
                padding: '12px 16px',
                background: theme.bg,
                border: `1px solid ${theme.borderSubtle}`,
                borderRadius: 10,
                ...slideUp(frame, 120 + i * 14, 12),
              }}
            >
              <code
                style={{
                  fontFamily: theme.fontMono,
                  fontSize: 14,
                  color: theme.fg,
                }}
              >
                {c.src}
              </code>
              <span style={{ color: theme.fgMuted, fontSize: 14 }}>→</span>
              <span
                style={{
                  fontSize: 14,
                  color:
                    c.dst === 'variable cible' ? theme.accent : theme.fgSecondary,
                  fontWeight: c.dst === 'variable cible' ? 500 : 400,
                }}
              >
                {c.dst}
              </span>
              <span
                style={{
                  fontFamily: theme.fontMono,
                  fontSize: 11,
                  padding: '3px 9px',
                  borderRadius: 6,
                  background: theme.surface2,
                  border: `1px solid ${theme.border}`,
                  color: theme.fgMuted,
                }}
              >
                {c.type}
              </span>
            </div>
          ))}
        </div>
      </div>
      </div>
    </>
  );
};
