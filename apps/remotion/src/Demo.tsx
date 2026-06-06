import { AbsoluteFill, Sequence, interpolate, useCurrentFrame } from 'remotion';
import { theme } from './theme';
import { SceneShell } from './ui/SceneShell';
import { Scene1Import } from './scenes/Scene1Import';
import { Scene2Configure } from './scenes/Scene2Configure';
import { Scene3Diagnostic } from './scenes/Scene3Diagnostic';
import { Scene4Export } from './scenes/Scene4Export';

const HERO = 60;
const S1 = 195;
const S2 = 195;
const S3 = 240;
const S4 = 195;
const OUTRO = 15;

export const Demo: React.FC = () => {
  const frame = useCurrentFrame();
  const total = HERO + S1 + S2 + S3 + S4 + OUTRO;
  const outroFade = interpolate(frame, [total - OUTRO, total - 1], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ background: theme.bg, fontFamily: theme.font, opacity: outroFade }}>
      <SceneShell />

      <Sequence from={0} durationInFrames={HERO + S1}>
        <Scene1Import />
      </Sequence>
      <Sequence from={HERO + S1} durationInFrames={S2}>
        <Scene2Configure />
      </Sequence>
      <Sequence from={HERO + S1 + S2} durationInFrames={S3}>
        <Scene3Diagnostic />
      </Sequence>
      <Sequence from={HERO + S1 + S2 + S3} durationInFrames={S4 + OUTRO}>
        <Scene4Export />
      </Sequence>
    </AbsoluteFill>
  );
};
