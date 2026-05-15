import * as React from 'react';

export function FaqItem({
  question,
  children,
  defaultOpen = false,
}: {
  question: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details
      open={defaultOpen}
      className="group rounded-md border border-border-default bg-surface p-5 sm:p-6"
    >
      <summary className="flex cursor-pointer list-none items-start justify-between gap-4 text-h4 font-medium">
        <span>{question}</span>
        <span
          aria-hidden
          className="font-mono text-2xl leading-none text-fg-muted transition-transform duration-200 group-open:rotate-45"
        >
          +
        </span>
      </summary>
      <div className="mt-3 flex flex-col gap-3 text-sm leading-[1.65] text-fg-secondary">
        {children}
      </div>
    </details>
  );
}
