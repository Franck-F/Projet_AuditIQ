'use client';

import * as React from 'react';
import Link from 'next/link';

import { Icons } from '@/components/ui/icons';

/* ============================================================================
   Notifications popover anchored to the topbar bell button.
   - Aucune fausse donnée : tant que le backend des alertes n'est pas branché
     (pas de GET /api/v1/alerts — voir CLAUDE.md §6.3 + §5.1 alerts table),
     la liste reste vide et aucune pastille n'est affichée.
   - Click outside / ESC closes.
   ============================================================================ */

type Severity = 'info' | 'warn' | 'fail' | 'pass';
type Notification = {
  id: string;
  severity: Severity;
  title: string;
  body: string;
  href?: string;
  receivedAt: string; // ISO timestamp
};

function severityColor(s: Severity): string {
  return {
    fail: 'var(--fail)',
    warn: 'var(--warn)',
    info: 'var(--info)',
    pass: 'var(--accent)',
  }[s];
}

function relativeFromNow(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - then);
  const m = Math.floor(diff / 60_000);
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.floor(h / 24);
  return `il y a ${d} j`;
}

export function NotificationsPopover() {
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  // Branché sur une liste vide tant que l'endpoint d'alertes n'existe pas.
  const items: Notification[] = [];
  const unread = items.length;

  // Click outside closes
  React.useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <button
        type="button"
        className="icon-btn"
        aria-label="Notifications"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((v) => !v)}
      >
        <Icons.bell size={16} />
        {unread > 0 && <span className="icon-btn-dot" aria-hidden />}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          className="notif-pop"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: 360,
            maxHeight: 480,
            display: 'flex',
            flexDirection: 'column',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            boxShadow: 'var(--shadow-lg)',
            overflow: 'hidden',
            zIndex: 60,
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 16px',
              borderBottom: '1px solid var(--border-subtle)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--fg)' }}>Notifications</span>
              {unread > 0 && (
                <span
                  className="mono tnum"
                  style={{ fontSize: 11.5, color: 'var(--fg-muted)' }}
                >
                  {unread} non lue{unread > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Fermer"
              className="icon-btn"
              style={{ width: 28, height: 28 }}
            >
              <Icons.x size={14} />
            </button>
          </div>

          {/* List */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {items.length === 0 ? (
              <div
                style={{
                  padding: 28,
                  textAlign: 'center',
                  color: 'var(--fg-muted)',
                  fontSize: 13,
                }}
              >
                Aucune notification pour le moment.
              </div>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {items.map((n) => {
                  const body = (
                    <div style={{ display: 'flex', gap: 12 }}>
                      <span
                        aria-hidden
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: severityColor(n.severity),
                          marginTop: 6,
                          flexShrink: 0,
                        }}
                      />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div
                          style={{
                            fontSize: 13.5,
                            fontWeight: 500,
                            color: 'var(--fg)',
                            marginBottom: 2,
                          }}
                        >
                          {n.title}
                        </div>
                        <p
                          style={{
                            margin: 0,
                            fontSize: 12.5,
                            color: 'var(--fg-secondary)',
                            lineHeight: 1.45,
                          }}
                        >
                          {n.body}
                        </p>
                        <div
                          className="mono"
                          style={{
                            fontSize: 11,
                            color: 'var(--fg-muted)',
                            marginTop: 6,
                            letterSpacing: '0.04em',
                          }}
                        >
                          {relativeFromNow(n.receivedAt)}
                        </div>
                      </div>
                    </div>
                  );

                  return (
                    <li
                      key={n.id}
                      style={{ borderBottom: '1px solid var(--border-subtle)' }}
                    >
                      {n.href ? (
                        <Link
                          href={n.href}
                          onClick={() => setOpen(false)}
                          style={{
                            display: 'block',
                            padding: '12px 16px',
                            transition: 'background-color .14s',
                          }}
                          className="notif-row"
                        >
                          {body}
                        </Link>
                      ) : (
                        <div style={{ padding: '12px 16px' }}>{body}</div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Footer */}
          <div
            style={{
              padding: 12,
              borderTop: '1px solid var(--border-subtle)',
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
              background: 'var(--surface-2)',
            }}
          >
            <Link
              href="/app/parametres?tab=notifications"
              onClick={() => setOpen(false)}
              style={{
                fontSize: 12.5,
                color: 'var(--accent)',
                fontWeight: 500,
              }}
            >
              Préférences →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
