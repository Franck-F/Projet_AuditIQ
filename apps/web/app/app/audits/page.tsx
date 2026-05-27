'use client';

import Link from 'next/link';
import { Topbar } from '@/components/app/Topbar';
import { StatusBadge, type StatusTone } from '@/components/product/StatusBadge';
import { Button } from '@/components/ui/button';
import type { RecentAudit } from '@/lib/api/dashboard';
import { useDashboard } from '@/lib/query/use-dashboard';

const VERDICT_TONE: Record<'fail' | 'warn' | 'pass', { tone: StatusTone; label: string }> = {
  fail: { tone: 'fail', label: 'Critique' },
  warn: { tone: 'warn', label: 'Vigilance' },
  pass: { tone: 'pass', label: 'Conforme' },
};

function auditTone(verdict: RecentAudit['verdict']): { tone: StatusTone; label: string } {
  return verdict ? VERDICT_TONE[verdict] : { tone: 'info', label: 'En cours' };
}

export default function AuditsListPage() {
  const { data, isLoading, isError } = useDashboard();

  return (
    <>
      <Topbar crumbs={[{ label: 'Audits' }]} />
      <main className="flex-1 px-8 py-8">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-fg">Audits</h1>
            <p className="mt-1.5 max-w-[60ch] text-sm text-fg-secondary">
              Historique de vos audits AuditIQ. Cliquez sur un audit pour ouvrir son rapport et
              télécharger les exports Excel/PDF.
            </p>
          </div>
          <Button asChild variant="primary">
            <Link href="/app/audits/nouveau">+ Lancer un audit</Link>
          </Button>
        </header>

        {isLoading && (
          <p role="status" className="rounded-2xl border border-border-default bg-surface px-6 py-8 text-sm text-fg-secondary">
            Chargement de l&apos;historique…
          </p>
        )}

        {isError && (
          <p role="alert" className="rounded-2xl border border-status-fail bg-surface px-6 py-8 text-sm text-status-fail">
            Impossible de charger les audits. Vérifiez que l&apos;API tourne (port 8000).
          </p>
        )}

        {data && (
          <div className="rounded-2xl border border-border-default bg-surface p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[18px] font-medium text-fg">
                {data.recent_audits.length === 0
                  ? 'Aucun audit pour le moment'
                  : `${data.recent_audits.length} audit${data.recent_audits.length > 1 ? 's' : ''} récent${data.recent_audits.length > 1 ? 's' : ''}`}
              </h2>
              {data.recent_audits.length > 0 && (
                <span className="font-mono text-[11px] uppercase tracking-wider text-fg-muted">
                  total org : {data.total_audits}
                </span>
              )}
            </div>

            {data.recent_audits.length === 0 ? (
              <div className="flex flex-col items-center gap-4 py-10 text-center">
                <p className="max-w-[40ch] text-sm text-fg-secondary">
                  Vous n&apos;avez encore lancé aucun audit. Importez un CSV ou configurez une
                  cible LLM pour démarrer votre premier audit.
                </p>
                <Button asChild variant="primary">
                  <Link href="/app/audits/nouveau">Lancer mon premier audit</Link>
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {data.recent_audits.map((audit) => {
                  const t = auditTone(audit.verdict);
                  return (
                    <article
                      key={audit.id}
                      className="grid grid-cols-[minmax(0,1.5fr)_repeat(3,minmax(0,1fr))_auto] items-center gap-4 rounded-md border border-border-default bg-surface px-4 py-3.5 transition-colors hover:border-border-strong"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-fg">{audit.title}</div>
                        <div className="mt-0.5 truncate font-mono text-xs text-fg-muted">
                          {audit.code ?? audit.id} · {audit.module}
                        </div>
                      </div>
                      <StatusBadge tone={t.tone}>{t.label}</StatusBadge>
                      <span className="font-mono text-xs tabular-nums text-fg-muted">
                        {new Date(audit.created_at).toLocaleDateString('fr-FR')}
                      </span>
                      <span className="font-mono text-xs tabular-nums text-fg-muted">
                        {audit.risk_score ?? '—'}
                      </span>
                      <Button asChild variant="secondary" size="sm">
                        <Link href={`/app/audits/${audit.id}`}>Ouvrir</Link>
                      </Button>
                    </article>
                  );
                })}
              </div>
            )}

            {data.total_audits > data.recent_audits.length && (
              <p className="mt-4 rounded-md border border-status-info-border bg-status-info-bg px-4 py-3 text-xs leading-relaxed text-fg-secondary">
                <strong className="font-medium text-fg">
                  {data.total_audits - data.recent_audits.length} audit(s) plus ancien(s) non affiché(s).
                </strong>{' '}
                La pagination + le filtrage par module / verdict / date arrivent en Phase 2.
              </p>
            )}
          </div>
        )}
      </main>
    </>
  );
}
