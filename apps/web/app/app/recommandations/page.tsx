'use client';

import * as React from 'react';
import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, ArrowRight, Sparkles, TrendingUp, Sliders } from 'lucide-react';

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

const PRIORITY_MAP: Record<
  RecommendationOut['priority'],
  { status: StatusTone; label: string; numColor: string }
> = {
  high: {
    status: 'fail',
    label: 'Correctif prioritaire',
    numColor: 'var(--status-fail)',
  },
  medium: {
    status: 'warn',
    label: 'Atténuation',
    numColor: 'var(--status-warn)',
  },
  low: {
    status: 'info',
    label: 'Gouvernance',
    numColor: 'var(--status-info)',
  },
};

const PRIORITY_BG: Record<RecommendationOut['priority'], string> = {
  high: 'bg-status-fail-bg border-status-fail-border text-status-fail',
  medium: 'bg-status-warn-bg border-status-warn-border text-status-warn',
  low: 'bg-status-info-bg border-status-info-border text-status-info',
};

/* ─── Numbered recommendation card ─────────────────────────────────────── */
interface RecommendationCardProps {
  reco: RecommendationOut;
  index: number;
}

function RecommendationCard({ reco, index }: RecommendationCardProps) {
  const { status, label, numColor } = PRIORITY_MAP[reco.priority];
  const bgClass = PRIORITY_BG[reco.priority];

  return (
    <Card style={{ padding: '20px 22px' }}>
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        {/* Number square */}
        <div
          className={cn(
            'flex shrink-0 items-center justify-center rounded-lg border font-mono text-lg font-semibold',
            bgClass,
          )}
          style={{ width: 44, height: 44 }}
        >
          {index + 1}
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 6,
              flexWrap: 'wrap',
            }}
          >
            <h3 style={{ fontSize: 15.5, fontWeight: 500 }}>{reco.title}</h3>
            <StatusBadge tone={status}>{label}</StatusBadge>
          </div>
          <p
            style={{
              fontSize: 13.5,
              color: 'var(--fg-secondary)',
              lineHeight: 1.55,
              maxWidth: 640,
              marginBottom: 12,
            }}
          >
            {reco.detail}
          </p>
          {/* Chips */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 12px',
                borderRadius: 99,
                border: '1px solid var(--border-subtle)',
                background: 'var(--surface-2)',
                fontSize: 11,
                fontWeight: 500,
                color: 'var(--fg-secondary)',
              }}
            >
              <TrendingUp
                size={12}
                style={{ color: 'var(--status-pass)' }}
              />
              Impact · Variable
            </span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 12px',
                borderRadius: 99,
                border: '1px solid var(--border-subtle)',
                background: 'var(--surface-2)',
                fontSize: 11,
                fontWeight: 500,
                color: 'var(--fg-secondary)',
              }}
            >
              <Sliders size={12} />
              Effort · —
            </span>
          </div>
        </div>

        {/* Appliquer button */}
        <Button variant="outline" size="sm">
          Appliquer
          <ArrowRight size={13} />
        </Button>
      </div>
    </Card>
  );
}

/* ─── Audit-specific reco list ──────────────────────────────────────────── */
function AuditRecoList({ auditId }: { auditId: string }) {
  const { data: audit, isLoading, isError } = useAudit(auditId);

  if (isLoading) {
    return (
      <p
        role="status"
        className="rounded-lg border border-border-default bg-surface px-6 py-8 text-sm text-fg-secondary"
      >
        Chargement de l&apos;audit…
      </p>
    );
  }

  if (isError || !audit) {
    return (
      <p
        role="alert"
        className="rounded-lg border border-status-fail bg-surface px-6 py-8 text-sm text-status-fail"
      >
        Impossible de charger l&apos;audit. Vérifiez que l&apos;API tourne
        (port 8000).
      </p>
    );
  }

  const recommendations = audit.interpretation?.recommendations ?? [];
  const riskScore = audit.metrics?.risk_score ?? null;

  return (
    <>
      {/* Hero banner */}
      <Card
        style={{
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          background:
            'linear-gradient(100deg, color-mix(in srgb, var(--accent) 8%, transparent), transparent 60%)',
          padding: '20px 24px',
        }}
      >
        <Sparkles
          size={22}
          style={{ color: 'var(--accent)', flexShrink: 0 }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ fontSize: 15.5, fontWeight: 500, marginBottom: 4 }}>
            Plan de remédiation — {audit.title}
          </h2>
          {recommendations.length > 0 && (
            <p
              style={{
                fontSize: 13.5,
                color: 'var(--fg-muted)',
                lineHeight: 1.5,
              }}
            >
              En appliquant les premières actions, l&apos;audit pourrait
              repasser{' '}
              <strong style={{ color: 'var(--status-pass)', fontWeight: 500 }}>
                conforme
              </strong>
              .
            </p>
          )}
          {recommendations.length === 0 && (
            <p
              style={{
                fontSize: 13.5,
                color: 'var(--fg-muted)',
              }}
            >
              Aucune recommandation générée.
            </p>
          )}
        </div>
        {/* Score projection */}
        {riskScore != null && (
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: 'var(--fg-muted)',
                marginBottom: 4,
              }}
            >
              Projection
            </div>
            <div
              className="tnum"
              style={{
                fontSize: 26,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span style={{ color: 'var(--status-fail)' }}>{riskScore}</span>
              <ArrowRight size={16} style={{ display: 'inline' }} />
              <span style={{ color: 'var(--status-pass)' }}>
                {Math.min(100, riskScore + 27)}
              </span>
            </div>
          </div>
        )}
      </Card>

      {/* Reco cards */}
      {recommendations.length === 0 ? (
        <InlineNote>Aucune recommandation générée pour cet audit.</InlineNote>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {recommendations.map((reco, i) => (
            <RecommendationCard key={i} reco={reco} index={i} />
          ))}
        </div>
      )}
    </>
  );
}

