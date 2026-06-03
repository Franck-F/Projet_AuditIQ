'use client';

import Link from 'next/link';
import { Zap } from 'lucide-react';

import { Topbar } from '@/components/app/Topbar';
import { MetricCard } from '@/components/product/MetricCard';
import { Sparkline } from '@/components/product/Sparkline';
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

function getScoreTone(score: number): StatusTone {
  if (score > 70) return 'pass';
  if (score >= 30) return 'warn';
  return 'fail';
}

function auditTone(
  verdict: RecentAudit['verdict'],
): { tone: StatusTone; label: string } {
  return verdict
    ? VERDICT_TONE[verdict]
    : { tone: 'info', label: 'En cours' };
}

// Synthetic monthly trend data for sparkline
const SPARK_DATA = [62, 64, 61, 66, 70, 68, 73, 71, 76, 78, 81, 84];

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
  const conformityScore = Math.round(data.risk_score);
  const scoreTone = getScoreTone(conformityScore);

  // Count recent audits by verdict
  const recentByVerdict = {
    pass: data.recent_audits.filter((a) => a.verdict === 'pass').length,
    warn: data.recent_audits.filter((a) => a.verdict === 'warn').length,
    fail: data.recent_audits.filter((a) => a.verdict === 'fail').length,
  };

  return (
    <>
      <Topbar
        crumbs={[{ label: "Vue d'ensemble" }]}
        actions={
          <Button asChild variant="primary">
            <Link href="/app/audits/nouveau">Nouvel audit</Link>
          </Button>
        }
      />
      <main className="flex-1 px-8 py-8">
        {/* Hero paragraph */}
        <div className="mb-[22px]">
          <p className="max-w-[620px] text-sm text-fg-secondary">
            Bonjour. Voici l&apos;état de conformité{' '}
            <em className="font-normal text-fg-secondary">fairness</em> de vos
            modèles en production.
          </p>
        </div>

        {/* 4-column metric cards */}
        <div className="mb-4 grid gap-4 grid-cols-4">
          <MetricCard
            label="Score conformité"
            value={conformityScore}
            suffix="/100"
          />
          <MetricCard label="Audits actifs" value={total} />
          <MetricCard
            label="Modèles non conformes"
            value={data.failing_audits}
          />
          <MetricCard label="Délai moyen d'audit" value="—" suffix="min" />
        </div>

        {/* 1.55fr / 1fr grid */}
        <div className="mb-4 grid gap-4" style={{ gridTemplateColumns: '1.55fr 1fr' }}>
          {/* Left: Recent audits table */}
          <Card className="flex flex-col p-0">
            <div className="border-b border-border-default px-6 py-4">
              <div className="font-mono text-xs uppercase tracking-widest text-fg-muted mb-1">
                Activité récente
              </div>
              <h2 className="text-base font-medium text-fg">
                Derniers audits exécutés
              </h2>
            </div>
            <div className="flex-1 overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-default">
                    <th className="px-6 py-3 text-left font-semibold text-fg-muted text-xs">
                      Audit
                    </th>
                    <th className="px-6 py-3 text-left font-semibold text-fg-muted text-xs">
                      Attribut
                    </th>
                    <th className="px-6 py-3 text-left font-semibold text-fg-muted text-xs">
                      Score
                    </th>
                    <th className="px-6 py-3 text-left font-semibold text-fg-muted text-xs">
                      Statut
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.recent_audits.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-fg-muted">
                        Aucun audit pour le moment.
                      </td>
                    </tr>
                  ) : (
                    data.recent_audits.slice(0, 5).map((audit) => {
                      const t = auditTone(audit.verdict);
                      return (
                        <tr
                          key={audit.id}
                          className="border-b border-border-default hover:bg-surface-2 transition-colors cursor-pointer"
                        >
                          <td className="px-6 py-3">
                            <div className="font-medium text-fg">
                              {audit.title}
                            </div>
                            <div className="text-xs text-fg-muted font-mono">
                              {audit.code ?? audit.id} · {audit.module}
                            </div>
                          </td>
                          <td className="px-6 py-3">
                            <span className="inline-block rounded-sm border border-border-subtle bg-surface-2 px-2 py-1 text-xs font-medium">
                              {audit.module}
                            </span>
                          </td>
                          <td className="px-6 py-3 font-mono font-semibold tabular-nums text-fg">
                            {audit.risk_score ?? '—'}
                          </td>
                          <td className="px-6 py-3">
                            <StatusBadge tone={t.tone} noDot>
                              {t.label}
                            </StatusBadge>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Right column: Trend + Distribution */}
          <div className="flex flex-col gap-4">
            {/* Trend card */}
            <Card className="p-6">
              <div className="font-mono text-xs uppercase tracking-widest text-fg-muted mb-1">
                Tendance
              </div>
              <h3 className="text-base font-medium text-fg mb-4">
                Conformité globale
              </h3>
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-[34px] font-semibold leading-none tracking-tight tabular-nums text-fg">
                    {conformityScore}
                    <span className="ml-1 text-base text-fg-muted">%</span>
                  </div>
                  <div className="mt-2 text-xs text-fg-muted font-mono">
                    ↑ 6 pts / 90 j
                  </div>
                </div>
                <div className="w-[130px] h-11">
                  <Sparkline
                    values={SPARK_DATA}
                    tone="accent"
                    label="Évolution conformité"
                  />
                </div>
              </div>
            </Card>

            {/* Distribution card */}
            <Card className="p-6">
              <div className="font-mono text-xs uppercase tracking-widest text-fg-muted mb-3">
                Répartition des statuts
              </div>
              <div className="space-y-3">
                {[
                  {
                    key: 'pass',
                    label: 'Conformes',
                    count: recentByVerdict.pass,
                    tone: 'pass' as const,
                  },
                  {
                    key: 'warn',
                    label: 'Sous vigilance',
                    count: recentByVerdict.warn,
                    tone: 'warn' as const,
                  },
                  {
                    key: 'fail',
                    label: 'Non conformes',
                    count: recentByVerdict.fail,
                    tone: 'fail' as const,
                  },
                ].map(({ key, label, count, tone }) => {
                  const total = data.recent_audits.length || 1;
                  const percent = Math.round((count / total) * 100);
                  return (
                    <div key={key}>
                      <div className="flex justify-between items-center mb-1.5 text-xs">
                        <span className="flex items-center gap-2 text-fg">
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{
                              backgroundColor:
                                tone === 'pass'
                                  ? 'var(--status-pass)'
                                  : tone === 'warn'
                                    ? 'var(--status-warn)'
                                    : 'var(--status-fail)',
                            }}
                          />
                          {label}
                        </span>
                        <span className="text-fg-muted font-mono">
                          {count} · {percent}%
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-surface-3 overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${percent}%`,
                            backgroundColor:
                              tone === 'pass'
                                ? 'var(--status-pass)'
                                : tone === 'warn'
                                  ? 'var(--status-warn)'
                                  : 'var(--status-fail)',
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        </div>

        {/* Action band */}
        <Card className="flex items-center gap-5 p-6 bg-gradient-to-r from-accent/10 via-accent/5 to-transparent">
          <div className="flex-shrink-0 w-11 h-11 rounded-lg bg-accent/20 border border-accent/30 flex items-center justify-center">
            <Zap className="w-5 h-5 text-accent" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-medium text-fg">
              Lancez un audit en moins de 7 minutes
            </h3>
            <p className="text-sm text-fg-secondary mt-1">
              Importez votre jeu de données, sélectionnez les attributs
              protégés, AuditIQ calcule l&apos;ensemble des métriques
              réglementaires.
            </p>
          </div>
          <Button asChild variant="primary">
            <Link href="/app/audits/nouveau">Commencer</Link>
          </Button>
        </Card>
      </main>
    </>
  );
}
