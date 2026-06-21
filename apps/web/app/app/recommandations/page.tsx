'use client';

import * as React from 'react';
import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, Sparkles } from 'lucide-react';

import { Topbar } from '@/components/app/Topbar';
import { StatusBadge, type StatusTone } from '@/components/product/StatusBadge';
import { InlineNote } from '@/components/product/InlineNote';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { RecommendationOut } from '@/lib/api/audits';
import type { RecentAudit } from '@/lib/api/dashboard';
import {
  CATEGORY_LABEL,
  HORIZON_LABEL,
  OWNER_LABEL,
  PRIORITY_LABEL,
  priorityRank,
  recoRationale,
} from '@/components/audits/Recommendations';
import { useAudit } from '@/lib/query/use-audit';
import { useDashboard } from '@/lib/query/use-dashboard';

const PRIORITY_STATUS: Record<1 | 2 | 3, StatusTone> = {
  1: 'fail',
  2: 'warn',
  3: 'info',
};

const PRIORITY_BG: Record<1 | 2 | 3, string> = {
  1: 'bg-status-fail-bg border-status-fail-border text-status-fail',
  2: 'bg-status-warn-bg border-status-warn-border text-status-warn',
  3: 'bg-status-info-bg border-status-info-border text-status-info',
};

/* ─── Numbered recommendation card ─────────────────────────────────────── */
interface RecommendationCardProps {
  reco: RecommendationOut;
  index: number;
}

function RecommendationCard({ reco, index }: RecommendationCardProps) {
  const rank = priorityRank(reco);
  const status = PRIORITY_STATUS[rank];
  const label = PRIORITY_LABEL[rank];
  const bgClass = PRIORITY_BG[rank];
  const steps = reco.steps ?? [];

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
            }}
          >
            {recoRationale(reco)}
          </p>

          {/* Méta : catégorie · responsable · horizon */}
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            {reco.category && (
              <span className="inline-block rounded-full border border-border-subtle bg-surface-2 px-2 py-0.5 text-[11px] text-fg-secondary">
                {CATEGORY_LABEL[reco.category]}
              </span>
            )}
            {reco.owner && (
              <span className="inline-block rounded-full border border-border-subtle bg-surface-2 px-2 py-0.5 text-[11px] text-fg-secondary">
                Responsable&nbsp;: {OWNER_LABEL[reco.owner]}
              </span>
            )}
            {reco.horizon && (
              <span className="inline-block rounded-full border border-border-subtle bg-surface-2 px-2 py-0.5 text-[11px] text-fg-secondary">
                {HORIZON_LABEL[reco.horizon]}
              </span>
            )}
          </div>

          {reco.legal_ref && (
            <p className="mt-2 text-[12px] text-fg-muted">
              <span className="font-medium text-fg-secondary">Réf. légale&nbsp;:</span>{' '}
              {reco.legal_ref}
            </p>
          )}

          {steps.length > 0 && (
            <div className="mt-2.5 flex flex-col gap-1">
              <span className="text-[11px] font-medium uppercase tracking-wide text-fg-muted">
                Étapes
              </span>
              <ol className="flex list-decimal flex-col gap-0.5 pl-5 text-[13px] text-fg-secondary">
                {steps.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

/* ─── Audit-specific reco list ──────────────────────────────────────────── */
function AuditRecoList({ auditId }: { auditId: string }) {
  const { data: audit, isLoading, isError, refetch } = useAudit(auditId);

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
      <div
        role="alert"
        className="flex flex-col items-start gap-3 rounded-lg border border-status-fail bg-surface px-6 py-8 text-sm text-status-fail"
      >
        <p>Connexion au serveur impossible. Réessayez dans quelques instants.</p>
        <Button variant="outline" size="sm" onClick={() => void refetch()}>
          Réessayer
        </Button>
      </div>
    );
  }

  const recommendations = audit.interpretation?.recommendations ?? [];

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
            Plan d&apos;action — {audit.title}
          </h2>
          {recommendations.length > 0 && (
            <p
              style={{
                fontSize: 13.5,
                color: 'var(--fg-muted)',
                lineHeight: 1.5,
              }}
            >
              Actions de gouvernance et de documentation, classées par priorité
              et assorties d&apos;un responsable et d&apos;un horizon.
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
      </Card>

      {/* Reco cards */}
      {recommendations.length === 0 ? (
        <InlineNote>Aucune recommandation générée pour cet audit.</InlineNote>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[...recommendations]
            .map((reco, i) => ({ reco, i }))
            .sort((a, b) => priorityRank(a.reco) - priorityRank(b.reco))
            .map(({ reco }, displayIdx) => (
              <RecommendationCard
                key={`${reco.title}-${displayIdx}`}
                reco={reco}
                index={displayIdx}
              />
            ))}
        </div>
      )}
    </>
  );
}

/* ─── Dashboard-level reco list (no auditId) ─────────────────────────────── */
function DashboardRecoList() {
  const { data, isLoading, isError, refetch } = useDashboard();

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
      <div
        role="alert"
        className="flex flex-col items-start gap-3 rounded-lg border border-status-fail bg-surface px-6 py-8 text-sm text-status-fail"
      >
        <p>Connexion au serveur impossible. Réessayez dans quelques instants.</p>
        <Button variant="outline" size="sm" onClick={() => void refetch()}>
          Réessayer
        </Button>
      </div>
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
      <main className="page flex-1">
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
