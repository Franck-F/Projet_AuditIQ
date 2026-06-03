// apps/web/components/product/DropZone.tsx
import * as React from 'react';
import { cn } from '@/lib/utils';

type DropZoneState = 'idle' | 'drag-over' | 'loading' | 'error' | 'success';

interface DropZoneProps {
  accept: string[];
  maxSizeMB: number;
  onFile: (file: File) => void;
  disabled?: boolean;
  multiple?: false;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DropZone({ accept, maxSizeMB, onFile, disabled = false }: DropZoneProps) {
  const [state, setState] = React.useState<DropZoneState>('idle');
  const [errorMsg, setErrorMsg] = React.useState('');
  const [file, setFile] = React.useState<File | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const errorId = React.useId();

  function validate(f: File): string | null {
    if (!accept.includes(f.type) && accept.length > 0) {
      return `Type non accepté. Formats : ${accept.join(', ')}`;
    }
    if (f.size > maxSizeMB * 1024 * 1024) {
      return `Fichier trop volumineux (max ${maxSizeMB} MB)`;
    }
    return null;
  }

  function handleFile(f: File) {
    const err = validate(f);
    if (err) {
      setErrorMsg(err);
      setState('error');
      return;
    }
    setFile(f);
    setState('success');
    onFile(f);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    if (!disabled) setState('drag-over');
  }
  function handleDragLeave() {
    setState('idle');
  }
  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    if (disabled) return;
    const dropped = e.dataTransfer.files[0];
    if (dropped) handleFile(dropped);
    else setState('idle');
  }
  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0];
    if (picked) handleFile(picked);
  }
  function openPicker() {
    if (!disabled) inputRef.current?.click();
  }
  function removeFile() {
    setFile(null);
    setState('idle');
    setErrorMsg('');
    if (inputRef.current) inputRef.current.value = '';
  }

  const isActive = state === 'drag-over';

  return (
    <div className="flex flex-col gap-3">
      {/* Drop area */}
      {state !== 'success' && (
        <div
          role="button"
          tabIndex={disabled ? -1 : 0}
          aria-label="Zone de dépôt de fichier. Cliquez ou appuyez sur Entrée pour sélectionner un fichier."
          aria-describedby={state === 'error' ? errorId : undefined}
          aria-disabled={disabled}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={openPicker}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPicker(); } }}
          className={cn(
            'flex flex-col items-center gap-3.5 rounded-[var(--r-lg)] border-[1.5px] border-dashed px-10 py-10 text-center transition-colors',
            isActive
              ? 'border-accent bg-[linear-gradient(180deg,var(--accent-soft),transparent_80%),var(--surface)]'
              : 'border-border-strong bg-surface',
            state === 'error' && 'border-status-fail',
            disabled && 'pointer-events-none opacity-50',
          )}
        >
          {/* Icon */}
          <div className="flex h-11 w-11 items-center justify-center rounded-[var(--r-md)] border border-border-subtle bg-surface-2 text-accent">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
              <path d="M10 3v10M6 7l4-4 4 4M4 14h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <p className="text-[var(--fs-h4)] font-medium">
              {isActive ? 'Relâchez pour déposer' : 'Déposer un fichier'}
            </p>
            <p className="mt-1 text-sm text-fg-muted">
              ou cliquez pour sélectionner · max {maxSizeMB} MB
            </p>
          </div>
          {state === 'loading' && (
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-surface-3 border-t-accent" aria-label="Chargement" />
          )}
        </div>
      )}

      {/* Error message */}
      {state === 'error' && (
        <p id={errorId} role="alert" className="text-xs text-status-fail">
          {errorMsg}
        </p>
      )}

      {/* File preview chip */}
      {file && state === 'success' && (
        <div className="flex items-center gap-3 rounded-[var(--r-md)] border border-border-default bg-surface px-3.5 py-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[var(--r-sm)] border border-accent-border bg-accent-soft font-mono text-[11px] font-semibold uppercase text-accent">
            {file.name.split('.').pop()?.slice(0, 4) ?? 'FILE'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{file.name}</p>
            <p className="font-mono text-xs text-fg-muted">{formatBytes(file.size)}</p>
          </div>
          <button
            type="button"
            aria-label={`Supprimer ${file.name}`}
            onClick={removeFile}
            className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-[var(--r-sm)] text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
              <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept={accept.join(',')}
        onChange={handleInputChange}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
      />
    </div>
  );
}
