'use client';

import Link from 'next/link';

import { Topbar } from '@/components/app/Topbar';
import { Gauge } from '@/components/product/Gauge';
import { MetricCard } from '@/components/product/MetricCard';
import { StatusBadge, type StatusTone } from '@/components/product/StatusBadge';
import { Button } from '@/components/ui/button';
import type { RecentAudit } from '@/lib/api/dashboard';
import { useDashboard } from '@/lib/query/use-dashboard';

const VERDICT_TONE: Record<
  'fail' | 'warn' | 'pass',
  { tone: StatusTone; label: string }
> = {
  fail: { tone: 'fail', label: 'Critique' },
  warn: { tone: 'warn', label: 'Vigilance' },
  pass: { tone: 'pass', label: 'Conforme' },
};

function riskCaption(score: number): string {
  if (score >= 71) return '/100 · risque critique';
  if (score >= 31) return '/100 · risque modéré';
  return '/100 · risque faible';
}

function auditTone(
  verdict: RecentAudit['verdict'],
): { tone: StatusTone; label: string } {
  return verdict
    ? VERDICT_TONE[verdict]
    : { tone: 'info', label: 'En cours' };
}

export default function DashboardPage() {
  const { data, isLoading, isError } = useDashboard();

  if (isLoading) {
    return (
      <main role="status" className="flex-1 px-8 py-8 text-fg-secondary">
        Chargement du tableau de bord…
      </main>
    );
  }
  if (isError || !data) {
    return (
      <main className="flex-1 px-8 py-8 text-status-fail">
        Impossible de charger le tableau de bord.
      </main>
    );
  }

  const total = data.total_audits;
  const moduleEntries = Object.entries(data.module_usage);

  return (
    <>
      <Topbar crumbs={[{ label: "Vue d'ensemble" }]} />
      <main className="flex-1 px-8 py-8">
        <header className="mb-8 flex flex-wrap items-end justify-between gap-6">
          <div>
            <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-fg">
              Bonjour
            </h1>
            <p className="mt-1.5 max-w-[60ch] text-sm text-fg-secondary">
              Vous avez{' '}
              <strong className="text-fg">{total} audits</strong> et{' '}
              <strong className="text-fg">
                {data.warning_audits} en vigilance
              </strong>
              .
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <Button asChild variant="secondary" size="sm">
              <Link href="/app/audits">Historique</Link>
            </Button>
            <Button asChild variant="primary">
              <Link href="/app/audits/nouveau">+ Lancer un audit</Link>
            </Button>
          </div>
        </header>

        <section className="mb-4 grid gap-4 lg:grid-cols-[360px_1fr]">
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-border-default bg-surface p-8">
            <div className="flex w-full items-baseline justify-between">
              <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-fg-muted">
                Score de risque global
              </span>
              <StatusBadge
                tone={
                  data.risk_score >= 71
                    ? 'fail'
                    : data.risk_score >= 31
                      ? 'warn'
                      : 'pass'
                }
              >
                {data.risk_score >= 71
                  ? 'Critique'
                  : data.risk_score >= 31
                    ? 'Vigilance'
                    : 'Conforme'}
              </StatusBadge>
            </div>
            <Gauge
              value={data.risk_score}
              label="Score de risque global"
              caption={riskCaption(data.risk_score)}
            />
            <p className="mt-2 max-w-[32ch] text-center text-sm leading-relaxed text-fg-secondary">
              Score agrégé sur vos{' '}
              <strong className="text-fg">{total} audits</strong>.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <MetricCard label="Audits réalisés" value={total} />
            <MetricCard label="Biais détectés" value={data.failing_audits} />
            <MetricCard label="En vigilance" value={data.warning_audits} />
            <MetricCard label="Score de risque moyen" value={data.risk_score} />
          </div>
        </section>

        <section className="mb-4 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
          <div className="rounded-2xl border border-border-default bg-surface p-7">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h2 className="text-[18px] font-medium text-fg">Audits récents</h2>
                <span className="rounded-sm border border-border-subtle bg-surface-2 px-1.5 py-0.5 font-mono text-[11px] text-fg-muted">
                  {data.recent_audits.length}
                </span>
              </div>
              <Button asChild variant="ghost">
                <Link href="/app/audits">Historique complet →</Link>
              </Button>
            </div>
            <div className="flex flex-col gap-2">
              {data.recent_audits.length === 0 && (
                <p className="py-8 text-center text-sm text-fg-muted">
                  Aucun audit pour le moment.
                </p>
              )}
              {data.recent_audits.map((audit) => {
                const t = auditTone(audit.verdict);
                return (
                  <article
                    key={audit.id}
                    className="grid grid-cols-[minmax(0,1.5fr)_repeat(3,minmax(0,1fr))_auto] items-center gap-4 rounded-md border border-border-default bg-surface px-4 py-3.5 transition-colors hover:border-border-strong"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-fg">
                        {audit.title}
                      </div>
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
          </div>

          <div className="rounded-2xl border border-border-default bg-surface p-7">
            <div className="mb-4 flex items-center gap-3">
              <h2 className="text-[18px] font-medium text-fg">
                Répartition par module
              </h2>
            </div>
            <div className="flex flex-col gap-4">
              {moduleEntries.length === 0 && (
                <p className="text-sm text-fg-muted">Aucune donnée.</p>
              )}
              {moduleEntries.map(([mod, count]) => {
                const percent = Math.round(
                  (count / Math.max(total, 1)) * 100,
                );
                return (
                  <div key={mod}>
                    <div className="mb-1.5 flex items-baseline justify-between gap-3">
                      <span className="text-sm text-fg">{mod}</span>
                      <span className="font-mono text-xs tabular-nums text-fg-muted">
                        {count} · {percent}%
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
                      <div
                        className="h-full rounded-full bg-accent"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-6 rounded-md border border-status-info-border bg-status-info-bg p-4 text-xs leading-relaxed text-fg-secondary">
              <strong className="font-medium text-fg">
                Couche transversale.
              </strong>{' '}
              Chaque audit produit un rapport rattaché aux articles AI Act
              applicables. Les résultats sont une aide à l&apos;analyse —
              l&apos;appréciation réglementaire finale reste de votre
              responsabilité.
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
