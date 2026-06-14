'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

import { Topbar } from '@/components/app/Topbar';
import { AuditRunningState } from '@/components/audits/AuditRunningState';
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
  type MarginalOut,
  type IntersectionalOut,
  type ReportFormat,
} from '@/lib/api/audits';
import { useAudit } from '@/lib/query/use-audit';
import { moduleNaming } from '@/lib/modules';
import { VERDICT_LABELS as CENTRAL_VERDICT_LABELS, verdictLabel, formatPValue } from '@/lib/verdict';
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

const VERDICT_LABELS: Record<Verdict, string> = CENTRAL_VERDICT_LABELS;

const VERDICT_TONE: Record<Verdict, StatusTone> = {
  fail: 'fail',
  warn: 'warn',
  pass: 'pass',
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
          {busy === 'xlsx' ? 'Téléchargement…' : 'Rapport Excel'}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={busy !== null}
          onClick={() => onDownload('pdf')}
        >
          {busy === 'pdf' ? 'Téléchargement…' : 'Rapport PDF'}
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
          ? `Le groupe défavorisé est retenu ${pct(di)} aussi souvent que le groupe de référence — en dessous du seuil de référence de 80 % (règle des 4/5, convention internationale).`
          : `Le ratio d'acceptation entre groupes respecte le seuil de référence de 80 % (règle des 4/5, convention internationale).`,
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
          ? `Écart de ${num2(eo)} entre les taux de bonnes décisions des groupes — à profil égal, les groupes ne sont pas traités de la même façon.`
          : `À profil égal, les groupes sont traités de façon similaire.`,
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
          ? `Écart maximal de ${num2(eodds)} entre les taux d'erreur des groupes — un même score reflète un risque différent selon le groupe.`
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
      di < 0.8 ? 'Ce qui ne va pas' : 'Point principal',
      narrative ??
        (di < 0.8
          ? `Le groupe défavorisé obtient une décision favorable ${(di * 100).toFixed(0)} % aussi souvent que le groupe de référence, en dessous du seuil de référence de 80 % (règle des 4/5, convention internationale).`
          : 'Le ratio entre groupes respecte le seuil de référence de 80 % (règle des 4/5).'),
    ]);
    statusRows.push([
      'info',
      "Pourquoi c'est un risque",
      "La réglementation encadre la discrimination indirecte, même non intentionnelle. Un tel écart mérite d'être analysé, corrigé ou documenté.",
    ]);
    if (m.equal_opportunity_diff != null) {
      const eoOk = m.equal_opportunity_diff <= 0.1;
      statusRows.push([
        eoOk ? 'pass' : 'warn',
        eoOk ? 'Ce qui fonctionne' : 'Point de vigilance',
        eoOk
          ? `À profil égal, les groupes sont traités de façon similaire (écart : ${m.equal_opportunity_diff.toFixed(2)}).`
          : `L'égalité des chances n'est pas pleinement satisfaite (écart : ${m.equal_opportunity_diff.toFixed(2)}).`,
      ]);
    } else if (m.truelabel_reason != null) {
      // Ground truth WAS provided, but EO/Equalized Odds could not be
      // computed (e.g. the truth column's values don't match the decision's
      // favorable value, or a group has no real positives). Surface the real
      // reason instead of wrongly claiming no ground truth was given.
      statusRows.push([
        'warn',
        'Vérité-terrain : métriques supervisées non calculées',
        `${m.truelabel_reason} Vérifiez que la colonne vérité-terrain utilise la même valeur favorable que la colonne de décision, et que chaque groupe contient des cas positifs réels.`,
      ]);
    } else {
      statusRows.push([
        'pass',
        'Résultat réel des décisions',
        "Votre fichier ne contient pas le résultat réel des décisions — les métriques qui en dépendent (égalité des chances, calibration) n'ont pas pu être calculées.",
      ]);
    }
  } else if (isM2) {
    const m = metrics as M2MetricsOut;
    const nDeviant = m.deviant_cluster_ids.length;
    statusRows.push([
      m.verdict,
      nDeviant > 0 ? 'Groupes au traitement atypique détectés' : 'Aucun groupe atypique',
      `${nDeviant} ${nDeviant > 1 ? 'groupes' : 'groupe'} sur ${m.k} ${nDeviant > 1 ? 'présentent' : 'présente'} un écart significatif par rapport au taux global.`,
    ]);
    statusRows.push([
      'info',
      'Méthode utilisée',
      m.p_value < 0.05
        ? `Un test statistique confirme que les écarts observés ne sont probablement pas dus au hasard (${formatPValue(m.p_value)}).`
        : `Un test statistique n'indique pas d'écart significatif entre les groupes (${formatPValue(m.p_value)}).`,
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
                Groupes au traitement atypique
              </div>
              <div
                className="font-mono text-[40px] font-semibold tabular-nums"
                style={{ color: verdict === 'fail' ? 'var(--status-fail)' : 'var(--fg)' }}
              >
                {(metrics as M2MetricsOut).deviant_cluster_ids.length}
                <span className="text-lg"> / {(metrics as M2MetricsOut).k}</span>
              </div>
              <p className="mt-1 mb-3 text-[12.5px] text-fg-muted">
                {(metrics as M2MetricsOut).deviant_cluster_ids.length > 1
                  ? 'groupes présentent un écart significatif.'
                  : 'groupe présente un écart significatif.'}
              </p>
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
                d&apos;équité de traitement — sur {(metrics as M3MetricsOut).n_pairs} paires testées.
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
                <h3 className="text-[15.5px] font-medium text-fg">Test statistique</h3>
                <StatusBadge tone={m2.verdict as StatusTone} />
              </div>
              <p className="text-[13.5px] leading-relaxed text-fg-secondary" style={{ maxWidth: 620 }}>
                {m2.p_value < 0.05
                  ? 'Un test statistique confirme que les écarts observés entre les groupes ne sont probablement pas dus au hasard.'
                  : "Un test statistique n'indique pas d'écart significatif entre les groupes."}
              </p>
              <details className="mt-2 text-[12.5px] text-fg-muted">
                <summary className="cursor-pointer select-none">Détails techniques</summary>
                <p className="mt-1 font-mono">
                  Test du χ² : {formatPValue(m2.p_value)} · χ² = {m2.chi2.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} · ddl = {m2.dof}
                </p>
              </details>
            </div>
            <div style={{ width: 220 }}>
              <div className="mb-2 text-right font-mono text-[20px] font-semibold tabular-nums text-fg">
                {formatPValue(m2.p_value)}
              </div>
              <Meter
                value={m2.p_value < 0.05 ? 1 : 0}
                max={1}
                status={m2.p_value < 0.05 ? 'fail' : 'pass'}
                format={(v) => (v > 0.5 ? 'significatif' : 'non significatif')}
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
    // Use marginals if available, otherwise fall back to the top-level groups
    const marginals: MarginalOut[] =
      m1.marginals && m1.marginals.length > 0
        ? m1.marginals
        : [
            {
              attribute: '—',
              groups: m1.groups,
              reference_value: m1.reference_value,
              disparate_impact: m1.disparate_impact,
              demographic_parity_diff: m1.demographic_parity_diff,
              worst_group: m1.worst_group,
              verdict: m1.verdict,
              risk_score: m1.risk_score,
              warnings: m1.warnings,
            },
          ];
    const pairwise: IntersectionalOut[] = m1.pairwise ?? [];

    return (
      <div className="flex flex-col gap-4">
        {/* Per-attribute marginal cards */}
        {marginals.map((marginal) => {
          const ratioBarGroups = marginal.groups.map((g) => ({
            label: g.value,
            value: g.selection_rate,
            n: g.n,
          }));
          const dpRatio = marginal.demographic_parity_ratio;
          const eoRatio = marginal.equal_opportunity_ratio;
          const eoddsRatio = marginal.equalized_odds_ratio;
          // Show per-group rate columns only when at least one group has ground-truth rates
          const hasGroundTruth = marginal.groups.some(
            (g) => g.fnr != null || g.accuracy != null || g.precision != null,
          );
          return (
            <Card key={marginal.attribute} className="overflow-hidden p-0">
              <div className="border-b border-border-subtle px-5 py-4">
                <h3 className="text-base font-medium text-fg">
                  Comparaison des groupes · <span className="font-mono">{marginal.attribute}</span>
                </h3>
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
                {/* Fairlearn ratios — informative */}
                {dpRatio != null && (
                  <div
                    className="mt-4 flex flex-wrap gap-4 rounded-md border border-border-subtle bg-surface-2 px-4 py-3 text-[12.5px] text-fg-secondary"
                    aria-label="Indicateurs complémentaires"
                  >
                    <span>
                      <span className="font-medium text-fg">Ratio DP</span>{' '}
                      <span className="font-mono tabular-nums">{dpRatio.toFixed(3)}</span>
                    </span>
                    {eoRatio != null && (
                      <span>
                        <span className="font-medium text-fg">Ratio EO</span>{' '}
                        <span className="font-mono tabular-nums">{eoRatio.toFixed(3)}</span>
                      </span>
                    )}
                    {eoddsRatio != null && (
                      <span>
                        <span className="font-medium text-fg">Ratio EOdds</span>{' '}
                        <span className="font-mono tabular-nums">{eoddsRatio.toFixed(3)}</span>
                      </span>
                    )}
                    <span className="ml-auto font-mono text-[11px] uppercase tracking-[0.08em] text-fg-muted">
                      informatif
                    </span>
                  </div>
                )}
                {/* Per-group true-label rates — only when ground truth provided */}
                {hasGroundTruth && (
                  <div className="mt-4 overflow-x-auto">
                    <table
                      className="w-full text-[12.5px]"
                      aria-label={`Taux par groupe · ${marginal.attribute}`}
                    >
                      <thead>
                        <tr className="border-b border-border-subtle">
                          <th className="pb-2 pr-4 text-left font-medium text-fg-muted">Groupe</th>
                          <th className="pb-2 px-3 text-center font-medium text-fg-muted">Refus à tort</th>
                          <th className="pb-2 px-3 text-center font-medium text-fg-muted">Précision</th>
                          <th className="pb-2 px-3 text-center font-medium text-fg-muted">Exactitude</th>
                        </tr>
                      </thead>
                      <tbody>
                        {marginal.groups.map((g) => (
                          <tr key={g.value} className="border-t border-border-subtle">
                            <td className="py-1.5 pr-4 font-medium text-fg">{g.value}</td>
                            <td className="py-1.5 px-3 text-center font-mono tabular-nums text-fg-secondary">
                              {g.fnr != null ? `${(g.fnr * 100).toFixed(1)}%` : '—'}
                            </td>
                            <td className="py-1.5 px-3 text-center font-mono tabular-nums text-fg-secondary">
                              {g.precision != null ? `${(g.precision * 100).toFixed(1)}%` : '—'}
                            </td>
                            <td className="py-1.5 px-3 text-center font-mono tabular-nums text-fg-secondary">
                              {g.accuracy != null ? `${(g.accuracy * 100).toFixed(1)}%` : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <hr className="my-4 border-border-subtle" />
                <InlineNote icon={Scale}>
                  Règle des 4/5 : le taux du groupe défavorisé doit atteindre au moins 80 % du taux de référence.
                </InlineNote>
              </div>
            </Card>
          );
        })}

        {/* Per-pair intersectional matrices */}
        {pairwise.map((pair) => {
          const pairTitle = `${pair.primary_attribute ?? '—'} × ${pair.secondary_attribute ?? '—'}`;
          // Collect unique primary and secondary values for a simple grid display
          const primaryValues = [...new Set(pair.cells.map((c) => c.primary_value))];
          const secondaryValues = [...new Set(pair.cells.map((c) => c.secondary_value))];
          const pairDpRatio = pair.demographic_parity_ratio;
          const pairEoRatio = pair.equal_opportunity_ratio;
          const pairEoddsRatio = pair.equalized_odds_ratio;
          return (
            <Card key={pairTitle} className="overflow-hidden p-0">
              <div className="border-b border-border-subtle px-5 py-4">
                <h3 className="text-base font-medium text-fg">
                  Analyse intersectionnelle · <span className="font-mono">{pairTitle}</span>
                </h3>
                <p className="mt-0.5 text-[13px] text-fg-muted">
                  Ratio d&apos;acceptation par combinaison de groupes. Ratio global&nbsp;:{' '}
                  <strong>{(pair.disparate_impact * 100).toFixed(0)} %</strong>
                  {' '}· résultat&nbsp;: <strong>{verdictLabel(pair.verdict)}</strong>
                </p>
              </div>
              <div className="overflow-x-auto px-4 py-4">
                <table className="w-full text-sm" aria-label={`Matrice intersectionnelle ${pairTitle}`}>
                  <thead>
                    <tr>
                      <th className="pb-2 pr-4 text-left font-medium text-fg-muted">
                        {pair.primary_attribute ?? 'Primaire'} ↓ / {pair.secondary_attribute ?? 'Secondaire'} →
                      </th>
                      {secondaryValues.map((sv) => (
                        <th key={sv} className="pb-2 px-3 text-center font-medium text-fg-muted">
                          {sv}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {primaryValues.map((pv) => (
                      <tr key={pv} className="border-t border-border-subtle">
                        <td className="py-2 pr-4 font-medium text-fg">{pv}</td>
                        {secondaryValues.map((sv) => {
                          const cell = pair.cells.find(
                            (c) => c.primary_value === pv && c.secondary_value === sv,
                          );
                          if (!cell) {
                            return (
                              <td key={sv} className="px-3 py-2 text-center text-fg-muted">
                                —
                              </td>
                            );
                          }
                          const diPct = (cell.disparate_impact * 100).toFixed(0);
                          const diColor =
                            cell.verdict === 'fail'
                              ? 'var(--status-fail)'
                              : cell.verdict === 'warn'
                                ? 'var(--status-warn)'
                                : 'var(--status-pass)';
                          return (
                            <td
                              key={sv}
                              className="px-3 py-2 text-center font-mono"
                              style={{ color: diColor }}
                              title={`n=${cell.n}, taux=${(cell.selection_rate * 100).toFixed(1)}%`}
                            >
                              {diPct}%
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {/* Fairlearn ratios for the pair — informative */}
                {pairDpRatio != null && (
                  <div
                    className="mt-3 flex flex-wrap gap-4 rounded-md border border-border-subtle bg-surface-2 px-4 py-3 text-[12.5px] text-fg-secondary"
                    aria-label="Indicateurs complémentaires de la paire"
                  >
                    <span>
                      <span className="font-medium text-fg">Ratio DP</span>{' '}
                      <span className="font-mono tabular-nums">{pairDpRatio.toFixed(3)}</span>
                    </span>
                    {pairEoRatio != null && (
                      <span>
                        <span className="font-medium text-fg">Ratio EO</span>{' '}
                        <span className="font-mono tabular-nums">{pairEoRatio.toFixed(3)}</span>
                      </span>
                    )}
                    {pairEoddsRatio != null && (
                      <span>
                        <span className="font-medium text-fg">Ratio EOdds</span>{' '}
                        <span className="font-mono tabular-nums">{pairEoddsRatio.toFixed(3)}</span>
                      </span>
                    )}
                    <span className="ml-auto font-mono text-[11px] uppercase tracking-[0.08em] text-fg-muted">
                      informatif
                    </span>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>
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
            <h3 className="text-base font-medium text-fg">Carte des groupes détectés</h3>
            <p className="mt-0.5 text-[13px] text-fg-muted">
              Chaque groupe est positionné selon son taux d&apos;acceptation (axe vertical).
              Les groupes au traitement atypique apparaissent en rouge.
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
                    <span className="text-sm font-medium text-fg">Groupe #{selectedCluster.id}</span>
                    {selectedCluster.is_deviant && <StatusBadge tone="fail">Atypique</StatusBadge>}
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
                        Caractéristiques dominantes
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
                  Cliquez sur un groupe pour voir ses caractéristiques.
                </p>
              )}
            </div>
          </div>
        </Card>

        {/* Feature rank list — shows all clusters sorted by risk */}
        <Card className="overflow-hidden p-0">
          <div className="border-b border-border-subtle px-5 py-4">
            <h3 className="text-base font-medium text-fg">Classement des groupes par risque</h3>
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
        ['Attributs audités', (() => {
          const m1 = audit.metrics && 'marginals' in audit.metrics ? audit.metrics as M1MetricsOut : null;
          return m1?.marginals?.length ? m1.marginals.map((x) => x.attribute).join(', ') : (audit.protected_attribute ?? '—');
        })()],
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
      <main role="status" className="page flex-1 text-fg-secondary">
        Chargement de l&apos;audit…
      </main>
    );
  }

  if (isError || !data) {
    return (
      <main className="page flex-1 text-status-fail">
        Audit introuvable.
      </main>
    );
  }

  if (data.status === 'pending' || data.status === 'running') {
    const moduleKey =
      data.module === 'M2' || data.module === 'M3' ? data.module : 'M1';
    return (
      <>
        <Topbar
          title={data.title || 'Audit en cours'}
          sub={data.code ?? undefined}
          crumbs={[
            { label: 'Audits', href: '/app/audits' },
            { label: data.code ?? data.id },
          ]}
        />
        <main role="status" aria-live="polite">
          <AuditRunningState module={moduleKey} startedAt={data.created_at} />
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
        <main className="page flex-1">
          <div
            role="alert"
            className="rounded-md border border-status-fail-border bg-status-fail-bg p-4 text-sm text-status-fail"
          >
            <strong>L&apos;audit a échoué.</strong>
            <p className="mt-1">
              Une erreur est survenue pendant le calcul. Relancez l&apos;audit ou contactez le
              support si le problème persiste.
            </p>
            {data.error && (
              <details className="mt-2 text-xs">
                <summary className="cursor-pointer select-none">Détail technique</summary>
                <p className="mt-1 font-mono">{data.error}</p>
              </details>
            )}
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

  /* Tab labels */
  const groupsLabel = isM2 ? 'Groupes détectés' : isM3 ? 'Catégories' : 'Groupes';
  const tabs = [
    { id: 'synthese', label: 'Synthèse' },
    { id: 'metriques', label: 'Métriques détaillées' },
    { id: 'groupes', label: groupsLabel },
    { id: 'methodo', label: 'Méthodologie' },
  ] as const;

  return (
    <>
      <Topbar
        title={data.title}
        crumbs={[
          { label: 'AuditIQ' },
          { label: 'Audits', href: '/app/audits' },
          { label: data.code ?? data.id },
        ]}
        sub={
          <StatusBadge tone={VERDICT_TONE[verdict]}>
            {VERDICT_LABELS[verdict]}
          </StatusBadge>
        }
        actions={
          <>
            {m && <DownloadButton auditId={data.id} />}
            <Button asChild variant="primary" size="sm">
              <Link href={`/app/recommandations?auditId=${data.id}`}>
                <Icons.lightbulb size={14} />
                Voir les actions
              </Link>
            </Button>
          </>
        }
      />
      <main className="page flex-1">

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
                  label="Score de risque"
                  caption="Score de risque"
                  className="max-w-[150px]"
                />
              )}
            </div>

            {/* Center: result text — l'interprétation détaillée est dans « En clair » */}
            <div style={{ minWidth: 0 }}>
              <div className="mb-2 font-mono text-[11px] uppercase tracking-[0.12em] text-fg-muted">
                Résultat de l&apos;audit
              </div>
              <h1 className="mb-2 text-2xl font-semibold tracking-[-0.03em] text-fg">
                {data.title}
              </h1>
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
                <span
                  className="inline-flex items-center gap-1.5 rounded-full border border-border-default bg-surface-2 px-2.5 py-1 font-mono text-[12px] text-fg-muted"
                  title={moduleNaming(data.module)?.full ?? data.module}
                >
                  <Icons.flag size={12} />
                  {moduleNaming(data.module)?.short ?? data.module}
                </span>
              </div>
            </div>

            {/* Right: risk level */}
            <div className="flex flex-col items-end gap-2">
              <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-fg-muted">
                Niveau de risque
              </div>
              <StatusBadge tone={verdict}>{VERDICT_LABELS[verdict]}</StatusBadge>
              <div className="mt-1 text-right font-mono text-[11.5px] text-fg-muted">
                Référence
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
