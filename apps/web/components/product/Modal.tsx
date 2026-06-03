// apps/web/components/product/Modal.tsx
import * as React from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  confirmTyping?: string;
  /** Close when clicking outside the modal panel (default: true) */
  closeOnBackdrop?: boolean;
}

export interface ModalActionsProps {
  children: React.ReactNode;
  className?: string;
}

export function ModalActions({ children, className }: ModalActionsProps) {
  return (
    <div className={cn('mt-6 flex justify-end gap-2.5', className)}>
      {children}
    </div>
  );
}

export const Modal = React.forwardRef<HTMLDivElement, ModalProps>(function Modal(
  { open, onClose, title, description, children, confirmTyping, closeOnBackdrop = true },
  ref,
) {
  const [typed, setTyped] = React.useState('');
  const panelRef = React.useRef<HTMLDivElement>(null);
  const firstFocusRef = React.useRef<HTMLButtonElement>(null);

  // Reset typed confirmation when modal opens
  React.useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional reset on open
      setTyped('');
      // Defer focus so the DOM is ready
      const id = setTimeout(() => firstFocusRef.current?.focus(), 20);
      return () => clearTimeout(id);
    }
  }, [open]);

  // ESC key handler
  React.useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  // Focus trap
  React.useEffect(() => {
    if (!open || !panelRef.current) return;
    const panel = panelRef.current;
    const focusable = panel.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    function trapFocus(e: KeyboardEvent) {
      if (e.key !== 'Tab') return;
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    }
    panel.addEventListener('keydown', trapFocus);
    return () => panel.removeEventListener('keydown', trapFocus);
  }, [open]);

  if (!open) return null;

  const confirmMatch = confirmTyping ? typed === confirmTyping : true;

  const panel = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-6"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onMouseDown={closeOnBackdrop ? (e) => { if (e.target === e.currentTarget) onClose(); } : undefined}
      aria-hidden="false"
    >
      <div
        ref={(node) => {
          panelRef.current = node as HTMLDivElement;
          if (typeof ref === 'function') ref(node as HTMLDivElement);
          else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node as HTMLDivElement;
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        aria-describedby={description ? 'modal-desc' : undefined}
        className="w-full max-w-[520px] rounded-[var(--r-lg)] border border-border-default bg-surface p-7 shadow-[0_24px_64px_rgba(0,0,0,0.4)]"
      >
        {/* Header */}
        <div className="mb-3 flex items-center gap-3">
          <h2 id="modal-title" className="text-[var(--fs-h4)] font-medium leading-snug">
            {title}
          </h2>
          <button
            ref={firstFocusRef}
            type="button"
            aria-label="Fermer"
            onClick={onClose}
            className="ml-auto flex h-7 w-7 items-center justify-center rounded-[var(--r-sm)] text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
              <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Description */}
        {description && (
          <p id="modal-desc" className="text-sm leading-relaxed text-fg-secondary">
            {description}
          </p>
        )}

        {/* Confirm typing field */}
        {confirmTyping && (
          <div className="mt-4 flex flex-col gap-1.5">
            <label htmlFor="modal-confirm-input" className="text-sm font-medium text-fg-secondary">
              Tapez <span className="font-mono text-fg">{confirmTyping}</span> pour confirmer
            </label>
            <input
              id="modal-confirm-input"
              type="text"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              className="rounded-[var(--r-md)] border border-border-default bg-surface px-3 py-2 text-sm text-fg transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
              aria-describedby="modal-title"
              autoComplete="off"
            />
          </div>
        )}

        {/* Body / children — consumers can use ModalActions inside */}
        {React.Children.map(children, (child) => {
          if (
            React.isValidElement(child) &&
            (child.type as { displayName?: string })?.displayName === 'ModalActions'
          ) {
            // Inject confirmMatch so ModalActions children know it
            return React.cloneElement(child as React.ReactElement<{ _confirmMatch?: boolean }>, {
              _confirmMatch: confirmMatch,
            });
          }
          return child;
        })}
      </div>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(panel, document.body)
    : null;
});

Modal.displayName = 'Modal';
ModalActions.displayName = 'ModalActions';
