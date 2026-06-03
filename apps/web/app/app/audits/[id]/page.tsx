'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

import { Topbar } from '@/components/app/Topbar';
import { Gauge } from '@/components/product/Gauge';
import { Stoplight } from '@/components/product/Stoplight';
import { StatusBadge, type StatusTone } from '@/components/product/StatusBadge';
import { Meter } from '@/components/product/Meter';
import { Tabs } from '@/components/product/Tabs';
import { InlineNote } from '@/components/product/InlineNote';
import { RatioBar } from '@/components/product/RatioBar';
import { ClusterMap } from '@/components/product/ClusterMap';
import { HeatMap6Axes } from '@/components/product/HeatMap6Axes';
import { DiffViewer } from '@/components/product/DiffViewer';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/ui/icons';
import {
  downloadReport,
  type M1MetricsOut,
  type M2MetricsOut,
  type M3MetricsOut,
  type ReportFormat,
  type GroupStatOut,
} from '@/lib/api/audits';
import { useAudit } from '@/lib/query/use-audit';
import { Scale } from 'lucide-react';

/* simple relative time — no external dep */
function relativeTime(iso: string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "à l'instant";
    if (mins < 60) return `il y a ${mins} min`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `il y a ${hrs} h`;
    const days = Math.floor(hrs / 24);
    return `il y a ${days} j`;
  } catch {
    return iso;
  }
}

/* ─── Verdict helpers ──────────────────────────────────────────────────── */

type Verdict = 'pass' | 'warn' | 'fail';

const VERDICT_LABELS: Record<Verdict, string> = {
  fail: 'Non conforme',
  warn: 'Vigilance',
  pass: 'Conforme',
};

const VERDICT_TONE: Record<Verdict, StatusTone> = {
  fail: 'fail',
  warn: 'warn',
  pass: 'pass',
};

const RISK_LABELS: Record<Verdict, string> = {
  fail: 'Élevé · action requise',
  warn: 'Modéré · vigilance',
  pass: 'Faible · conforme',
};

/* ─── Download action ──────────────────────────────────────────────────── */

