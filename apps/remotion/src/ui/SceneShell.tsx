import { AbsoluteFill } from 'remotion';
import { theme } from '../theme';

/* Persistent background — soft radial accent glow, subtle grid + watermark.
   Stays on screen the entire 30s so individual scenes can focus on content. */
export const SceneShell: React.FC = () => {
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <AbsoluteFill
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% 35%, rgba(122,223,181,0.06), transparent 60%)',
        }}
      />
      <AbsoluteFill
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 56,
          left: 80,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: theme.accent,
            display: 'grid',
            placeItems: 'center',
            color: theme.bg,
            fontWeight: 700,
            fontSize: 16,
            fontFamily: theme.font,
          }}
        >
          A
        </div>
        <span
          style={{
            color: theme.fg,
            fontFamily: theme.font,
            fontSize: 20,
            fontWeight: 600,
            letterSpacing: '-0.01em',
          }}
        >
          AuditIQ
        </span>
      </div>
      <div
        style={{
          position: 'absolute',
          top: 64,
          right: 80,
          color: theme.fgMuted,
          fontFamily: theme.fontMono,
          fontSize: 12,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
        }}
      >
        Démo · Comment ça marche
      </div>
    </AbsoluteFill>
  );
};
