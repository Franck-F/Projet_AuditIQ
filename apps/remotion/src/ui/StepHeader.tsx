import { useCurrentFrame } from 'remotion';
import { theme } from '../theme';
import { slideUp } from './anim';

interface Props {
  step: string;
  title: string;
  caption: string;
}

export const StepHeader: React.FC<Props> = ({ step, title, caption }) => {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        position: 'absolute',
        top: 150,
        left: 80,
        right: 80,
        textAlign: 'center',
        ...slideUp(frame, 4),
      }}
    >
      <div
        style={{
          fontFamily: theme.fontMono,
          fontSize: 13,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: theme.accent,
          marginBottom: 14,
        }}
      >
        {step}
      </div>
      <h2
        style={{
          color: theme.fg,
          fontSize: 54,
          fontWeight: 600,
          letterSpacing: '-0.025em',
          lineHeight: 1.08,
          margin: 0,
          maxWidth: 1000,
          marginInline: 'auto',
        }}
      >
        {title}
      </h2>
      <p
        style={{
          color: theme.fgSecondary,
          fontSize: 20,
          marginTop: 18,
          maxWidth: 720,
          marginInline: 'auto',
          lineHeight: 1.5,
        }}
      >
        {caption}
      </p>
    </div>
  );
};
