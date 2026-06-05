import { useCurrentFrame, interpolate } from 'remotion';
import { theme } from '../theme';
import { slideUp, fadeIn } from '../ui/anim';
import { StepHeader } from '../ui/StepHeader';

const CHECKLIST = [
  'Article 10 — Gouvernance des données',
  'Article 13 — Transparence',
  'Article 15 — Exactitude & robustesse',
  'Annexe IV — Documentation technique',
  'Signature électronique eIDAS',
];

export const Scene4Export: React.FC = () => {
  const frame = useCurrentFrame();
  const pulse =
    0.92 +
    0.08 *
      Math.sin(
        interpolate(frame, [120, 195], [0, Math.PI * 4], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        }),
      );

  return (
    <>
      <StepHeader
        step="Étape 04"
        title="Exportez la trace"
        caption="Rapport PDF structuré selon l'annexe IV, prêt pour votre DPO ou un auditeur."
      />

      {/* Two-column layout */}
      <div
        style={{
          position: 'absolute',
          top: 380,
          left: 80,
          right: 80,
          display: 'grid',
          gridTemplateColumns: '520px 1fr',
          gap: 48,
          alignItems: 'start',
          justifyContent: 'center',
          maxWidth: 1380,
          marginInline: 'auto',
        }}
      >
        {/* PDF mock */}
        <div
          style={{
            background: '#f7f8f6',
            border: `1px solid ${theme.borderStrong}`,
            borderRadius: 10,
            padding: 28,
            boxShadow: '0 30px 80px rgba(0,0,0,0.35)',
            minHeight: 560,
            ...slideUp(frame, 4, 22),
          }}
        >
          <div
            style={{
              fontFamily: theme.fontMono,
              fontSize: 10,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: '#666',
              marginBottom: 14,
            }}
          >
            Rapport AuditIQ · AUD-2026-0314
          </div>
          <div
            style={{
              fontSize: 22,
              fontWeight: 600,
              color: '#0a0d0c',
              lineHeight: 1.2,
              marginBottom: 16,
              letterSpacing: '-0.02em',
            }}
          >
            Audit de fairness — Recrutement_2024
          </div>
          <div
            style={{
              fontSize: 12,
              color: '#555',
              lineHeight: 1.55,
              marginBottom: 18,
            }}
          >
            Synthèse exécutive et analyse réglementaire au regard du règlement
            (UE) 2024/1689 (AI Act) et du droit français applicable.
          </div>
          <div
            style={{
              display: 'flex',
              gap: 8,
              flexWrap: 'wrap',
              marginBottom: 18,
            }}
          >
            <span
              style={{
                padding: '4px 12px',
                borderRadius: 99,
                background: '#fbe3b8',
                color: '#7a5300',
                fontSize: 11,
                fontWeight: 500,
              }}
            >
              Verdict : Vigilance
            </span>
            <span
              style={{
                padding: '4px 12px',
                borderRadius: 99,
                background: '#e3e6e1',
                color: '#3a3f3a',
                fontSize: 11,
              }}
            >
              22 pages · 4.1 Mo
            </span>
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}
          >
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div
                key={i}
                style={{
                  height: 8,
                  background: i === 4 ? '#d4d8d2' : '#e7eae5',
                  borderRadius: 4,
                  width: `${100 - i * 6}%`,
                  ...fadeIn(frame, 30 + i * 4, 12),
                }}
              />
            ))}
          </div>
          <div
            style={{
              marginTop: 24,
              paddingTop: 16,
              borderTop: '1px solid #d4d8d2',
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 10,
              color: '#888',
              fontFamily: theme.fontMono,
            }}
          >
            <span>Page 1 / 22</span>
            <span>Signé eIDAS — 14:03 CET</span>
          </div>
        </div>

        {/* Checklist + CTA */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            ...slideUp(frame, 18, 22),
          }}
        >
          <div
            style={{
              fontFamily: theme.fontMono,
              fontSize: 12,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: theme.fgMuted,
              marginBottom: 4,
            }}
          >
            Conformité réglementaire
          </div>
          {CHECKLIST.map((item, i) => (
            <div
              key={item}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '14px 18px',
                background: theme.surface,
                border: `1px solid ${theme.borderSubtle}`,
                borderRadius: 10,
                ...slideUp(frame, 40 + i * 10, 12),
              }}
            >
              <span
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 99,
                  background: theme.accentSoft,
                  border: `1px solid ${theme.accentBorder}`,
                  color: theme.accent,
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: 14,
                  fontWeight: 700,
                }}
              >
                ✓
              </span>
              <span style={{ color: theme.fg, fontSize: 15 }}>{item}</span>
            </div>
          ))}

          {/* Download button */}
          <div
            style={{
              marginTop: 14,
              display: 'flex',
              gap: 12,
              ...fadeIn(frame, 110),
            }}
          >
            <div
              style={{
                padding: '16px 28px',
                background: theme.accent,
                color: theme.bg,
                fontSize: 16,
                fontWeight: 600,
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                boxShadow: `0 0 0 ${4 * pulse}px rgba(122,223,181,${0.18 * pulse})`,
                transform: `scale(${pulse})`,
              }}
            >
              <span>↓</span>
              Télécharger le PDF
            </div>
            <div
              style={{
                padding: '16px 22px',
                color: theme.fg,
                fontSize: 16,
                fontWeight: 500,
                borderRadius: 10,
                border: `1px solid ${theme.borderStrong}`,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              Exporter Excel
            </div>
          </div>

          <div
            style={{
              marginTop: 8,
              color: theme.fgMuted,
              fontSize: 13,
              ...fadeIn(frame, 140, 14),
            }}
          >
            Archivé 5 ans · Opposable · Traçabilité complète
          </div>
        </div>
      </div>
    </>
  );
};
