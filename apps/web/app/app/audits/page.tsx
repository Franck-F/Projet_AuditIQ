'use client';

import * as React from 'react';
import Link from 'next/link';
import { Topbar } from '@/components/app/Topbar';
import { Avatar } from '@/components/product/Avatar';
import { MetricCard } from '@/components/product/MetricCard';
import { StatusBadge, type StatusTone } from '@/components/product/StatusBadge';
import { Tabs } from '@/components/product/Tabs';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Icons } from '@/components/ui/icons';
import type { RecentAudit } from '@/lib/api/dashboard';
import { useDashboard } from '@/lib/query/use-dashboard';

const VERDICT_TONE: Record<'fail' | 'warn' | 'pass', StatusTone> = {
  fail: 'fail',
  warn: 'warn',
  pass: 'pass',
};

const FILTER_TABS = [
  { id: 'all', label: 'Tous' },
  { id: 'fail', label: 'Non conformes' },
  { id: 'warn', label: 'Sous vigilance' },
  { id: 'pass', label: 'Conformes' },
];

function formatRelativeDate(date: string): string {
  const now = new Date();
  const d = new Date(date);
  const days = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (days === 0) return 'Aujourd\'hui';
  if (days === 1) return 'Hier';
  if (days < 7) return `Il y a ${days} j`;
  if (days < 30) return `Il y a ${Math.floor(days / 7)} sem`;
  return `Il y a ${Math.floor(days / 30)} mois`;
}

export default function AuditsListPage() {
  const { data, isLoading, isError } = useDashboard();
  const [filterTab, setFilterTab] = React.useState('all');

  const filteredAudits = React.useMemo(() => {
    if (!data) return [];
    if (filterTab === 'all') return data.recent_audits;
    return data.recent_audits.filter((a) => a.verdict === filterTab);
  }, [data, filterTab]);

  const stats = React.useMemo(() => {
    if (!data) return { total: 0, pass: 0, warn: 0, fail: 0 };
    return {
      total: data.total_audits,
      pass: data.recent_audits.filter((a) => a.verdict === 'pass').length,
      warn: data.recent_audits.filter((a) => a.verdict === 'warn').length,
      fail: data.recent_audits.filter((a) => a.verdict === 'fail').length,
    };
  }, [data]);

  return (
    <>
      <Topbar
        title="Mes audits"
        crumbs={[{ label: 'AuditIQ' }, { label: 'Audits' }]}
        actions={
          <Button asChild variant="primary" size="sm">
            <Link href="/app/audits/nouveau">
              <Icons.plus size={16} />
              Nouvel audit
            </Link>
          </Button>
        }
      />
      <main className="flex-1 px-8 py-8">
        {/* Metric Cards */}
        <div className="mb-6 grid grid-cols-4 gap-4">
          <MetricCard label="Total audits" value={stats.total} />
          <MetricCard label="Conformes" value={stats.pass} />
          <MetricCard label="Sous vigilance" value={stats.warn} />
          <MetricCard label="Non conformes" value={stats.fail} />
        </div>

        {/* Status messages */}
        {isLoading && (
          <p role="status" className="rounded-lg border border-border-default bg-surface px-6 py-8 text-sm text-fg-secondary">
            Chargement de l&apos;historique…
          </p>
        )}

        {isError && (
          <p role="alert" className="rounded-lg border border-status-fail bg-surface px-6 py-8 text-sm text-status-fail">
            Impossible de charger les audits. Vérifiez que l&apos;API tourne (port 8000).
          </p>
        )}

        {data && (
          <Card className="p-0">
            {/* Header with tabs and buttons */}
            <div className="flex items-center justify-between gap-4 border-b border-border-default px-6 py-4">
              <Tabs
                items={FILTER_TABS}
                value={filterTab}
                onChange={setFilterTab}
                className="border-0"
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    console.log('Filtres clicked');
                  }}
                >
                  <Icons.search size={14} />
                  Filtres
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    console.log('Export clicked');
                  }}
                >
                  <Icons.fileText size={14} />
                  Exporter
                </Button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border-default">
                    <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-fg-muted">
                      Audit
                    </th>
                    <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-fg-muted">
                      Attribut protégé
                    </th>
                    <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-fg-muted">
                      Score fairness
                    </th>
                    <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-fg-muted">
                      Statut
                    </th>
                    <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-fg-muted">
                      Responsable
                    </th>
                    <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-fg-muted">
                      Exécuté
                    </th>
                    <th className="w-12 px-6 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAudits.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-sm text-fg-secondary">
                        Aucun audit dans cette catégorie.
                      </td>
                    </tr>
                  ) : (
                    filteredAudits.map((audit) => (
                      <tr
                        key={audit.id}
                        className="border-b border-border-default transition-colors hover:bg-surface-2 cursor-pointer"
                        onClick={() => {
                          // Will navigate via Link
                        }}
                      >
                        <td className="px-6 py-4">
                          <Link href={`/app/audits/${audit.id}`} className="block hover:underline">
                            <div className="font-medium text-fg">{audit.title}</div>
                            <div className="mt-0.5 font-mono text-xs text-fg-muted">
                              {audit.code ?? audit.id} · {audit.module}
                            </div>
                          </Link>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-block rounded-full border border-border-default bg-surface-2 px-2.5 py-1 text-xs font-medium text-fg-secondary">
                            {audit.module}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-semibold text-fg tabular-nums">
                              {audit.risk_score ?? '—'}
                            </span>
                            <div className="h-1 w-16 rounded-full bg-surface-2">
                              {audit.risk_score !== null && (
                                <div
                                  className="h-full rounded-full bg-status-warn"
                                  style={{
                                    width: `${Math.min(audit.risk_score, 100)}%`,
                                  }}
                                />
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <StatusBadge tone={audit.verdict ? VERDICT_TONE[audit.verdict] : 'neutral'} />
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Avatar name="—" size={24} />
                            <span className="text-sm text-fg-secondary">—</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-mono text-xs text-fg-muted">
                          {formatRelativeDate(audit.created_at)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            className="inline-flex size-8 items-center justify-center rounded-md hover:bg-surface-2 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              console.log('Actions for', audit.id);
                            }}
                          >
                            <Icons.fileText size={16} className="text-fg-muted" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </main>
    </>
  );
}
