'use client';

import * as React from 'react';
import Link from 'next/link';

import { Topbar } from '@/components/app/Topbar';
import { Avatar } from '@/components/product/Avatar';
import { StatusBadge, type StatusTone } from '@/components/product/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Icons } from '@/components/ui/icons';
import type { RecentAudit } from '@/lib/api/dashboard';
import { useDashboard } from '@/lib/query/use-dashboard';
import { VERDICT_LABELS } from '@/lib/verdict';

const FILTER_TABS = [
  { id: 'all', label: 'Tous' },
  { id: 'fail', label: VERDICT_LABELS.fail },
  { id: 'warn', label: VERDICT_LABELS.warn },
  { id: 'pass', label: VERDICT_LABELS.pass },
];

const VERDICT_TONE: Record<'fail' | 'warn' | 'pass', StatusTone> = {
  fail: 'fail',
  warn: 'warn',
  pass: 'pass',
};

const STATUS_COLORS: Record<'fail' | 'warn' | 'pass', string> = {
  fail: 'var(--status-fail)',
  warn: 'var(--status-warn)',
  pass: 'var(--status-pass)',
};

function formatRelativeDate(date: string): string {
  const now = new Date();
  const d = new Date(date);
  const days = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (days === 0) return "Aujourd'hui";
  if (days === 1) return 'Hier';
  if (days < 7) return `Il y a ${days} j`;
  if (days < 30) return `Il y a ${Math.floor(days / 7)} sem`;
  return `Il y a ${Math.floor(days / 30)} mois`;
}