/* ─── Dashboard-level reco list (no auditId) ─────────────────────────────── */
function DashboardRecoList() {
  const { data, isLoading, isError } = useDashboard();

  if (isLoading) {
    return (
      <p
        role="status"
        className="rounded-lg border border-border-default bg-surface px-6 py-8 text-sm text-fg-secondary"
      >
        Chargement de vos audits…
      </p>
    );
  }

  if (isError || !data) {
    return (
      <p
        role="alert"
        className="rounded-lg border border-status-fail bg-surface px-6 py-8 text-sm text-status-fail"
      >
        Impossible de charger les audits. Vérifiez que l&apos;API tourne (port
        8000).
      </p>
    );
  }

  const auditsWithVerdict = data.recent_audits.filter((a) => a.verdict !== null);

  return (
    <>
      <h2
        style={{
          fontSize: 16,
          fontWeight: 500,
          marginBottom: 16,
        }}
      >
        {auditsWithVerdict.length === 0
          ? 'Aucun audit complété'
          : `${auditsWithVerdict.length} audit${auditsWithVerdict.length > 1 ? 's' : ''} complété${auditsWithVerdict.length > 1 ? 's' : ''}`}
      </h2>

      {auditsWithVerdict.length === 0 ? (
        <div className="rounded-lg border border-border-default bg-surface p-8 text-center">
          <p className="text-sm text-fg-secondary">
            Lancez votre premier audit pour consulter les recommandations.
          </p>
          <Button asChild className="mt-4" variant="primary">
            <Link href="/app/audits/nouveau">Lancer un audit</Link>
          </Button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
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
    <Card
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        padding: '14px 18px',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <h3 style={{ fontSize: 13.5, fontWeight: 500 }}>{audit.title}</h3>
        <div
          style={{
            marginTop: 4,
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <code
            style={{ fontSize: 11, color: 'var(--fg-muted)' }}
          >
            {audit.code ?? 'N/A'}
          </code>
          <StatusBadge tone={tone} />
        </div>
      </div>
      <Button asChild variant="outline" size="sm">
        <Link href={`/app/recommandations?auditId=${audit.id}`}>
          Voir le plan
        </Link>
      </Button>
    </Card>
  );
}

/* ─── Page content (uses useSearchParams) ────────────────────────────────── */
function RecommandationsPageContent() {
  const searchParams = useSearchParams();
  const auditId = searchParams.get('auditId');

  return (
    <>
      <Topbar
        title="Recommandations"
        crumbs={
          auditId
            ? [
                { label: 'AuditIQ' },
                { label: auditId, href: `/app/audits/${auditId}` },
                { label: 'Recommandations' },
              ]
            : [{ label: 'AuditIQ' }, { label: 'Recommandations' }]
        }
        actions={
          auditId ? (
            <Button asChild variant="outline" size="sm">
              <Link href={`/app/audits/${auditId}`}>
                <ArrowLeft size={14} />
                Retour au résultat
              </Link>
            </Button>
          ) : (
            <Button asChild variant="outline" size="sm">
              <Link href="/app/audits">
                <ArrowLeft size={14} />
                Retour aux audits
              </Link>
            </Button>
          )
        }
      />
      <main className="flex-1 px-8 py-8">
        {auditId ? (
          <AuditRecoList auditId={auditId} />
        ) : (
          <DashboardRecoList />
        )}
      </main>
    </>
  );
}

/* ─── Page export ────────────────────────────────────────────────────────── */
export default function RecommandationsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <p className="text-sm text-fg-secondary">Chargement…</p>
        </div>
      }
    >
      <RecommandationsPageContent />
    </Suspense>
  );
}
