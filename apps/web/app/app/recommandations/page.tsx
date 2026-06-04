'use client';

import * as React from 'react';
import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, Sparkles, TrendingUp, Sliders } from 'lucide-react';

import { Topbar } from '@/components/app/Topbar';
import { StatusBadge, type StatusTone } from '@/components/product/StatusBadge';
import { InlineNote } from '@/components/product/InlineNote';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { RecommendationOut } from '@/lib/api/audits';
import type { RecentAudit } from '@/lib/api/dashboard';
import { useAudit } from '@/lib/query/use-audit';
import { useDashboard } from '@/lib/query/use-dashboard';

const PRIORITY_MAP: Record<RecommendationOut['priority'], { status: StatusTone; label: string }> = {
  high: { status: 'fail', label: 'Correctif prioritaire' },
  medium: { status: 'warn', label: 'Atténuation' },
  low: { status: 'info', label: 'Gouvernance' },
};

const PRIORITY_BG: Record<RecommendationOut['priority'], string> = {
  high: 'bg-status-fail-bg border-status-fail-border text-status-fail',
  medium: 'bg-status-warn-bg border-status-warn-border text-status-warn',
  low: 'bg-status-info-bg border-status-info-border text-status-info',
};

interface RecommendationCardProps {
  reco: RecommendationOut;
  index: number;
}

function RecommendationCard({ reco, index }: RecommendationCardProps) {
  const { status, label } = PRIORITY_MAP[reco.priority];
  const bgClass = PRIORITY_BG[reco.priority];

  return (
    <Card className="flex flex-col gap-4 md:flex-row md:items-start">
      <div
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-lg border font-mono text-sm font-semibold',
          bgClass,
        )}
      >
        {index + 1}
      </div>
      <div className="flex-1 min-w-0">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold text-fg">{reco.title}</h3>
          <StatusBadge tone={status}>{label}</StatusBadge>
        </div>
        <p className="mb-3 text-xs leading-relaxed text-fg-secondary">{reco.detail}</p>
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border-subtle bg-surface-2 px-3 py-1 text-[11px] font-medium text-fg-secondary">
            <TrendingUp size={12} className="text-status-pass" />
            Impact · Variable
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border-subtle bg-surface-2 px-3 py-1 text-[11px] font-medium text-fg-secondary">
            <Sliders size={12} />
            Effort · —
          </span>
        </div>
      </div>
    </Card>
  );
}

function AuditRecoList({ auditId }: { auditId: string }) {
  const { data: audit, isLoading, isError } = useAudit(auditId);

  if (isLoading) {
    return (
      <p role="status" className="rounded-lg border border-border-default bg-surface px-6 py-8 text-sm text-fg-secondary">
        Chargement de l&apos;audit…
      </p>
    );
  }

  if (isError || !audit) {
    return (
      <p role="alert" className="rounded-lg border border-status-fail bg-surface px-6 py-8 text-sm text-status-fail">
        Impossible de charger l&apos;audit. Vérifiez que l&apos;API tourne (port 8000).
      </p>
    );
  }

  const recommendations = audit.interpretation?.recommendations ?? [];

  return (
    <>
      <Card className="mb-6 flex flex-col gap-4 border-none bg-gradient-to-r from-accent-softer to-transparent p-6 md:flex-row md:items-center">
        <div className="flex items-start gap-3 flex-1">
          <Sparkles size={20} className="mt-0.5 shrink-0 text-accent" />
          <div>
            <h2 className="text-base font-semibold text-fg">Plan de remédiation — {audit.title}</h2>
            {recommendations.length > 0 && (
              <p className="mt-1 text-xs text-fg-secondary">
                {recommendations.length} recommandation{recommendations.length > 1 ? 's' : ''} générée{recommendations.length > 1 ? 's' : ''}
              </p>
            )}
          </div>
        </div>
      </Card>

      {recommendations.length === 0 ? (
        <InlineNote>Aucune recommandation générée pour cet audit.</InlineNote>
      ) : (
        <div className="space-y-3">
          {recommendations.map((reco, i) => (
            <RecommendationCard key={i} reco={reco} index={i} />
          ))}
        </div>
      )}
    </>
  );
}

function DashboardRecoList() {
  const { data, isLoading, isError } = useDashboard();

  if (isLoading) {
    return (
      <p role="status" className="rounded-lg border border-border-default bg-surface px-6 py-8 text-sm text-fg-secondary">
        Chargement de vos audits…
      </p>
    );
  }

  if (isError || !data) {
    return (
      <p role="alert" className="rounded-lg border border-status-fail bg-surface px-6 py-8 text-sm text-status-fail">
        Impossible de charger les audits. Vérifiez que l&apos;API tourne (port 8000).
      </p>
    );
  }

  const auditsWithVerdict = data.recent_audits.filter((a) => a.verdict !== null);

  return (
    <>
      <h2 className="mb-4 text-base font-semibold text-fg">
        {auditsWithVerdict.length === 0
          ? 'Aucun audit complété'
          : `${auditsWithVerdict.length} audit${auditsWithVerdict.length > 1 ? 's' : ''} complété${auditsWithVerdict.length > 1 ? 's' : ''}`}
      </h2>

      {auditsWithVerdict.length === 0 ? (
        <div className="rounded-lg border border-border-default bg-surface p-8 text-center">
          <p className="text-sm text-fg-secondary">Lancez votre premier audit pour consulter les recommandations.</p>
          <Button asChild className="mt-4" variant="primary">
            <Link href="/app/audits/nouveau">Lancer un audit</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {auditsWithVerdict.map((audit) => (
            <RecommendationListRow key={audit.id} audit={audit} />
          ))}
        </div>
      )}
    </>
  );
}

function RecommendationListRow({ audit }: { audit: RecentAudit }) {
  const tone: StatusTone = audit.verdict ?? 'info';

  return (
    <Card className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-semibold text-fg">{audit.title}</h3>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <code className="text-[11px] text-fg-muted">{audit.code || 'N/A'}</code>
          <StatusBadge tone={tone} />
        </div>
      </div>
      <Button asChild variant="outline" size="sm">
        <Link href={`/app/recommandations?auditId=${audit.id}`}>Voir le plan</Link>
      </Button>
    </Card>
  );
}

function RecommandationsPageContent() {
  const searchParams = useSearchParams();
  const auditId = searchParams.get('auditId');

  return (
    <>
      <Topbar
        title="Recommandations"
        crumbs={[{ label: 'AuditIQ' }, { label: 'Recommandations' }]}
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/app/audits">
              <ArrowLeft size={14} />
              Retour aux audits
            </Link>
          </Button>
        }
      />
      <main className="flex-1 px-8 py-8">
        {auditId ? <AuditRecoList auditId={auditId} /> : <DashboardRecoList />}
      </main>
    </>
  );
}

export default function RecommandationsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-sm text-fg-secondary">Chargement…</p>
        </div>
      }
    >
      <RecommandationsPageContent />
    </Suspense>
  );
}
