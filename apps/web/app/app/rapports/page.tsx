'use client';

import * as React from 'react';
import Link from 'next/link';
import { FileText, Download } from 'lucide-react';

import { useDashboard } from '@/lib/query/use-dashboard';
import { useAuditsList } from '@/lib/query/use-audits';
import { useMe } from '@/lib/query/use-org';
import { downloadReport, type AuditListItem } from '@/lib/api/audits';
import type { RecentAudit } from '@/lib/api/dashboard';
import type { Role } from '@/lib/api/org';
import { Topbar } from '@/components/app/Topbar';
import { MetricCard } from '@/components/product/MetricCard';
import { StatusBadge } from '@/components/product/StatusBadge';
import { InlineNote } from '@/components/product/InlineNote';
import { AuditRowActions } from '@/components/audits/AuditRowActions';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Icons } from '@/components/ui/icons';

type Scope = 'active' | 'archived';

export default function RapportsPage() {
  const [scope, setScope] = React.useState<Scope>('active');

  const { data: dashboard, isLoading, isError, refetch } = useDashboard();
  const { data: me } = useMe();
  const role = me?.role;

  // La liste « Archivés » n'est requêtée que lorsque l'onglet est actif.
  const archivedQuery = useAuditsList(true);
  const archived = scope === 'archived' ? archivedQuery : null;

  const handleDownload = (auditId: string, format: 'pdf' | 'xlsx') => {
    void downloadReport(auditId, format);
  };

  // L'état de chargement/erreur des métriques d'en-tête suit toujours le dashboard.
  if (isLoading) {
    return (
      <>
        <Topbar title="Rapports" crumbs={[{ label: 'AuditIQ' }, { label: 'Rapports' }]} />
        <div className="flex items-center justify-center p-8 text-fg-muted">Chargement…</div>
      </>
    );
  }

  if (isError) {
    return (
      <>
        <Topbar title="Rapports" crumbs={[{ label: 'AuditIQ' }, { label: 'Rapports' }]} />
        <div className="page">
          <div
            role="alert"
            className="flex flex-col items-start gap-3 rounded-lg border border-status-fail bg-surface px-6 py-8 text-sm text-status-fail"
          >
            <p>Connexion au serveur impossible. Réessayez dans quelques instants.</p>
            <Button variant="outline" size="sm" onClick={() => void refetch()}>
              Réessayer
            </Button>
          </div>
        </div>
      </>
    );
  }

  const recentAudits = dashboard?.recent_audits || [];
  const totalAudits = dashboard?.total_audits || 0;
  const generatedCount = recentAudits.filter((a) => a.verdict !== null).length;
  const pendingCount = totalAudits - generatedCount;

  return (
    <>
      <Topbar
        title="Rapports"
        crumbs={[{ label: 'AuditIQ' }, { label: 'Rapports' }]}
        actions={
          <Link href="/app/audits/nouveau">
            <Button variant="primary" size="sm">
              <Icons.plus size={16} />
              Nouvel audit
            </Button>
          </Link>
        }
      />

      <div className="page space-y-6">
        <div className="grid grid-cols-3 gap-4">
          <MetricCard label="Rapports générés" value={totalAudits} />
          <MetricCard label="Horodatés & archivés" value={generatedCount} />
          <MetricCard label="En attente de revue" value={pendingCount} />
        </div>

        <div className="space-y-2">
          <div className="flex items-baseline gap-2">
            <span className="text-xs uppercase tracking-[0.1em] font-medium text-fg-muted">Bibliothèque</span>
          </div>
          <h2 className="text-h2 font-medium tracking-tight">Tous les rapports</h2>
          <p className="text-sm text-fg-secondary max-w-2xl">
            Documents horodatés et versionnés, pour documenter vos démarches en cas de contrôle.
          </p>
        </div>

        {/* Sélecteur Actifs / Archivés */}
        <div
          role="tablist"
          aria-label="Filtrer les rapports"
          className="inline-flex rounded-[var(--r-md)] border border-border-default bg-surface p-1"
        >
          <ScopeTab id="active" current={scope} onSelect={setScope} label="Actifs" />
          <ScopeTab id="archived" current={scope} onSelect={setScope} label="Archivés" />
        </div>

        {scope === 'active' ? (
          <ActiveReports
            audits={recentAudits}
            role={role}
            onDownload={handleDownload}
          />
        ) : (
          <ArchivedReports query={archived!} role={role} onDownload={handleDownload} />
        )}
      </div>
    </>
  );
}

/* ─── Onglet de scope ────────────────────────────────────────────────────── */
function ScopeTab({
  id,
  current,
  onSelect,
  label,
}: {
  id: Scope;
  current: Scope;
  onSelect: (s: Scope) => void;
  label: string;
}) {
  const active = current === id;
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={() => onSelect(id)}
      className={
        active
          ? 'rounded-[var(--r-sm)] bg-surface-2 px-4 py-1.5 text-sm font-medium text-fg'
          : 'rounded-[var(--r-sm)] px-4 py-1.5 text-sm text-fg-muted transition-colors hover:text-fg'
      }
    >
      {label}
    </button>
  );
}

