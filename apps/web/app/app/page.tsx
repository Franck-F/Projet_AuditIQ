import Link from 'next/link';
import type { Metadata } from 'next';
import { AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { Topbar } from '@/components/app/Topbar';
import { Button } from '@/components/ui/button';
import { Gauge } from '@/components/product/Gauge';
import { MetricCard, MetricCardWithSparkline } from '@/components/product/MetricCard';
import { StatusBadge } from '@/components/product/StatusBadge';
import {
  MOCK_ALERTS,
  MOCK_GAUGE,
  MOCK_KPIS,
  MOCK_MODULE_USAGE,
  MOCK_RECENT_AUDITS,
  MOCK_USER,
} from '@/lib/mocks/dashboard';

export const metadata: Metadata = {
  title: "Vue d'ensemble",
};

const ALERT_ICONS = {
  fail: AlertTriangle,
  warn: AlertCircle,
  info: Info,
} as const;

const ALERT_STYLES = {
  fail: 'border-status-fail-border bg-status-fail-bg text-status-fail',
  warn: 'border-status-warn-border bg-status-warn-bg text-status-warn',
  info: 'border-status-info-border bg-status-info-bg text-status-info',
} as const;

export default function DashboardPage() {
  return (
    <>
      <Topbar crumbs={[{ label: "Vue d'ensemble" }]} />
      <main className="flex-1 px-8 py-8">
        {/* Page header */}
        <header className="mb-8 flex flex-wrap items-end justify-between gap-6">
          <div>
            <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-fg">
              Bonjour {MOCK_USER.firstName}
            </h1>
            <p className="mt-1.5 max-w-[60ch] text-sm text-fg-secondary">
              Dernière session il y a {MOCK_USER.lastSessionDays} jours · Vous avez{' '}
              <strong className="text-fg">{MOCK_USER.activeAudits} audits actifs</strong> et{' '}
              <strong className="text-fg">
                {MOCK_USER.pendingRecommendations} recommandations
              </strong>{' '}
              en attente de revue.
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

        {/* Top: gauge + KPIs */}
        <section className="mb-4 grid gap-4 lg:grid-cols-[360px_1fr]">
          {/* Risk gauge */}
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-border-default bg-surface p-8">
            <div className="flex w-full items-baseline justify-between">
              <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-fg-muted">
                Score de risque global
              </span>
              <StatusBadge tone="warn">Vigilance</StatusBadge>
            </div>
            <Gauge
              value={MOCK_GAUGE.value}
              label="Score de risque global"
              caption={MOCK_GAUGE.caption}
            />
            <div className="mt-3 flex flex-wrap gap-4 text-xs">
              <span className="flex items-center gap-1.5">
                <span aria-hidden className="size-2 rounded-full bg-status-pass" />
                <span className="text-fg-muted">0–30 Conforme</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span aria-hidden className="size-2 rounded-full bg-status-warn" />
                <span className="text-fg-muted">31–70 Vigilance</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span aria-hidden className="size-2 rounded-full bg-status-fail" />
                <span className="text-fg-muted">71–100 Critique</span>
              </span>
            </div>
            <p className="mt-2 max-w-[32ch] text-center text-sm leading-relaxed text-fg-secondary">
              Score agrégé sur vos <strong className="text-fg">{MOCK_GAUGE.total} audits actifs</strong>,
              pondéré par sensibilité du cas d&apos;usage.
            </p>
          </div>

          {/* KPI grid */}
          <div className="grid gap-3 sm:grid-cols-2">
            <MetricCardWithSparkline
              label={MOCK_KPIS.yearAudits.label}
              value={MOCK_KPIS.yearAudits.value}
              delta={MOCK_KPIS.yearAudits.delta}
              sparkline={{ values: MOCK_KPIS.yearAudits.sparkline, tone: 'accent', filled: true }}
            />
            <MetricCardWithSparkline
              label={MOCK_KPIS.biases.label}
              value={MOCK_KPIS.biases.value}
              delta={MOCK_KPIS.biases.delta}
              sparkline={{ values: MOCK_KPIS.biases.sparkline, tone: 'warn' }}
            />
            <MetricCard
              label={MOCK_KPIS.recos.label}
              value={MOCK_KPIS.recos.value}
              delta={MOCK_KPIS.recos.delta}
              visual={
                <div className="flex gap-1">
                  <span aria-hidden className="h-1.5 flex-[3] rounded-full bg-status-fail" />
                  <span aria-hidden className="h-1.5 flex-[5] rounded-full bg-status-warn" />
                </div>
              }
            />
            <MetricCard
              label={MOCK_KPIS.aiActCoverage.label}
              value={MOCK_KPIS.aiActCoverage.value}
              suffix="%"
              delta={MOCK_KPIS.aiActCoverage.delta}
              visual={
                <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
                  <div
                    className="h-full rounded-full bg-accent transition-[width] duration-700"
                    style={{ width: `${MOCK_KPIS.aiActCoverage.value}%` }}
                  />
                </div>
              }
            />
          </div>
        </section>

        {/* Alerts */}
        <section className="mb-4 rounded-2xl border border-border-default bg-surface p-7">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-[18px] font-medium text-fg">Alertes prioritaires</h2>
              <span className="rounded-sm border border-border-subtle bg-surface-2 px-1.5 py-0.5 font-mono text-[11px] text-fg-muted">
                {MOCK_ALERTS.length}
              </span>
            </div>
            <Button asChild variant="ghost">
              <Link href="/app/recommandations">Tout voir →</Link>
            </Button>
          </div>
          <div className="flex flex-col gap-2.5">
            {MOCK_ALERTS.map((alert) => {
              const Icon = ALERT_ICONS[alert.severity];
              return (
                <div
                  key={alert.id}
                  className={`flex items-start gap-3 rounded-md border p-4 text-sm leading-relaxed ${ALERT_STYLES[alert.severity]}`}
                >
                  <Icon size={18} strokeWidth={1.75} className="mt-0.5 shrink-0" aria-hidden />
                  <div className="flex-1">
                    <div className="mb-1 font-medium text-fg">{alert.title}</div>
                    <div className="text-fg-secondary">{alert.body}</div>
                  </div>
                  <Button asChild variant="secondary" size="sm" className="ml-3 shrink-0">
                    <Link href={alert.cta.href}>{alert.cta.label}</Link>
                  </Button>
                </div>
              );
            })}
          </div>
        </section>

        {/* Two cols: recent audits + module usage */}
        <section className="mb-4 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
          {/* Recent audits */}
          <div className="rounded-2xl border border-border-default bg-surface p-7">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h2 className="text-[18px] font-medium text-fg">Audits récents</h2>
                <span className="rounded-sm border border-border-subtle bg-surface-2 px-1.5 py-0.5 font-mono text-[11px] text-fg-muted">
                  {MOCK_RECENT_AUDITS.length}
                </span>
              </div>
              <Button asChild variant="ghost">
                <Link href="/app/audits">Historique complet →</Link>
              </Button>
            </div>
            <div className="flex flex-col gap-2">
              {MOCK_RECENT_AUDITS.map((audit) => (
                <article
                  key={audit.id}
                  className="grid grid-cols-[minmax(0,1.5fr)_repeat(3,minmax(0,1fr))_auto] items-center gap-4 rounded-md border border-border-default bg-surface px-4 py-3.5 transition-colors hover:border-border-strong"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-fg">{audit.title}</div>
                    <div className="mt-0.5 truncate font-mono text-xs text-fg-muted">
                      {audit.subtitle}
                    </div>
                  </div>
                  <StatusBadge tone={audit.status}>{audit.statusLabel}</StatusBadge>
                  <span className="font-mono text-xs tabular-nums text-fg-muted">
                    {audit.metaWhen}
                  </span>
                  <span className="font-mono text-xs tabular-nums text-fg-muted">
                    {audit.metaMetric}
                  </span>
                  <Button asChild variant="secondary" size="sm">
                    <Link href={audit.href}>Ouvrir</Link>
                  </Button>
                </article>
              ))}
            </div>
          </div>

          {/* Module usage */}
          <div className="rounded-2xl border border-border-default bg-surface p-7">
            <div className="mb-4 flex items-center gap-3">
              <h2 className="text-[18px] font-medium text-fg">Répartition par module</h2>
            </div>
            <div className="flex flex-col gap-4">
              {MOCK_MODULE_USAGE.map((m) => (
                <div key={m.module}>
                  <div className="mb-1.5 flex items-baseline justify-between gap-3">
                    <span className="text-sm text-fg">{m.module}</span>
                    <span className="font-mono text-xs tabular-nums text-fg-muted">
                      {m.count} · {m.percent}%
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
                    <div
                      className="h-full rounded-full bg-accent"
                      style={{ width: `${m.percent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 rounded-md border border-status-info-border bg-status-info-bg p-4 text-xs leading-relaxed text-fg-secondary">
              <strong className="font-medium text-fg">Couche transversale.</strong> Chaque audit
              produit un rapport rattaché aux articles AI Act applicables. Les résultats sont une
              aide à l&apos;analyse — l&apos;appréciation réglementaire finale reste de votre
              responsabilité.
            </div>
          </div>
        </section>

        {/* Empty / next steps */}
        <section className="rounded-2xl border border-border-default bg-surface p-7">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-accent">
                Prochaine étape suggérée
              </span>
              <h3 className="mt-2 text-h4 font-medium text-fg">
                Lancez un audit M3 sur votre chatbot SAV.
              </h3>
              <p className="mt-1 max-w-[60ch] text-sm text-fg-secondary">
                Vous avez 480 prompts pairs disponibles dans la banque française. Durée estimée :
                90 minutes.
              </p>
            </div>
            <div className="flex gap-2.5">
              <Button asChild variant="secondary">
                <Link href="/app/audits/nouveau?module=M3">Configurer</Link>
              </Button>
              <Button asChild variant="primary">
                <Link href="/app/audits/nouveau">+ Nouvel audit</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
