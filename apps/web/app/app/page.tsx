'use client';

import Link from 'next/link';
import { Zap, Plus } from 'lucide-react';

import { Topbar } from '@/components/app/Topbar';
import { StatusBadge } from '@/components/product/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Meter } from '@/components/product/Meter';
import type { RecentAudit } from '@/lib/api/dashboard';
import { useDashboard } from '@/lib/query/use-dashboard';
import { riskTone, VERDICT_LABELS } from '@/lib/verdict';

/* ─── Metric card ────────────────────────────────────────────────────────── */
type StatusTone = 'pass' | 'warn' | 'fail' | 'neutral';
const STATUS_COLORS: Record<StatusTone, string> = {
  pass: 'var(--status-pass)',
  warn: 'var(--status-warn)',
  fail: 'var(--status-fail)',
  neutral: 'var(--fg-disabled)',
};

function MetricCard({
  label,
  value,
  unit,
  delta,
  deltaUp,
  hint,
  tone,
}: {
  label: string;
  value: string | number;
  unit?: string;
  delta?: string;
  deltaUp?: boolean;
  hint?: string;
  tone?: StatusTone;
}) {
  const c = tone ? STATUS_COLORS[tone] : 'var(--fg)';
  const dc =
    deltaUp === true
      ? 'var(--status-pass)'
      : deltaUp === false
        ? 'var(--status-fail)'
        : 'var(--fg-muted)';
  return (
    <Card>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 14,
        }}
      >
        <span
          className="eyebrow"
          style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em' }}
        >
          {label}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
        <span
          className="tnum"
          style={{
            fontSize: 30,
            fontWeight: 600,
            letterSpacing: '-0.03em',
            color: c,
          }}
        >
          {value}
        </span>
        {unit && (
          <span
            className="mono"
            style={{ fontSize: 14, color: 'var(--fg-muted)' }}
          >
            {unit}
          </span>
        )}
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginTop: 10,
        }}
      >
        {delta && (
          <span
            className="mono tnum"
            style={{ fontSize: 12, color: dc }}
          >
            {delta}
          </span>
        )}
        {hint && (
          <span style={{ fontSize: 12.5, color: 'var(--fg-muted)' }}>
            {hint}
          </span>
        )}
      </div>
    </Card>
  );
}

/* ─── Recent audit row ───────────────────────────────────────────────────── */
function AuditRow({ audit }: { audit: RecentAudit }) {
  const tone =
    audit.verdict === 'fail'
      ? 'fail'
      : audit.verdict === 'warn'
        ? 'warn'
        : audit.verdict === 'pass'
          ? 'pass'
          : ('neutral' as const);
  const scoreColor =
    tone === 'fail'
      ? 'var(--status-fail)'
      : tone === 'warn'
        ? 'var(--status-warn)'
        : tone === 'pass'
          ? 'var(--status-pass)'
          : 'var(--fg-muted)';
  return (
    <tr className="tbl-row" style={{ cursor: 'pointer' }}>
      <td style={{ padding: '12px 18px' }}>
        <Link
          href={`/app/audits/${audit.id}`}
          style={{ display: 'block', textDecoration: 'none' }}
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
      <td style={{ padding: '12px 18px' }}>
        <span className="chip">{audit.module}</span>
      </td>
      <td
        className="tbl-num"
        style={{ padding: '12px 18px', fontWeight: 600, color: scoreColor }}
      >
        {audit.risk_score ?? '—'}
      </td>
      <td style={{ padding: '12px 18px' }}>
        <StatusBadge tone={tone} />
      </td>
      <td style={{ padding: '12px 18px', textAlign: 'right' }}>
        <span style={{ color: 'var(--fg-disabled)', fontSize: 16 }}>›</span>
      </td>
    </tr>
  );
}

