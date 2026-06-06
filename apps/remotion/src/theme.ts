import { loadFont } from '@remotion/google-fonts/Inter';
import { loadFont as loadFontMono } from '@remotion/google-fonts/JetBrainsMono';

loadFont('normal', { weights: ['400', '500', '600', '700'] });
loadFontMono('normal', { weights: ['400', '500', '600'] });

export const theme = {
  bg: '#0a0d0c',
  surface: '#11161a',
  surface2: '#161c20',
  border: '#22282d',
  borderSubtle: '#1a1f24',
  borderStrong: '#2f363c',
  fg: '#e8efea',
  fgSecondary: '#a4b0a6',
  fgMuted: '#6b7670',
  accent: '#7adfb5',
  accentSoft: '#13362a',
  accentBorder: '#1f4a3b',
  warn: '#e8b657',
  warnBg: '#3a2e15',
  fail: '#e57373',
  failBg: '#3a1a1a',
  pass: '#7adfb5',
  font: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  fontMono: '"JetBrains Mono", "SF Mono", Menlo, monospace',
} as const;