function DownloadButton({ auditId }: { auditId: string }) {
  const [busy, setBusy] = React.useState<ReportFormat | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const onDownload = async (fmt: ReportFormat) => {
    setError(null);
    setBusy(fmt);
    try {
      await downloadReport(auditId, fmt);
    } catch {
      setError(
        fmt === 'pdf'
          ? 'Le rapport PDF est momentanément indisponible. Le rapport Excel reste disponible.'
          : 'Le téléchargement du rapport a échoué.',
      );
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          disabled={busy !== null}
          onClick={() => onDownload('xlsx')}
        >
          {busy === 'xlsx' ? 'Export…' : 'Rapport Excel'}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={busy !== null}
          onClick={() => onDownload('pdf')}
        >
          {busy === 'pdf' ? 'Export…' : 'Rapport PDF'}
        </Button>
      </div>
      {error && (
        <p role="alert" className="max-w-[36ch] text-right text-xs text-status-fail">
          {error}
        </p>
      )}
    </div>
  );
}

/* ─── Metric descriptor (for M1 display) ──────────────────────────────── */

interface MetricDesc {
  name: string;
  value: number;
  threshold: number;
  max: number;
  status: Verdict;
  plain: string;
  fmt: (v: number) => string;
}

function buildM1Metrics(m: M1MetricsOut): MetricDesc[] {
  const pct = (v: number) => `${(v * 100).toFixed(0)} %`;
  const num2 = (v: number) => v.toFixed(2);

  const di = m.disparate_impact;
  const dp = m.demographic_parity_diff;
  const eo = m.equal_opportunity_diff;
  const eodds = m.equalized_odds_diff;

  const diStatus: Verdict = di >= 0.8 ? 'pass' : di >= 0.65 ? 'warn' : 'fail';
  const dpStatus: Verdict =
    (m.demographic_parity_verdict as Verdict | undefined | null) ??
    (dp <= 0.1 ? 'pass' : dp <= 0.2 ? 'warn' : 'fail');

  const metrics: MetricDesc[] = [
    {
      name: 'Règle des 4/5 (80 %)',
      value: di,
      threshold: 0.8,
      max: 1,
      status: diStatus,
      fmt: pct,
      plain:
        di < 0.8
          ? `Le groupe défavorisé est retenu ${pct(di)} aussi souvent que le groupe de référence — en dessous du seuil légal de 80 %.`
          : `Le ratio d'acceptation entre groupes respecte le seuil légal de 80 %.`,
    },
    {
      name: 'Parité démographique',
      value: dp,
      threshold: 0.1,
      max: 0.4,
      status: dpStatus,
      fmt: num2,
      plain:
        dp > 0.1
          ? `Écart de ${num2(dp)} points entre les taux d'acceptation — au-delà de la tolérance de 10 points.`
          : `L'écart entre taux d'acceptation reste dans la tolérance de 10 points.`,
    },
  ];

  if (eo != null) {
    const eoStatus: Verdict =
      (m.equal_opportunity_verdict as Verdict | undefined | null) ??
      (eo <= 0.1 ? 'pass' : eo <= 0.2 ? 'warn' : 'fail');
    metrics.push({
      name: 'Égalité des chances',
      value: 1 - eo,
      threshold: 0.8,
      max: 1,
      status: eoStatus,
      fmt: pct,
      plain:
        eo > 0.1
          ? `Écart TPR de ${num2(eo)} entre groupes — la sensibilité diffère selon les profils.`
          : `À profil de remboursement égal, les groupes sont traités de façon similaire.`,
    });
  }

  if (eodds != null) {
    const eoddStatus: Verdict =
      (m.equalized_odds_verdict as Verdict | undefined | null) ??
      (eodds <= 0.1 ? 'pass' : eodds <= 0.2 ? 'warn' : 'fail');
    metrics.push({
      name: 'Calibration',
      value: 1 - eodds,
      threshold: 0.8,
      max: 1,
      status: eoddStatus,
      fmt: pct,
      plain:
        eodds > 0.1
          ? `Écart max TPR/FPR de ${num2(eodds)} — un même score reflète un risque différent selon le groupe.`
          : `Un même score reflète un risque comparable quel que soit le groupe.`,
    });
  }

  return metrics;
}

/* ─── Tab content — Synthèse ─────────────────────────────────────────── */

function SyntheseTab({
  metrics,
  verdict,
  auditId,
  interpretation,
  module,
}: {
  metrics: M1MetricsOut | M2MetricsOut | M3MetricsOut;
  verdict: Verdict;
  auditId: string;
  interpretation: { narrative: string } | null;
  module: string;
}) {
  const isM1 = module === 'M1' && 'groups' in metrics;
  const isM2 = 'clusters' in metrics;
  const isM3 = module === 'M3' && 'categories' in metrics;

  const m1Metrics = isM1 ? buildM1Metrics(metrics as M1MetricsOut) : [];
  const keyMetric = m1Metrics[0];

  const narrative = interpretation?.narrative ?? null;

  const statusRows: Array<[Verdict | 'info', string, string]> = [];
  if (isM1) {
    const m = metrics as M1MetricsOut;
    const di = m.disparate_impact;
    statusRows.push([
      di < 0.8 ? 'fail' : 'pass',
      di < 0.8 ? 'Ce qui ne va pas' : 'Point critique',
      narrative ??
        (di < 0.8
          ? `Le groupe défavorisé obtient une décision favorable ${(di * 100).toFixed(0)} % aussi souvent que le groupe de référence, en dessous du seuil légal de 80 %.`
          : 'Le disparate impact respecte le seuil légal.'),
    ]);
    statusRows.push([
      'info',
      "Pourquoi c'est un risque",
      'La loi interdit la discrimination indirecte, même non intentionnelle. Un tel écart est sanctionnable et doit être corrigé ou documenté.',
    ]);
    if (m.equal_opportunity_diff != null) {
      const eoOk = m.equal_opportunity_diff <= 0.1;
      statusRows.push([
        eoOk ? 'pass' : 'warn',
        eoOk ? 'Ce qui fonctionne' : 'Point de vigilance',
        eoOk
          ? `À profil de remboursement égal, les groupes sont traités de façon similaire (écart TPR : ${m.equal_opportunity_diff.toFixed(2)}).`
          : `L'égalité des chances n'est pas pleinement satisfaite (écart TPR : ${m.equal_opportunity_diff.toFixed(2)}).`,
      ]);
    } else {
      statusRows.push([
        'pass',
        'Données de vérité terrain',
        'Aucune donnée de ground truth disponible — les métriques supervisées (EO, calibration) ne peuvent être calculées.',
      ]);
    }
  } else if (isM2) {
    const m = metrics as M2MetricsOut;
    statusRows.push([
      m.verdict,
      m.deviant_cluster_ids.length > 0 ? 'Clusters déviants détectés' : 'Aucun cluster déviant',
      `${m.deviant_cluster_ids.length} cluster(s) sur ${m.k} présentent un écart significatif par rapport au taux global.`,
    ]);
    statusRows.push([
      'info',
      'Méthode utilisée',
      `Test du χ² (p = ${m.p_value}, χ² = ${m.chi2}, ddl ${m.dof}). Un p < 0,05 indique une hétérogénéité non aléatoire.`,
    ]);
    statusRows.push([
      m.verdict === 'pass' ? 'pass' : 'warn',
      'Interprétation',
      narrative ?? 'Résultats à analyser en contexte avec les caractéristiques dominantes des clusters.',
    ]);
  } else if (isM3) {
    const m = metrics as M3MetricsOut;
    const worstCat = [...m.categories].sort((a, b) => a.score - b.score)[0];
    statusRows.push([
      m.verdict,
      m.verdict !== 'pass' ? 'Biais de traitement détecté' : 'Traitement équitable',
      narrative ?? `Score global : ${m.global_score.toFixed(2)} sur ${m.n_pairs} paires testées.`,
    ]);
    if (worstCat) {
      statusRows.push([
        worstCat.verdict,
        `Catégorie la plus critique : ${worstCat.name}`,
        `Écart longueur : ${worstCat.length_gap.toFixed(2)}, sentiment : ${worstCat.sentiment_gap.toFixed(2)}, refus : ${(worstCat.refusal_rate * 100).toFixed(0)} %.`,
      ]);
    }
    statusRows.push([
      'info',
      'Méthode',
      'Comparaison par paires (variant A/B) sur des prompts contrôlés. Les écarts mesurés portent sur longueur, sentiment et taux de refus.',
    ]);
  }

  const recoCount =
    (interpretation as { recommendations?: unknown[] } | null)?.recommendations?.length ?? 0;

  return (
    <div className="flex flex-col gap-4">
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 16 }}>
        {/* En clair */}
        <Card>
          <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.12em] text-fg-muted">
            En clair
          </div>
          <div className="flex flex-col gap-4">
            {statusRows.map(([st, title, body]) => (
              <div key={title} className="flex gap-3">
                <span
                  className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                  style={{
                    background:
                      st === 'fail'
                        ? 'var(--status-fail-bg)'
                        : st === 'pass'
                          ? 'var(--status-pass-bg)'
                          : st === 'warn'
                            ? 'var(--status-warn-bg)'
                            : 'var(--surface-3)',
                    border:
                      st === 'fail'
                        ? '1px solid var(--status-fail-border)'
                        : st === 'pass'
                          ? '1px solid var(--status-pass-border)'
                          : st === 'warn'
                            ? '1px solid var(--status-warn-border)'
                            : '1px solid var(--border-default)',
                  }}
                >
                  {st === 'fail' ? (
                    <Icons.flag size={14} className="text-status-fail" />
                  ) : st === 'pass' ? (
                    <Icons.activity size={14} className="text-status-pass" />
                  ) : st === 'warn' ? (
                    <Icons.zap size={14} className="text-status-warn" />
                  ) : (
                    <Icons.helpCircle size={14} className="text-fg-muted" />
                  )}
                </span>
                <div>
                  <div className="text-sm font-medium text-fg">{title}</div>
                  <p className="mt-0.5 text-[13px] leading-relaxed text-fg-muted">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Right column */}
        <div className="flex flex-col gap-4">
          {/* Key metric / indicator */}
          {isM1 && keyMetric ? (
            <Card>
              <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.12em] text-fg-muted">
                Indicateur clé · {keyMetric.name}
              </div>
              <div
                className="font-mono text-[40px] font-semibold tabular-nums"
                style={{
                  color:
                    keyMetric.status === 'fail'
                      ? 'var(--status-fail)'
                      : keyMetric.status === 'warn'
                        ? 'var(--status-warn)'
                        : 'var(--status-pass)',
                }}
              >
                {(keyMetric.value * 100).toFixed(0)}
                <span className="text-lg"> %</span>
              </div>
              <p className="mt-1 mb-3 text-[12.5px] text-fg-muted">
                du taux de référence — il en faut 80 % minimum.
              </p>
              <Meter
                value={keyMetric.value}
                threshold={keyMetric.threshold}
                max={keyMetric.max}
                status={keyMetric.status}
                format={keyMetric.fmt}
              />
            </Card>
          ) : isM2 ? (
            <Card>
              <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.12em] text-fg-muted">
                Clusters déviants
              </div>
              <div
                className="font-mono text-[40px] font-semibold tabular-nums"
                style={{ color: verdict === 'fail' ? 'var(--status-fail)' : 'var(--fg)' }}
              >
                {(metrics as M2MetricsOut).deviant_cluster_ids.length}
                <span className="text-lg"> / {(metrics as M2MetricsOut).k}</span>
              </div>
              <p className="mt-1 mb-3 text-[12.5px] text-fg-muted">clusters présentent une déviation significative.</p>
              <Meter
                value={(metrics as M2MetricsOut).deviant_cluster_ids.length}
                max={(metrics as M2MetricsOut).k}
                status={verdict}
                format={(v) => `${v}`}
              />
            </Card>
          ) : isM3 ? (
            <Card>
              <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.12em] text-fg-muted">
                Score global
              </div>
              <div
                className="font-mono text-[40px] font-semibold tabular-nums"
                style={{ color: verdict === 'fail' ? 'var(--status-fail)' : verdict === 'warn' ? 'var(--status-warn)' : 'var(--status-pass)' }}
              >
                {((metrics as M3MetricsOut).global_score * 100).toFixed(0)}
                <span className="text-lg"> %</span>
              </div>
              <p className="mt-1 mb-3 text-[12.5px] text-fg-muted">
                de conformité — sur {(metrics as M3MetricsOut).n_pairs} paires testées.
              </p>
              <Meter
                value={(metrics as M3MetricsOut).global_score}
                threshold={0.8}
                max={1}
                status={verdict}
                format={(v) => `${(v * 100).toFixed(0)} %`}
              />
            </Card>
          ) : null}

          {/* Actions recommandées */}
          <Card className="border-border-default bg-surface-2">
            <div className="flex gap-3">
              <Icons.lightbulb size={18} className="mt-0.5 shrink-0 text-accent" />
              <div>
                <div className="text-[13.5px] font-medium text-fg">
                  {recoCount > 0 ? `${recoCount} action${recoCount > 1 ? 's' : ''} recommandée${recoCount > 1 ? 's' : ''}` : 'Actions recommandées'}
                </div>
                <p className="mt-1 mb-3 text-[12.5px] leading-relaxed text-fg-muted">
                  {recoCount > 0
                    ? "Consultez le plan d'action pour corriger les biais identifiés."
                    : "Accédez aux recommandations pour ce résultat d'audit."}
                </p>
                <Button variant="primary" size="sm" asChild>
                  <Link href={`/app/recommandations?auditId=${auditId}`}>
                    Voir le plan
                    <Icons.arrowR size={14} />
                  </Link>
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Mini metric cards row (M1 only) */}
      {isM1 && m1Metrics.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${Math.min(m1Metrics.length, 4)}, 1fr)`,
            gap: 12,
          }}
        >
          {m1Metrics.map((m) => (
            <Card key={m.name}>
              <div className="mb-2.5 flex items-start justify-between gap-2">
                <span className="font-mono text-[11px] uppercase leading-tight tracking-[0.1em] text-fg-muted">
                  {m.name}
                </span>
                <StatusBadge tone={m.status as StatusTone} />
              </div>
              <div
                className="mb-2.5 font-mono text-2xl font-semibold tabular-nums"
                style={{
                  color:
                    m.status === 'fail'
                      ? 'var(--status-fail)'
                      : m.status === 'warn'
                        ? 'var(--status-warn)'
                        : 'var(--status-pass)',
                }}
              >
                {m.fmt(m.value)}
              </div>
              <Meter
                value={m.value}
                threshold={m.threshold}
                max={m.max}
                status={m.status}
                format={m.fmt}
              />
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Tab content — Métriques détaillées ─────────────────────────────── */

function MetriquesTab({
  metrics,
  module,
}: {
  metrics: M1MetricsOut | M2MetricsOut | M3MetricsOut;
  module: string;
}) {
  const isM1 = module === 'M1' && 'groups' in metrics;
  const isM2 = 'clusters' in metrics;
  const isM3 = module === 'M3' && 'categories' in metrics;

  if (isM1) {
    const m1Metrics = buildM1Metrics(metrics as M1MetricsOut);
    return (
      <div className="flex flex-col gap-3.5">
        {m1Metrics.map((m) => (
          <Card key={m.name}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 24, alignItems: 'center' }}>
              <div>
                <div className="mb-1.5 flex items-center gap-2.5">
                  <h3 className="text-[15.5px] font-medium text-fg">{m.name}</h3>
                  <StatusBadge tone={m.status as StatusTone} />
                </div>
                <p className="text-[13.5px] leading-relaxed text-fg-secondary" style={{ maxWidth: 620 }}>
                  {m.plain}
                </p>
              </div>
              <div style={{ width: 220 }}>
                <div
                  className="mb-2 text-right font-mono text-[28px] font-semibold tabular-nums"
                  style={{
                    color:
                      m.status === 'fail'
                        ? 'var(--status-fail)'
                        : m.status === 'warn'
                          ? 'var(--status-warn)'
                          : 'var(--status-pass)',
                  }}
                >
                  {m.fmt(m.value)}
                </div>
                <Meter
                  value={m.value}
                  threshold={m.threshold}
                  max={m.max}
                  status={m.status}
                  format={m.fmt}
                />
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (isM2) {
    const m2 = metrics as M2MetricsOut;
    return (
      <div className="flex flex-col gap-3.5">
        <Card>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 24, alignItems: 'center' }}>
            <div>
              <div className="mb-1.5 flex items-center gap-2.5">
                <h3 className="text-[15.5px] font-medium text-fg">Test du χ²</h3>
                <StatusBadge tone={m2.verdict as StatusTone} />
              </div>
              <p className="text-[13.5px] leading-relaxed text-fg-secondary" style={{ maxWidth: 620 }}>
                p-value = {m2.p_value} · χ² = {m2.chi2} · ddl = {m2.dof}. Un p &lt; 0,05 indique une hétérogénéité non aléatoire.
              </p>
            </div>
            <div style={{ width: 220 }}>
              <div className="mb-2 text-right font-mono text-[28px] font-semibold tabular-nums text-fg">
                {m2.p_value}
              </div>
              <Meter
                value={m2.p_value < 0.05 ? 1 : 0}
                max={1}
                status={m2.p_value < 0.05 ? 'fail' : 'pass'}
                format={(v) => (v > 0.5 ? 'sig.' : 'n.s.')}
              />
            </div>
          </div>
        </Card>
        <Card>
          <h3 className="mb-2 text-[15.5px] font-medium text-fg">Taux favorable global</h3>
          <p className="mb-3 text-[13.5px] text-fg-secondary">
            {(m2.global_positive_rate * 100).toFixed(1)} % des {m2.n} décisions sont favorables.
          </p>
          <Meter value={m2.global_positive_rate} max={1} status="info" format={(v) => `${(v * 100).toFixed(1)} %`} />
        </Card>
        {m2.warnings.length > 0 && (
          <ul className="rounded-md border border-status-warn-border bg-status-warn-bg p-3 text-sm text-status-warn">
            {m2.warnings.map((w) => <li key={w}>{w}</li>)}
          </ul>
        )}
      </div>
    );
  }

  if (isM3) {
    const m3 = metrics as M3MetricsOut;
    return (
      <div className="flex flex-col gap-3.5">
        {m3.categories.map((c) => (
          <Card key={c.name}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 24, alignItems: 'center' }}>
              <div>
                <div className="mb-1.5 flex items-center gap-2.5">
                  <h3 className="text-[15.5px] font-medium text-fg">{c.name}</h3>
                  <StatusBadge tone={c.verdict as StatusTone} />
                </div>
                <p className="text-[13.5px] leading-relaxed text-fg-secondary" style={{ maxWidth: 620 }}>
                  Écart longueur : {c.length_gap.toFixed(2)} · sentiment : {c.sentiment_gap.toFixed(2)} · refus : {(c.refusal_rate * 100).toFixed(0)} %
                </p>
              </div>
              <div style={{ width: 220 }}>
                <div
                  className="mb-2 text-right font-mono text-[28px] font-semibold tabular-nums"
                  style={{
                    color:
                      c.verdict === 'fail'
                        ? 'var(--status-fail)'
                        : c.verdict === 'warn'
                          ? 'var(--status-warn)'
                          : 'var(--status-pass)',
                  }}
                >
                  {(c.score * 100).toFixed(0)} %
                </div>
                <Meter value={c.score} threshold={0.8} max={1} status={c.verdict as 'pass' | 'warn' | 'fail'} format={(v) => `${(v * 100).toFixed(0)} %`} />
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  return null;
}

/* ─── Tab content — Groupes / Clusters / Catégories ─────────────────── */

/**
 * Builds RatioBar groups from M1MetricsOut.groups, mapping selection_rate as
 * the bar value. The RatioBar automatically treats the highest value as
 * reference, which matches our reference_value group.
 */
function buildRatioBarGroups(m1: M1MetricsOut): Array<{ label: string; value: number; n: number }> {
  return m1.groups.map((g) => ({
    label: g.value,
    value: g.selection_rate,
    n: g.n,
  }));
}

/**
 * Synthesizes 2D ClusterMap points from ClusterStatOut data.
 * The engine returns no true 2D projection, so we lay out clusters on a
 * pseudo-scatter: x = clusterId * 80 (spread horizontally), y = positive_rate * 100
 * (vertical axis mirrors the acceptance rate). Adding a small jitter per
 * cluster so not all points land on the same spot.
 */
function buildClusterMapPoints(m2: M2MetricsOut): Array<{ x: number; y: number; clusterId: string; isDeviant: boolean }> {
  return m2.clusters.map((c) => ({
    x: c.id * 80 + 40,
    y: c.positive_rate * 100,
    clusterId: String(c.id),
    isDeviant: c.is_deviant,
  }));
}

/**
 * Maps M3 categories to exactly 6 HeatMap6Axes entries.
 * Each category uses its score (0–1) scaled to (0–5) for the score/5 display.
 * If fewer than 6 categories exist, pads with neutral entries (score=5, status='info').
 * If more than 6, takes the first 6.
 */
type HeatMap6AxesEntry = { key: string; label: string; score: number; status: 'pass' | 'warn' | 'fail' | 'info' };

function buildHeatMap6AxesEntries(m3: M3MetricsOut): [HeatMap6AxesEntry, HeatMap6AxesEntry, HeatMap6AxesEntry, HeatMap6AxesEntry, HeatMap6AxesEntry, HeatMap6AxesEntry] {
  const cats: HeatMap6AxesEntry[] = m3.categories.slice(0, 6).map((c) => ({
    key: c.name,
    label: c.name,
    score: c.score * 5, // scale 0–1 → 0–5
    status: c.verdict as 'pass' | 'warn' | 'fail',
  }));
  // Pad with neutral axes if fewer than 6 categories
  while (cats.length < 6) {
    cats.push({ key: `neutral-${cats.length}`, label: '—', score: 5, status: 'info' });
  }
  return cats as [HeatMap6AxesEntry, HeatMap6AxesEntry, HeatMap6AxesEntry, HeatMap6AxesEntry, HeatMap6AxesEntry, HeatMap6AxesEntry];
}

function GroupesTab({
  metrics,
  module,
}: {
  metrics: M1MetricsOut | M2MetricsOut | M3MetricsOut;
  module: string;
}) {
  const isM1 = module === 'M1' && 'groups' in metrics;
  const isM2 = 'clusters' in metrics;
  const isM3 = module === 'M3' && 'categories' in metrics;

  // M2 cluster selection state
  const [selectedClusterId, setSelectedClusterId] = React.useState<string | null>(null);

  if (isM1) {
    const m1 = metrics as M1MetricsOut;
    const ratioBarGroups = buildRatioBarGroups(m1);
    return (
      <Card className="overflow-hidden p-0">
        <div className="border-b border-border-subtle px-5 py-4">
          <h3 className="text-base font-medium text-fg">Comparaison des groupes · Règle des 4/5</h3>
          <p className="mt-0.5 text-[13px] text-fg-muted">
            Taux d&apos;acceptation par groupe. Le groupe de référence est le plus favorisé.
          </p>
        </div>
        <div className="px-6 py-5">
          <RatioBar
            groups={ratioBarGroups}
            threshold={0.8}
            format={(v) => `${(v * 100).toFixed(1)}%`}
          />
          <hr className="my-4 border-border-subtle" />
          <InlineNote icon={Scale}>
            Règle des 4/5 : le taux du groupe défavorisé doit atteindre au moins 80 % du taux de référence.
          </InlineNote>
        </div>
      </Card>
    );
  }

  if (isM2) {
    const m2 = metrics as M2MetricsOut;
    const clusterPoints = buildClusterMapPoints(m2);
    const selectedCluster = selectedClusterId !== null
      ? m2.clusters.find((c) => String(c.id) === selectedClusterId)
      : null;

    return (
      <div className="flex flex-col gap-4">
        <Card className="overflow-hidden p-0">
          <div className="border-b border-border-subtle px-5 py-4">
            <h3 className="text-base font-medium text-fg">Projection des clusters · carte 2D</h3>
            <p className="mt-0.5 text-[13px] text-fg-muted">
              Les clusters sont projetés selon leur taux d&apos;acceptation (axe Y) et leur identifiant (axe X).
              Les clusters déviants apparaissent en rouge.
            </p>
          </div>
          <div className="flex flex-col items-start gap-4 px-6 py-5 sm:flex-row">
            {/* Cluster scatter map */}
            <ClusterMap
              points={clusterPoints}
              selectedClusterId={selectedClusterId ?? undefined}
              onClusterSelect={(id) => setSelectedClusterId((prev) => (prev === id ? null : id))}
              className="shrink-0"
            />
            {/* Selected cluster details or legend */}
            <div className="flex-1 min-w-0">
              {selectedCluster ? (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-fg">Cluster #{selectedCluster.id}</span>
                    {selectedCluster.is_deviant && <StatusBadge tone="fail">Déviant</StatusBadge>}
                  </div>
                  <p className="text-[13px] text-fg-secondary">
                    {selectedCluster.n.toLocaleString('fr-FR')} décisions ·{' '}
                    taux favorable : {(selectedCluster.positive_rate * 100).toFixed(1)} % ·{' '}
                    écart : {selectedCluster.deviation_pp > 0 ? '+' : ''}{selectedCluster.deviation_pp} pts
                  </p>
                  <Meter
                    value={selectedCluster.positive_rate}
                    threshold={m2.global_positive_rate}
                    max={1}
                    status={selectedCluster.is_deviant ? 'fail' : 'pass'}
                    format={(v) => `${(v * 100).toFixed(1)} %`}
                  />
                  {selectedCluster.top_features.length > 0 && (
                    <div className="mt-2">
                      <div className="mb-2 font-mono text-[11px] uppercase tracking-[0.1em] text-fg-muted">
                        Features dominantes
                      </div>
                      <div className="flex flex-col gap-2">
                        {selectedCluster.top_features.map((f) => (
                          <div key={f.name} className="flex items-center gap-2 text-[12.5px] text-fg-secondary">
                            <span className="font-mono">{f.name}</span>
                            <span>{f.direction === 'above' ? '↑' : '↓'} {f.std_diff.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-fg-muted">
                  Cliquez sur un cluster pour voir ses caractéristiques.
                </p>
              )}
            </div>
          </div>
        </Card>

        {/* Feature rank list — shows all clusters sorted by risk */}
        <Card className="overflow-hidden p-0">
          <div className="border-b border-border-subtle px-5 py-4">
            <h3 className="text-base font-medium text-fg">Classement des clusters par risque</h3>
          </div>
          <div className="px-6 py-4 flex flex-col gap-3">
            {[...m2.clusters].sort((a, b) => (b.is_deviant ? 1 : 0) - (a.is_deviant ? 1 : 0) || Math.abs(b.deviation_pp) - Math.abs(a.deviation_pp)).map((c) => (
              <div key={c.id} style={{ display: 'grid', gridTemplateColumns: '56px 1fr 80px', gap: 12, alignItems: 'center' }}>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium text-fg">C{c.id}</span>
                  {c.is_deviant && <StatusBadge tone="fail">!</StatusBadge>}
                </div>
                <div>
                  <Meter
                    value={c.positive_rate}
                    threshold={m2.global_positive_rate}
                    max={1}
                    status={c.is_deviant ? 'fail' : 'pass'}
                    format={(v) => `${(v * 100).toFixed(1)} %`}
                  />
                  <div className="mt-1 font-mono text-[11.5px] text-fg-muted">
                    {c.n.toLocaleString('fr-FR')} décisions
                  </div>
                </div>
                <div className="text-right font-mono text-[13px] tabular-nums" style={{ color: c.is_deviant ? 'var(--status-fail)' : 'var(--fg-muted)' }}>
                  {(c.positive_rate * 100).toFixed(1)} %
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    );
  }

  if (isM3) {
    const m3 = metrics as M3MetricsOut;
    const axes = buildHeatMap6AxesEntries(m3);
    const firstExample = m3.divergent_examples[0];

    return (
      <div className="flex flex-col gap-4">
        <Card className="overflow-hidden p-0">
          <div className="border-b border-border-subtle px-5 py-4">
            <h3 className="text-base font-medium text-fg">Scores par axe sensible</h3>
            <p className="mt-0.5 text-[13px] text-fg-muted">
              Chaque catégorie est évaluée sur une échelle de 0 à 5. Un score de 5 indique l&apos;équité la plus forte.
            </p>
          </div>
          <div className="p-5">
            <HeatMap6Axes axes={axes} />
          </div>
        </Card>

        {/* DiffViewer for the most divergent example */}
        {firstExample && (
          <Card className="overflow-hidden p-0">
            <div className="border-b border-border-subtle px-5 py-4">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-medium text-fg">Exemple représentatif · {firstExample.category}</h3>
                <StatusBadge tone="fail">Divergent</StatusBadge>
              </div>
              <p className="mt-0.5 text-[13px] text-fg-muted">
                La paire la plus divergente détectée. {firstExample.reason}
              </p>
            </div>
            <div className="p-5">
              <DiffViewer
                neutral={{ prompt: firstExample.variant_a, response: firstExample.excerpt_a }}
                marked={{ prompt: firstExample.variant_b, response: firstExample.excerpt_b }}
                delta={{
                  length_chars: firstExample.excerpt_b.length - firstExample.excerpt_a.length,
                }}
              />
            </div>
          </Card>
        )}

        {m3.divergent_examples.length === 0 && (
          <InlineNote>
            Aucun exemple divergent détecté dans cet audit.
          </InlineNote>
        )}
      </div>
    );
  }

  return null;
}

/* ─── Tab content — Méthodologie ─────────────────────────────────────── */

function MethodoTab({ audit }: { audit: ReturnType<typeof useAudit>['data'] }) {
  if (!audit) return null;
  const isM3 = audit.module === 'M3';

  const scopeRows: Array<[string, string]> = isM3
    ? [
        ['Modèle', audit.config?.['target'] ? String((audit.config['target'] as { url?: string })?.url ?? '—') : '—'],
        ['Langue', String(audit.config?.['lang'] ?? 'fr')],
        ['Paires testées', audit.metrics && 'n_pairs' in audit.metrics ? String((audit.metrics as M3MetricsOut).n_pairs) : '—'],
        ['Catégories', audit.metrics && 'categories' in audit.metrics ? String((audit.metrics as M3MetricsOut).categories.length) : '—'],
      ]
    : [
        ['Modèle', audit.code ?? audit.id],
        ['Attribut audité', audit.protected_attribute ?? '—'],
        ['Colonne de décision', audit.decision_column ?? '—'],
        ['Valeur favorable', audit.favorable_value ?? '—'],
        ['Décisions analysées', audit.metrics && 'groups' in audit.metrics ? String((audit.metrics as M1MetricsOut).groups.reduce((s, g) => s + g.n, 0)) : (audit.metrics && 'n' in audit.metrics ? String((audit.metrics as M2MetricsOut).n) : '—')],
        ['Exécuté le', audit.created_at ? new Date(audit.created_at).toLocaleDateString('fr-FR') : '—'],
      ];

  const regulations = [
    'Règlement IA européen (AI Act) — systèmes à haut risque',
    'RGPD — article 22, décision automatisée',
    'Directive 2004/113/CE — égalité de traitement',
    'Recommandation EEOC — règle des 4/5 (1978)',
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      <Card>
        <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.12em] text-fg-muted">
          Périmètre
        </div>
        <div className="flex flex-col gap-3">
          {scopeRows.map(([k, v]) => (
            <div key={k} className="flex justify-between text-[13.5px]">
              <span className="text-fg-muted">{k}</span>
              <span className="font-mono font-[450]">{v}</span>
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.12em] text-fg-muted">
          Cadre réglementaire appliqué
        </div>
        <div className="flex flex-col gap-2.5">
          {regulations.map((t) => (
            <div key={t} className="flex gap-2.5 text-[13px] leading-relaxed text-fg-secondary">
              <Icons.shield size={15} className="mt-0.5 shrink-0 text-accent" />
              {t}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ─── Main page ───────────────────────────────────────────────────────── */

export default function AuditResultPage() {
  const params = useParams<{ id: string }>();
  const id = typeof params?.id === 'string' ? params.id : '';
  const { data, isLoading, isError } = useAudit(id);

  const [tab, setTab] = React.useState('synthese');

  if (isLoading) {
    return (
      <main role="status" className="flex-1 px-8 py-8 text-fg-secondary">
        Chargement de l&apos;audit…
      </main>
    );
  }

  if (isError || !data) {
    return (
      <main className="flex-1 px-8 py-8 text-status-fail">
        Audit introuvable.
      </main>
    );
  }

  if (data.status === 'pending' || data.status === 'running') {
    return (
      <>
        <Topbar
          crumbs={[
            { label: 'Audits', href: '/app/audits' },
            { label: data.code ?? data.id },
          ]}
        />
        <main role="status" className="flex-1 px-8 py-8">
          <p className="text-fg-secondary">Analyse en cours…</p>
        </main>
      </>
    );
  }

  if (data.status === 'failed') {
    return (
      <>
        <Topbar
          crumbs={[
            { label: 'Audits', href: '/app/audits' },
            { label: data.code ?? data.id },
          ]}
        />
        <main className="flex-1 px-8 py-8">
          <div
            role="alert"
            className="rounded-md border border-status-fail-border bg-status-fail-bg p-4 text-sm text-status-fail"
          >
            <strong>L&apos;audit a échoué.</strong>
            <p className="mt-1">{data.error ?? "Une erreur inattendue s'est produite."}</p>
          </div>
        </main>
      </>
    );
  }

  const m = data.metrics;
  const verdict: Verdict = m ? (m.verdict as Verdict) : 'warn';
  const isM2 = m !== null && 'clusters' in m;
  const isM3 = data.module === 'M3';
  const isM1 = !isM2 && !isM3 && m !== null && 'groups' in m;

  /* Relative time */
  const createdRelative = relativeTime(data.created_at);

  /* Decision count chip */
  const decisionCount: number | null = isM1
    ? (m as M1MetricsOut).groups.reduce((s, g) => s + g.n, 0)
    : isM2
      ? (m as M2MetricsOut).n
      : null;

  /* Verddict text from interpretation or canned */
  const heroNarrative = data.interpretation?.narrative ?? null;

  /* Tab labels */
  const groupsLabel = isM2 ? 'Clusters' : isM3 ? 'Catégories' : 'Groupes';
  const tabs = [
    { id: 'synthese', label: 'Synthèse' },
    { id: 'metriques', label: 'Métriques détaillées' },
    { id: 'groupes', label: groupsLabel },
    { id: 'methodo', label: 'Méthodologie' },
  ] as const;

  return (
    <>
      <Topbar
        crumbs={[
          { label: 'Audits', href: '/app/audits' },
          { label: data.code ?? data.id },
        ]}
      />
      <main className="flex-1 px-8 py-8">
        {/* Topbar action row */}
        <div className="mb-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <StatusBadge tone={VERDICT_TONE[verdict]}>{VERDICT_LABELS[verdict]}</StatusBadge>
          </div>
          {m && <DownloadButton auditId={data.id} />}
        </div>

        {data.pre_check.length > 0 && (
          <div
            role="note"
            className="mb-4 rounded-md border border-status-warn-border bg-status-warn-bg p-3 text-sm text-status-warn"
          >
            <strong>Pré-vérification :</strong>
            <ul className="mt-1 list-disc pl-5">
              {data.pre_check.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </div>
        )}

        {/* VERDICT HERO */}
        <Card className="mb-4 overflow-hidden p-0">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'auto 1fr auto',
              gap: 28,
              alignItems: 'center',
              padding: '26px 28px',
              background:
                verdict === 'fail'
                  ? 'linear-gradient(100deg, var(--status-fail-bg), transparent 55%)'
                  : verdict === 'warn'
                    ? 'linear-gradient(100deg, var(--status-warn-bg), transparent 55%)'
                    : 'linear-gradient(100deg, var(--status-pass-bg), transparent 55%)',
            }}
          >
            {/* Left: stoplight + gauge */}
            <div className="flex items-center gap-5">
              <Stoplight verdict={verdict} />
              {m && (
                <Gauge
                  value={m.risk_score}
                  label="Score fairness"
                  className="max-w-[150px]"
                />
              )}
            </div>

            {/* Center: verdict text */}
            <div style={{ minWidth: 0 }}>
              <div className="mb-2 font-mono text-[11px] uppercase tracking-[0.12em] text-fg-muted">
                Verdict de l&apos;audit
              </div>
              <h1 className="mb-2 text-2xl font-semibold tracking-[-0.03em] text-fg">
                {data.title}
              </h1>
              {heroNarrative && (
                <p className="text-[14.5px] leading-relaxed text-fg-secondary" style={{ maxWidth: 540 }}>
                  {heroNarrative}
                </p>
              )}
              {/* Chips */}
              <div className="mt-3.5 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border-default bg-surface-2 px-2.5 py-1 font-mono text-[12px] text-fg-muted">
                  <Icons.activity size={12} />
                  {createdRelative}
                </span>
                {decisionCount != null && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-border-default bg-surface-2 px-2.5 py-1 font-mono text-[12px] text-fg-muted">
                    <Icons.database size={12} />
                    {decisionCount.toLocaleString('fr-FR')} décisions
                  </span>
                )}
                {data.code && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-border-default bg-surface-2 px-2.5 py-1 font-mono text-[12px] text-fg-muted">
                    <Icons.target size={12} />
                    {data.code}
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border-default bg-surface-2 px-2.5 py-1 font-mono text-[12px] text-fg-muted">
                  <Icons.flag size={12} />
                  {data.module}
                </span>
              </div>
            </div>

            {/* Right: risk level */}
            <div className="flex flex-col items-end gap-2">
              <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-fg-muted">
                Niveau de risque
              </div>
              <StatusBadge tone={verdict}>{RISK_LABELS[verdict]}</StatusBadge>
              <div className="mt-1 text-right font-mono text-[11.5px] text-fg-muted">
                Rapport signé
                <br />
                {data.code ?? data.id} · v1
              </div>
            </div>
          </div>
        </Card>

        {/* Tabs */}
        <Tabs
          items={tabs}
          value={tab}
          onChange={setTab}
          className="mb-4"
          ariaLabel="Sections du résultat d'audit"
        />

        {!m ? (
          <p className="text-sm text-fg-secondary">Résultats indisponibles pour cet audit.</p>
        ) : (
          <>
            {tab === 'synthese' && (
              <SyntheseTab
                metrics={m}
                verdict={verdict}
                auditId={data.id}
                interpretation={data.interpretation}
                module={data.module}
              />
            )}
            {tab === 'metriques' && (
              <MetriquesTab metrics={m} module={data.module} />
            )}
            {tab === 'groupes' && (
              <GroupesTab metrics={m} module={data.module} />
            )}
            {tab === 'methodo' && <MethodoTab audit={data} />}
          </>
        )}
      </main>
    </>
  );
}
