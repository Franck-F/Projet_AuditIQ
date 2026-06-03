'use client';

import Link from 'next/link';
import { AlertTriangle, Info, CircleAlert, Zap } from 'lucide-react';

import { Topbar } from '@/components/app/Topbar';
import { Gauge } from '@/components/product/Gauge';
import { MetricCard, MetricCardWithSparkline } from '@/components/product/MetricCard';
import { StatusBadge, type StatusTone } from '@/components/product/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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

function auditTone(
  verdict: RecentAudit['verdict'],
): { tone: StatusTone; label: string } {
  return verdict
    ? VERDICT_TONE[verdict]
    : { tone: 'info', label: 'En cours' };
}

// Synthetic monthly trend data for sparkline
const SPARK_AUDITS = [4, 6, 5, 8, 7, 9, 10, 8, 11, 10, 11, 12];
const SPARK_BIAIS = [9, 8, 10, 8, 9, 7, 8, 7, 7, 6, 7, 7];

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

  const riskScore = Math.round(data.risk_score);
  const activeAudits = data.total_audits;
  const failingAudits = data.failing_audits;
  const warningAudits = data.warning_audits ?? 0;
  // derive alert count from failing + warning
  const alertCount = failingAudits + warningAudits;

  // Risk band label
  const riskCaption =
    riskScore <= 30 ? '/100 · conforme' :
    riskScore <= 70 ? '/100 · risque modéré' :
    '/100 · critique';

  return (
    <>
      <Topbar
        crumbs={[{ label: "Vue d'ensemble" }]}
        actions={
          <Button asChild variant="primary">
            <Link href="/app/audits/nouveau">+ Lancer un audit</Link>
          </Button>
        }
      />
      <main className="flex-1 px-8 py-8">

        {/* Page header / hero */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[22px] font-semibold tracking-[-0.01em] text-fg">
              Bonjour
            </h1>
            <p className="mt-1 text-[13px] leading-relaxed text-fg-secondary max-w-[560px]">
              Dernière session récente ·{' '}
              <strong className="font-medium text-fg">{activeAudits} audits actifs</strong>{' '}
              et{' '}
              <strong className="font-medium text-fg">
                {alertCount} recommandations
              </strong>{' '}
              en attente de revue.
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/app/historique">Historique</Link>
          </Button>
        </div>

        {/* Top: risk gauge + 4 KPI cards */}
        <div
          className="mb-4 grid gap-4"
          style={{ gridTemplateColumns: '360px 1fr' }}
        >
          {/* Risk gauge card */}
          <Card className="flex flex-col items-center gap-2 p-5">
            <div className="flex w-full items-baseline justify-between">
              <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-fg-muted">
                Score de risque global
              </span>
              {riskScore <= 30 ? (
                <StatusBadge tone="pass">Conforme</StatusBadge>
              ) : riskScore <= 70 ? (
                <StatusBadge tone="warn">Vigilance</StatusBadge>
              ) : (
                <StatusBadge tone="fail">Critique</StatusBadge>
              )}
            </div>

            <Gauge
              value={riskScore}
              label="Score de risque global"
              caption={riskCaption}
              className="mt-2"
            />

            {/* Legend */}
            <div className="mt-3 flex gap-4 text-[12px]">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[var(--status-pass)]" />
                <span className="text-fg-muted">0–30 Conforme</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[var(--status-warn)]" />
                <span className="text-fg-muted">31–70 Vigilance</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[var(--status-fail)]" />
                <span className="text-fg-muted">71–100 Critique</span>
              </span>
            </div>

            <p className="mt-2 max-w-[32ch] text-center text-[12px] leading-relaxed text-fg-secondary">
              Score agrégé sur vos{' '}
              <strong className="font-medium text-fg">{activeAudits} audits actifs</strong>
              , pondéré par sensibilité du cas d&apos;usage.
            </p>
          </Card>

          {/* 4-KPI grid */}
          <div className="grid grid-cols-2 gap-3">
            <MetricCardWithSparkline
              label="Audits cette année"
              value={activeAudits}
              delta={{ direction: 'up', text: '4 vs trimestre dernier' }}
              sparkline={{ values: SPARK_AUDITS, tone: 'accent', filled: true }}
            />
            <MetricCardWithSparkline
              label="Biais détectés (90j)"
              value={failingAudits + warningAudits}
              delta={{ direction: 'down', text: '2 vs précédent' }}
              sparkline={{ values: SPARK_BIAIS, tone: 'warn' }}
            />
            <MetricCard
              label="Recommandations ouvertes"
              value={alertCount}
              delta={{ direction: 'neutral', text: `${failingAudits} prioritaires · ${warningAudits} normales` }}
              visual={
                <div className="flex gap-1">
                  <span
                    className="h-1.5 rounded-sm bg-[var(--status-fail)]"
                    style={{ flex: failingAudits || 1 }}
                  />
                  <span
                    className="h-1.5 rounded-sm bg-[var(--status-warn)]"
                    style={{ flex: warningAudits || 1 }}
                  />
                </div>
              }
            />
            <MetricCard
              label="Couverture AI Act"
              value={76}
              suffix="%"
              delta={{ direction: 'up', text: '12 pts en 30 jours' }}
              visual={
                <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
                  <div
                    className="h-full rounded-full bg-[var(--status-pass)]"
                    style={{ width: '76%' }}
                  />
                </div>
              }
            />
          </div>
        </div>

        {/* Alertes prioritaires */}
        {alertCount > 0 && (
          <Card className="mb-4 p-5">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-[15px] font-medium text-fg">Alertes prioritaires</h2>
                <span className="rounded-full border border-border-subtle bg-surface-2 px-2 py-0.5 font-mono text-[11px] text-fg-muted">
                  {alertCount}
                </span>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link href="/app/recommandations">Tout voir →</Link>
              </Button>
            </div>

            <div className="flex flex-col gap-2.5">
              {/* Critical alert */}
              {failingAudits > 0 && (
                <div className="flex items-start gap-3 rounded-lg border border-[var(--status-fail)]/30 bg-[var(--status-fail)]/5 px-4 py-3">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--status-fail)]" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium text-fg">
                      {failingAudits} audit{failingAudits > 1 ? 's' : ''} en niveau critique
                    </div>
                    <div className="mt-0.5 text-[12px] text-fg-secondary">
                      Des métriques fairness dépassent les seuils réglementaires AI Act. Action requise avant déploiement.
                    </div>
                  </div>
                  <Button asChild variant="outline" size="sm">
                    <Link href="/app/audits">Examiner</Link>
                  </Button>
                </div>
              )}

              {/* Warning alert */}
              {warningAudits > 0 && (
                <div className="flex items-start gap-3 rounded-lg border border-[var(--status-warn)]/30 bg-[var(--status-warn)]/5 px-4 py-3">
                  <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-[var(--status-warn)]" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium text-fg">
                      {warningAudits} audit{warningAudits > 1 ? 's' : ''} en vigilance
                    </div>
                    <div className="mt-0.5 text-[12px] text-fg-secondary">
                      Des indicateurs déviants ont été détectés. Revue recommandée.
                    </div>
                  </div>
                  <Button asChild variant="outline" size="sm">
                    <Link href="/app/audits">Examiner</Link>
                  </Button>
                </div>
              )}

              {/* AI Act info */}
              <div className="flex items-start gap-3 rounded-lg border border-[var(--status-info)]/30 bg-[var(--status-info)]/5 px-4 py-3">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-[var(--status-info)]" />
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium text-fg">
                    AI Act — l&apos;article 10 (qualité des données d&apos;entraînement) entre en vigueur le 02/08/2026.
                  </div>
                  <div className="mt-0.5 text-[12px] text-fg-secondary">
                    Vos audits supervisés couvrent 76% des exigences. Téléchargez le guide de mise en conformité.
                  </div>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link href="/app/conformite">Lire le guide</Link>
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Two-col: Audits récents + Lancer un audit */}
        <div
          className="mb-4 grid gap-4"
          style={{ gridTemplateColumns: '1.6fr 1fr' }}
        >
          {/* Audits récents */}
          <Card className="p-5">
            <div className="mb-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-[15px] font-medium text-fg">Audits récents</h2>
                <span className="rounded-full border border-border-subtle bg-surface-2 px-2 py-0.5 font-mono text-[11px] text-fg-muted">
                  {data.recent_audits.length}
                </span>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link href="/app/historique">Historique complet →</Link>
              </Button>
            </div>

            <div className="flex flex-col divide-y divide-border-default">
              {data.recent_audits.length === 0 ? (
                <p className="py-6 text-center text-[13px] text-fg-muted">
                  Aucun audit pour le moment.
                </p>
              ) : (
                data.recent_audits.slice(0, 5).map((audit) => {
                  const t = auditTone(audit.verdict);
                  return (
                    <div
                      key={audit.id}
                      className="flex items-center gap-3 py-3"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-medium text-fg truncate">
                          {audit.title}
                        </div>
                        <div className="mt-0.5 font-mono text-[11px] text-fg-muted truncate">
                          {audit.code ?? audit.id} · {audit.module}
                        </div>
                      </div>
                      <StatusBadge tone={t.tone}>{t.label}</StatusBadge>
                      {audit.risk_score != null && (
                        <span className="font-mono text-[12px] text-fg-muted tabular-nums">
                          {audit.risk_score}
                        </span>
                      )}
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/app/audits/${audit.id}`}>Ouvrir</Link>
                      </Button>
                    </div>
                  );
                })
              )}
            </div>
          </Card>

          {/* Lancer un audit */}
          <Card className="p-5">
            <h2 className="mb-3.5 text-[15px] font-medium text-fg">Lancer un audit</h2>
            <div className="flex flex-col gap-2.5">
              {[
                {
                  code: 'M1',
                  label: 'Audit supervisé',
                  desc: 'Dataset étiqueté · 4 métriques fairness',
                  href: '/app/audits/nouveau?module=M1',
                },
                {
                  code: 'M2',
                  label: 'Audit non supervisé',
                  desc: 'Clustering · détection de proxies',
                  href: '/app/audits/nouveau?module=M2',
                },
                {
                  code: 'M3',
                  label: 'Audit LLM / chatbot',
                  desc: 'Prompts pairs · 6 axes sensibles',
                  href: '/app/audits/nouveau?module=M3',
                },
              ].map(({ code, label, desc, href }) => (
                <Link
                  key={code}
                  href={href}
                  className="flex items-center gap-3 rounded-lg border border-border-default bg-surface p-4 transition-colors hover:bg-surface-2"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[var(--accent-border)] bg-[var(--accent-soft)] font-mono text-[13px] font-semibold text-[var(--accent)]">
                    {code}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium text-fg">{label}</div>
                    <div className="mt-0.5 text-[11px] text-fg-muted">{desc}</div>
                  </div>
                  <span className="text-fg-muted">→</span>
                </Link>
              ))}
            </div>
          </Card>
        </div>

        {/* Action band */}
        <Card className="flex items-center gap-5 p-6 bg-gradient-to-r from-accent/10 via-accent/5 to-transparent">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-accent/30 bg-accent/20">
            <Zap className="h-5 w-5 text-accent" />
          </div>
          <div className="flex-1">
            <h3 className="text-[15px] font-medium text-fg">
              Lancez un audit en moins de 7 minutes
            </h3>
            <p className="mt-1 text-[13px] text-fg-secondary">
              Importez votre jeu de données, sélectionnez les attributs protégés,
              AuditIQ calcule l&apos;ensemble des métriques réglementaires.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button asChild variant="outline">
              <Link href="/app/historique">Historique</Link>
            </Button>
            <Button asChild variant="primary">
              <Link href="/app/audits/nouveau">+ Lancer un audit</Link>
            </Button>
          </div>
        </Card>

      </main>
    </>
  );
}