export default function AuditsListPage() {
  const { data, isLoading, isError, refetch } = useDashboard();
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
      <main className="page flex-1">
        {/* 4 Metric cards */}
        <div className="grid-4" style={{ marginBottom: 20 }}>
          <MetricKpi label="Total audits" value={stats.total} />
          <MetricKpi label={VERDICT_LABELS.pass} value={stats.pass} tone="pass" hint={`${stats.total > 0 ? Math.round((stats.pass / stats.total) * 100) : 0} %`} />
          <MetricKpi label={VERDICT_LABELS.warn} value={stats.warn} tone="warn" hint={`${stats.total > 0 ? Math.round((stats.warn / stats.total) * 100) : 0} %`} />
          <MetricKpi label={VERDICT_LABELS.fail} value={stats.fail} tone="fail" hint={`${stats.total > 0 ? Math.round((stats.fail / stats.total) * 100) : 0} %`} />
        </div>

        {/* Status messages */}
        {isLoading && (
          <p role="status" className="rounded-lg border border-border-default bg-surface px-6 py-8 text-sm text-fg-secondary">
            Chargement de l&apos;historique…
          </p>
        )}

        {isError && (
          <div role="alert" className="flex flex-col items-start gap-3 rounded-lg border border-status-fail bg-surface px-6 py-8 text-sm text-status-fail">
            <p>Connexion au serveur impossible. Réessayez dans quelques instants.</p>
            <Button variant="outline" size="sm" onClick={() => void refetch()}>
              Réessayer
            </Button>
          </div>
        )}

        {data && (
          <Card style={{ padding: 0 }}>
            {/* Filter tabs + action buttons */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                padding: '14px 16px',
                borderBottom: '1px solid var(--border-subtle)',
                flexWrap: 'wrap',
              }}
            >
              {/* Underline tab strip */}
              <div
                style={{
                  display: 'flex',
                  gap: 0,
                  borderBottom: '1px solid var(--border-default)',
                }}
              >
                {FILTER_TABS.map((f) => (
                  <button
                    key={f.id}
                    role="tab"
                    aria-selected={filterTab === f.id}
                    onClick={() => setFilterTab(f.id)}
                    style={{
                      padding: '8px 16px',
                      fontSize: 13.5,
                      fontWeight: filterTab === f.id ? 500 : 400,
                      color: filterTab === f.id ? 'var(--fg)' : 'var(--fg-muted)',
                      background: 'none',
                      border: 'none',
                      borderBottom: filterTab === f.id
                        ? '2px solid var(--accent)'
                        : '2px solid transparent',
                      cursor: 'pointer',
                      transition: 'color 0.15s, border-color 0.15s',
                      marginBottom: -1,
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-default)' }}>
                    {['Audit', 'Module', 'Score de risque', 'Statut', 'Responsable', 'Exécuté'].map(
                      (h) => (
                        <th
                          key={h}
                          style={{
                            padding: '10px 20px',
                            textAlign: 'left',
                            fontSize: 11,
                            fontWeight: 600,
                            color: 'var(--fg-muted)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.06em',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {h}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {filteredAudits.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        style={{
                          padding: '32px 20px',
                          textAlign: 'center',
                          fontSize: 13,
                          color: 'var(--fg-secondary)',
                        }}
                      >
                        Aucun audit dans cette catégorie.
                      </td>
                    </tr>
                  ) : (
                    filteredAudits.map((audit) => (
                      <AuditTableRow key={audit.id} audit={audit} />
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

/* ─── Metric KPI card ────────────────────────────────────────────────────── */
function MetricKpi({
  label,
  value,
  tone,
  hint,
}: {
  label: string;
  value: number;
  tone?: 'pass' | 'warn' | 'fail';
  hint?: string;
}) {
  const color = tone ? STATUS_COLORS[tone] : 'var(--fg)';
  return (
    <Card>
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          color: 'var(--fg-muted)',
          marginBottom: 12,
        }}
      >
        {label}
      </div>
      <div
        className="tnum"
        style={{
          fontSize: 30,
          fontWeight: 600,
          letterSpacing: '-0.03em',
          color,
        }}
      >
        {value}
      </div>
      {hint && (
        <div
          style={{ fontSize: 12.5, color: 'var(--fg-muted)', marginTop: 8 }}
        >
          {hint}
        </div>
      )}
    </Card>
  );
}

/* ─── Table row ──────────────────────────────────────────────────────────── */
function AuditTableRow({ audit }: { audit: RecentAudit }) {
  const verdict = audit.verdict ?? null;
  const tone: StatusTone = verdict ? VERDICT_TONE[verdict] : 'neutral';
  const scoreColor = verdict ? STATUS_COLORS[verdict] : 'var(--fg-muted)';

  return (
    <tr
      style={{
        borderBottom: '1px solid var(--border-subtle)',
        transition: 'background 0.1s',
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLTableRowElement).style.background =
          'var(--surface-2)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLTableRowElement).style.background = '';
      }}
    >
      {/* Audit name + code */}
      <td style={{ padding: '14px 20px' }}>
        <Link
          href={`/app/audits/${audit.id}`}
          style={{ textDecoration: 'none', display: 'block' }}
        >
          <div
            style={{ fontWeight: 500, color: 'var(--fg)', fontSize: 13.5 }}
          >
            {audit.title}
          </div>
          <div
            className="mono"
            style={{ fontSize: 11.5, color: 'var(--fg-muted)', marginTop: 2 }}
          >
            {audit.code ?? audit.id} · {audit.module}
          </div>
        </Link>
      </td>

      {/* Protected attribute chip */}
      <td style={{ padding: '14px 20px' }}>
        <span
          className="chip"
          style={{ color: 'var(--fg-muted)' }}
        >
          {audit.module}
        </span>
      </td>

      {/* Score + thin progress bar */}
      <td style={{ padding: '14px 20px', width: 150 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <span
            className="tnum"
            style={{
              fontWeight: 600,
              color: scoreColor,
              width: 28,
              fontSize: 13.5,
            }}
          >
            {audit.risk_score ?? '—'}
          </span>
          <div
            style={{
              flex: 1,
              height: 5,
              background: 'var(--surface-3)',
              borderRadius: 99,
            }}
          >
            {audit.risk_score != null && (
              <div
                style={{
                  width: `${Math.min(audit.risk_score, 100)}%`,
                  height: '100%',
                  background: scoreColor,
                  borderRadius: 99,
                  transition: 'width 0.6s ease-out',
                }}
              />
            )}
          </div>
        </div>
      </td>

      {/* Status badge */}
      <td style={{ padding: '14px 20px' }}>
        <StatusBadge tone={tone} />
      </td>

      {/* Responsible (avatar + first name) */}
      <td style={{ padding: '14px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Avatar name="—" size={24} />
          <span style={{ fontSize: 13, color: 'var(--fg-secondary)' }}>—</span>
        </div>
      </td>

      {/* Relative date */}
      <td
        className="mono"
        style={{ padding: '14px 20px', fontSize: 12.5, color: 'var(--fg-muted)' }}
      >
        {formatRelativeDate(audit.created_at)}
      </td>
    </tr>
  );
}
