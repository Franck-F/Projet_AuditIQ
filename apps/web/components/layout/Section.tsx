import * as React from 'react';
import { cn } from '@/lib/utils';

type Tone = 'default' | 'top-border' | 'top-subtle';
type Pad = 'sm' | 'md' | 'lg';

export interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  pad?: Pad;
  tone?: Tone;
  as?: 'section' | 'header' | 'div';
}

const PAD: Record<Pad, string> = {
  sm: 'py-16',
  md: 'py-24',
  lg: 'py-32',
};

const TONE: Record<Tone, string> = {
  default: '',
  'top-border': 'border-t border-border-default',
  'top-subtle': 'border-t border-border-subtle',
};

export function Section({
  pad = 'md',
  tone = 'default',
  as: Tag = 'section',
  className,
  ...props
}: SectionProps) {
  return <Tag className={cn(PAD[pad], TONE[tone], className)} {...props} />;
}

interface SectionHeaderProps {
  eyebrow?: string;
  title: React.ReactNode;
  lede?: React.ReactNode;
  align?: 'left' | 'center';
  className?: string;
}

export function SectionHeader({
  eyebrow,
  title,
  lede,
  align = 'left',
  className,
}: SectionHeaderProps) {
  return (
    <header
      className={cn(
        'max-w-[720px] mb-12',
        align === 'center' && 'mx-auto text-center',
        className,
      )}
    >
      {eyebrow && (
        <p className="eyebrow eyebrow-accent mb-3" aria-hidden>
          {eyebrow}
        </p>
      )}
      <h2 className="mb-4 text-h2 font-display font-medium tracking-tight text-fg">{title}</h2>
      {lede && <p className="text-h4 leading-relaxed text-fg-secondary">{lede}</p>}
    </header>
  );
}
