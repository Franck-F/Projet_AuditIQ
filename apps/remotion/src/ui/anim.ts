import { interpolate, spring } from 'remotion';

/* Fade + slide-up entrance — drop in via local frame (e.g. useCurrentFrame
   minus sequence start), tune `from` to the keyframe you want it to land on. */
export const slideUp = (frame: number, from: number, distance = 24) => {
  const t = interpolate(frame, [from, from + 18], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return {
    opacity: t,
    transform: `translateY(${(1 - t) * distance}px)`,
  };
};

export const fadeIn = (frame: number, from: number, dur = 12) => {
  const t = interpolate(frame, [from, from + dur], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return { opacity: t };
};

export const springScale = (frame: number, from: number, fps: number) => {
  const s = spring({
    frame: Math.max(0, frame - from),
    fps,
    config: { damping: 14, stiffness: 110, mass: 0.6 },
  });
  return { transform: `scale(${0.92 + 0.08 * s})`, opacity: Math.min(1, s) };
};

/* Eased gauge / progress fill: 0 → 1 across [start, end]. */
export const easeFill = (frame: number, start: number, end: number) =>
  interpolate(frame, [start, end], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: (t) => 1 - Math.pow(1 - t, 3), // cubic ease-out
  });
