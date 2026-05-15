import * as React from 'react';
import { BrandMark } from '@/components/layout/BrandMark';
import { StatusPill } from '@/components/marketing/StatusPill';
import { Eyebrow } from '@/components/marketing/Eyebrow';

interface AuthMainProps {
  children: React.ReactNode;
}

export function AuthMain({ children }: AuthMainProps) {
  return (
    <main className="flex flex-col p-[clamp(40px,6vw,80px)] px-[clamp(24px,5vw,80px)]">
      <BrandMark className="mb-[clamp(32px,4vw,48px)]" />
      <div className="my-auto flex w-full max-w-[440px] flex-col gap-6">{children}</div>
    </main>
  );
}

interface AuthSideProps {
  eyebrow: string;
  title: string;
  body: string;
  metrics?: {
    label: string;
    value: string;
    tone: 'pass' | 'warn' | 'fail' | 'info';
  }[];
  children?: React.ReactNode;
}

export function AuthSide({ eyebrow, title, body, metrics, children }: AuthSideProps) {
  return (
    <aside className="relative hidden flex-col justify-center gap-8 overflow-hidden border-l border-border-subtle bg-surface p-[clamp(40px,6vw,80px)] lg:flex">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            'radial-gradient(circle at 80% 20%, var(--accent-soft), transparent 50%), radial-gradient(circle at 20% 80%, var(--status-info-bg), transparent 60%)',
        }}
      />
      <div className="relative max-w-[440px]">
        <Eyebrow accent>{eyebrow}</Eyebrow>
        <h2 className="mb-4 mt-3 text-[clamp(28px,3vw,36px)] font-display font-medium leading-[1.2] tracking-[-0.02em] text-fg">
          {title}
        </h2>
        <p className="text-base leading-relaxed text-fg-secondary">{body}</p>
        {metrics && metrics.length > 0 && (
          <div className="mt-8 flex flex-col gap-3">
            {metrics.map((m) => (
              <div
                key={m.label}
                className="flex items-center justify-between gap-3 rounded-md border border-border-default bg-surface-2 p-4"
              >
                <span className="text-sm text-fg-secondary">{m.label}</span>
                <StatusPill tone={m.tone}>{m.value}</StatusPill>
              </div>
            ))}
          </div>
        )}
        {children && <div className="mt-8">{children}</div>}
      </div>
    </aside>
  );
}

export function AuthBenefit({
  num,
  title,
  body,
}: {
  num: string;
  title: string;
  body: string;
}) {
  return (
    <div className="grid grid-cols-[32px_1fr] gap-3">
      <span className="flex size-6 items-center justify-center rounded-md border border-accent-border bg-accent-soft font-mono text-[11px] text-accent">
        {num}
      </span>
      <div>
        <h4 className="mb-1 text-[15px] font-medium text-fg">{title}</h4>
        <p className="text-[13px] leading-[1.5] text-fg-secondary">{body}</p>
      </div>
    </div>
  );
}

interface AuthCenterProps {
  children: React.ReactNode;
}

export function AuthCenter({ children }: AuthCenterProps) {
  return (
    <main className="grid place-items-center px-6 py-[clamp(48px,8vw,96px)]">
      <div className="w-full max-w-[460px]">
        <BrandMark className="mb-10" />
        {children}
      </div>
    </main>
  );
}

export function AuthCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex w-full max-w-[460px] flex-col gap-5 rounded-2xl border border-border-default bg-surface p-8 sm:p-12">
      {children}
    </div>
  );
}