/* ─── Vue « Actifs » (dashboard, inchangée) ──────────────────────────────── */
function ActiveReports({
  audits,
  role,
  onDownload,
}: {
  audits: RecentAudit[];
  role: Role | undefined;
  onDownload: (id: string, fmt: 'pdf' | 'xlsx') => void;
}) {
  if (audits.length === 0) {
    return (
      <InlineNote>
        Aucun rapport encore généré.{' '}
        <Link href="/app/audits/nouveau" className="text-accent hover:underline">
          Commencez par créer un audit
        </Link>
      </InlineNote>
    );
  }

  return (
    <ReportsTable>
      {audits.map((audit) => {
        const isGenerated = audit.verdict !== null;
        const statusTone =
          audit.verdict === 'pass' ? 'pass' : audit.verdict === 'warn' ? 'warn' : 'fail';
        return (
          <ReportRow
            key={audit.id}
            id={audit.id}
            code={audit.code}
            title={audit.title}
            createdAt={audit.created_at}
            archived={false}
            isGenerated={isGenerated}
            statusTone={statusTone}
            role={role}
            onDownload={onDownload}
          />
        );
      })}
    </ReportsTable>
  );
}

/* ─── Vue « Archivés » ───────────────────────────────────────────────────── */
function ArchivedReports({
  query,
  role,
  onDownload,
}: {
  query: ReturnType<typeof useAuditsList>;
  role: Role | undefined;
  onDownload: (id: string, fmt: 'pdf' | 'xlsx') => void;
}) {
  if (query.isLoading) {
    return (
      <p role="status" className="rounded-lg border border-border-default bg-surface px-6 py-8 text-sm text-fg-secondary">
        Chargement des rapports archivés…
      </p>
    );
  }

  if (query.isError) {
    return (
      <div role="alert" className="flex flex-col items-start gap-3 rounded-lg border border-status-fail bg-surface px-6 py-8 text-sm text-status-fail">
        <p>Impossible de charger les rapports archivés.</p>
        <Button variant="outline" size="sm" onClick={() => void query.refetch()}>
          Réessayer
        </Button>
      </div>
    );
  }

  const items = query.data ?? [];
  if (items.length === 0) {
    return <InlineNote>Aucun rapport archivé.</InlineNote>;
  }

  return (
    <ReportsTable>
      {items.map((audit: AuditListItem) => {
        const isGenerated = audit.verdict !== null;
        const statusTone =
          audit.verdict === 'pass' ? 'pass' : audit.verdict === 'warn' ? 'warn' : 'fail';
        return (
          <ReportRow
            key={audit.id}
            id={audit.id}
            code={audit.code}
            title={audit.title}
            createdAt={audit.created_at}
            archived
            isGenerated={isGenerated}
            statusTone={statusTone}
            role={role}
            onDownload={onDownload}
          />
        );
      })}
    </ReportsTable>
  );
}

/* ─── Table partagée ─────────────────────────────────────────────────────── */
function ReportsTable({ children }: { children: React.ReactNode }) {
  return (
    <Card className="overflow-hidden p-0">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border-default">
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-[0.06em] text-fg-muted">
              Rapport
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-[0.06em] text-fg-muted">
              Verdict
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-[0.06em] text-fg-muted">
              Statut
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-[0.06em] text-fg-muted">
              Date
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-[0.06em] text-fg-muted">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </Card>
  );
}

/* ─── Ligne de rapport ───────────────────────────────────────────────────── */
function ReportRow({
  id,
  code,
  title,
  createdAt,
  archived,
  isGenerated,
  statusTone,
  role,
  onDownload,
}: {
  id: string;
  code: string | null;
  title: string;
  createdAt: string;
  archived: boolean;
  isGenerated: boolean;
  statusTone: 'pass' | 'warn' | 'fail';
  role: Role | undefined;
  onDownload: (id: string, fmt: 'pdf' | 'xlsx') => void;
}) {
  return (
    <tr
      className="border-b border-border-default hover:bg-surface-2 cursor-pointer transition-colors"
      onClick={() => {
        window.location.href = `/app/audits/${id}`;
      }}
    >
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-surface-2 border border-border-default flex items-center justify-center">
            <FileText size={16} className="text-fg-muted" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-medium text-fg truncate">{title}</div>
            {code && <div className="text-xs font-mono text-fg-muted mt-0.5 truncate">{code}</div>}
          </div>
        </div>
      </td>
      <td className="px-6 py-4">{isGenerated && <StatusBadge tone={statusTone} noDot />}</td>
      <td className="px-6 py-4">
        {isGenerated ? (
          <span className="inline-flex items-center gap-1.5 text-xs text-status-pass font-medium">
            <Icons.fileText size={14} />
            Généré
          </span>
        ) : (
          <span className="text-xs text-fg-muted">Brouillon</span>
        )}
      </td>
      <td className="px-6 py-4 font-mono text-sm text-fg-muted">
        {new Date(createdAt).toLocaleDateString('fr-FR', { dateStyle: 'short' })}
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onDownload(id, 'pdf');
            }}
            className="gap-1.5"
          >
            <Download size={14} />
            PDF
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onDownload(id, 'xlsx');
            }}
            className="gap-1.5"
          >
            <Download size={14} />
            Excel
          </Button>
          <AuditRowActions
            auditId={id}
            auditTitle={title}
            archived={archived}
            role={role}
            noun="rapport"
          />
        </div>
      </td>
    </tr>
  );
}
