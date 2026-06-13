'use client';

import * as React from 'react';
import Link from 'next/link';
import { FileText, Download } from 'lucide-react';

import { useDashboard } from '@/lib/query/use-dashboard';
import { downloadReport } from '@/lib/api/audits';
import { Topbar } from '@/components/app/Topbar';
import { MetricCard } from '@/components/product/MetricCard';
import { StatusBadge } from '@/components/product/StatusBadge';
import { InlineNote } from '@/components/product/InlineNote';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Icons } from '@/components/ui/icons';

export default function RapportsPage() {
  const { data: dashboard, isLoading, isError, refetch } = useDashboard();

  const handleDownload = (auditId: string, format: 'pdf' | 'xlsx') => {
    void downloadReport(auditId, format);
  };

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

        {recentAudits.length === 0 ? (
          <InlineNote>
            Aucun rapport encore généré.{' '}
            <Link href="/app/audits/nouveau" className="text-accent hover:underline">
              Commencez par créer un audit
            </Link>
          </InlineNote>
        ) : (
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
              <tbody>
                {recentAudits.map((audit) => {
                  const isGenerated = audit.verdict !== null;
                  const statusTone = audit.verdict === 'pass' ? 'pass' : audit.verdict === 'warn' ? 'warn' : 'fail';
                  return (
                    <tr
                      key={audit.id}
                      className="border-b border-border-default hover:bg-surface-2 cursor-pointer transition-colors"
                      onClick={() => { window.location.href = `/app/audits/${audit.id}`; }}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-surface-2 border border-border-default flex items-center justify-center">
                            <FileText size={16} className="text-fg-muted" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-fg truncate">{audit.title}</div>
                            {audit.code && (
                              <div className="text-xs font-mono text-fg-muted mt-0.5 truncate">{audit.code}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {isGenerated && (
                          <StatusBadge tone={statusTone} noDot />
                        )}
                      </td>
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
                        {new Date(audit.created_at).toLocaleDateString('fr-FR', { dateStyle: 'short' })}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownload(audit.id, 'pdf');
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
                              handleDownload(audit.id, 'xlsx');
                            }}
                            className="gap-1.5"
                          >
                            <Download size={14} />
                            Excel
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        )}
      </div>
    </>
  );
}