/* ─── Main page ───────────────────────────────────────────────────────────── */
export default function DashboardPage() {
  const { data, isLoading, isError } = useDashboard();

  if (isLoading) {
    return (
      <main role="status" className="page flex-1 text-fg-secondary">
        Chargement du tableau de bord…
      </main>
    );
  }
  if (isError || !data) {
    return (
      <main className="page flex-1 text-status-fail">
        Impossible de charger le tableau de bord.
      </main>
    );
  }

  const riskScore = Math.round(data.risk_score);
  const activeAudits = data.total_audits;
  const failingAudits = data.failing_audits;
  const warningAudits = data.warning_audits ?? 0;
  const alertCount = failingAudits + warningAudits;

  const passingAudits = activeAudits - failingAudits - warningAudits;
  const passCount = Math.max(0, passingAudits);
  const passPct = activeAudits > 0 ? Math.round((passCount / activeAudits) * 100) : 0;
  const warnPct = activeAudits > 0 ? Math.round((warningAudits / activeAudits) * 100) : 0;
  const failPct = activeAudits > 0 ? Math.round((failingAudits / activeAudits) * 100) : 0;

  // Score de RISQUE 0–100 (plus bas = mieux) — seuils alignés sur la jauge.
  const riskScoreTone: StatusTone = riskTone(riskScore);

  return (
    <>
      <Topbar
        title="Vue d'ensemble"
        crumbs={[{ label: 'AuditIQ' }, { label: "Vue d'ensemble" }]}
        actions={
          <Button asChild variant="primary">
            <Link href="/app/audits/nouveau">
              <Plus size={16} />
              Nouvel audit
            </Link>
          </Button>
        }
      />
      <main className="page flex-1">
        {/* Greeting */}
        <div style={{ marginBottom: 22 }}>
          <h1
            className="greeting"
            style={{
              fontSize: 15,
              color: 'var(--fg-muted)',
              maxWidth: 620,
              fontWeight: 400,
            }}
          >
            Bonjour.{' '}
            Voici l'état des risques de{' '}
            <em style={{ color: 'var(--fg-secondary)', fontStyle: 'normal' }}>
              fairness
            </em>{' '}
            de vos modèles.{' '}
            {alertCount > 0 && (
              <strong
                style={{ color: 'var(--status-warn)', fontWeight: 500 }}
              >
                {alertCount} audit{alertCount > 1 ? 's' : ''}
              </strong>
            )}
            {alertCount > 0 &&
              (alertCount > 1
                ? ' requièrent votre attention.'
                : ' requiert votre attention.')}
          </h1>
        </div>

        {/* Metric cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 16,
            marginBottom: 16,
          }}
        >
          <MetricCard
            label="Score de risque moyen"
            value={activeAudits > 0 ? riskScore : '—'}
            unit={activeAudits > 0 ? '/100' : undefined}
            hint="plus bas = mieux"
            tone={activeAudits > 0 ? riskScoreTone : undefined}
          />
          <MetricCard
            label="Audits actifs"
            value={activeAudits}
          />
          <MetricCard
            label="Audits à risque élevé"
            value={failingAudits}
            tone={failingAudits > 0 ? 'fail' : 'pass'}
          />
        </div>

        {/* 1.55fr / 1fr grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1.55fr 1fr',
            gap: 16,
            marginBottom: 16,
          }}
        >
          {/* Recent audits */}
          <Card style={{ padding: 0 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 18px 14px',
              }}
            >
              <div>
                <div
                  className="eyebrow"
                  style={{ marginBottom: 5, fontSize: 11, letterSpacing: '0.1em' }}
                >
                  Activité récente
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 500 }}>
                  Derniers audits exécutés
                </h3>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link href="/app/audits">
                  Tout voir →
                </Link>
              </Button>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr
                  style={{
                    borderTop: '1px solid var(--border-subtle)',
                    borderBottom: '1px solid var(--border-subtle)',
                  }}
                >
                  {['Audit', 'Module', 'Score de risque', 'Statut', ''].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: '9px 18px',
                        textAlign: 'left',
                        fontSize: 11,
                        fontWeight: 600,
                        color: 'var(--fg-muted)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.recent_audits.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      style={{
                        padding: '24px 18px',
                        textAlign: 'center',
                        color: 'var(--fg-muted)',
                        fontSize: 13,
                      }}
                    >
                      Aucun audit pour le moment.
                    </td>
                  </tr>
                ) : (
                  data.recent_audits.slice(0, 5).map((audit) => (
                    <AuditRow key={audit.id} audit={audit} />
                  ))
                )}
              </tbody>
            </table>
          </Card>

          {/* Right column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Répartition des statuts */}
            <Card>
              <div
                className="eyebrow"
                style={{ marginBottom: 12, fontSize: 11, letterSpacing: '0.1em' }}
              >
                Répartition des statuts
              </div>
              {(
                [
                  ['pass', VERDICT_LABELS.pass, passCount, passPct],
                  ['warn', VERDICT_LABELS.warn, warningAudits, warnPct],
                  ['fail', VERDICT_LABELS.fail, failingAudits, failPct],
                ] as Array<[StatusTone, string, number, number]>
              ).map(([tone, label, n, pct]) => (
                <div key={tone} style={{ marginBottom: 12 }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: 13,
                      marginBottom: 6,
                    }}
                  >
                    <span
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 7,
                      }}
                    >
                      <span
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius: 99,
                          background: STATUS_COLORS[tone],
                          flexShrink: 0,
                        }}
                      />
                      {label}
                    </span>
                    <span
                      className="mono tnum"
                      style={{ color: 'var(--fg-muted)' }}
                    >
                      {n} · {pct}%
                    </span>
                  </div>
                  <div
                    style={{
                      height: 6,
                      background: 'var(--surface-3)',
                      borderRadius: 99,
                    }}
                  >
                    <div
                      style={{
                        width: `${pct}%`,
                        height: '100%',
                        background: STATUS_COLORS[tone],
                        borderRadius: 99,
                        transition: 'width 0.8s ease-out',
                      }}
                    />
                  </div>
                </div>
              ))}
            </Card>
          </div>
        </div>

        {/* Action band */}
        <Card
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 18,
            background:
              'linear-gradient(100deg, var(--accent-softer, var(--surface-2)), transparent 60%)',
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 11,
              display: 'grid',
              placeItems: 'center',
              background: 'var(--accent-soft, var(--surface-3))',
              border: '1px solid var(--accent-border, var(--border-default))',
              flexShrink: 0,
            }}
          >
            <Zap size={20} style={{ color: 'var(--accent)' }} />
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: 15, fontWeight: 500 }}>
              Lancez un audit en ~5 minutes
            </h3>
            <p
              style={{
                color: 'var(--fg-muted)',
                fontSize: 13.5,
                marginTop: 3,
              }}
            >
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
