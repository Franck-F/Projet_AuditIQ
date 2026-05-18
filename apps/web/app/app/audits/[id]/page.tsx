'use client';

import * as React from 'react';

import { useParams } from 'next/navigation';

import { Topbar } from '@/components/app/Topbar';
import { Gauge } from '@/components/product/Gauge';
import { StatusBadge, type StatusTone } from '@/components/product/StatusBadge';
import { Button } from '@/components/ui/button';
import { downloadReport, type M1MetricsOut, type M2MetricsOut, type M3MetricsOut, type ReportFormat } from '@/lib/api/audits';
import { useAudit } from '@/lib/query/use-audit';

const VERDICT: Record<'fail' | 'warn' | 'pass', { tone: StatusTone; label: string }> = {
  fail: { tone: 'fail', label: 'Critique' },
  warn: { tone: 'warn', label: 'Vigilance' },
  pass: { tone: 'pass', label: 'Conforme' },
};

type Interp = NonNullable<
  ReturnType<typeof useAudit>['data']
>['interpretation'];

function Interpretation({ interpretation }: { interpretation: Interp }) {
  if (!interpretation) return null;
  return (
    <section className="rounded-2xl border border-border-default bg-surface p-7">
      <h2 className="mb-3 text-[18px] font-medium text-fg">Interprétation</h2>
      <p className="text-sm leading-relaxed text-fg-secondary">
        {interpretation.narrative}
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-fg-muted">
            Ancrages AI Act
          </div>
          <ul className="mt-2 list-disc pl-5 text-sm text-fg-secondary">
            {interpretation.ai_act_anchors.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </div>
        <div>
          <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-fg-muted">
            Limites
          </div>
          <ul className="mt-2 list-disc pl-5 text-sm text-fg-secondary">
            {interpretation.disclaimers.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
        </div>
      </div>
      <p className="mt-4 font-mono text-[11px] text-fg-muted">
        Interprétation : {interpretation.provider} / {interpretation.model}
      </p>
    </section>
  );
}

function M2View({
  metrics,
  verdictLabel,
}: {
  metrics: M2MetricsOut;
  verdictLabel: string;
}) {
  return (
    <div className="flex flex-col gap-4">
      <section className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <div className="flex flex-col items-center rounded-2xl border border-border-default bg-surface p-8">
          <Gauge
            value={metrics.risk_score}
            label="Score de risque"
            caption={`/100 · ${verdictLabel}`}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-border-default bg-surface p-6">
            <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-fg-muted">
              Test du χ² (p-value)
            </div>
            <div className="mt-1 text-2xl font-semibold text-fg">
              {metrics.p_value}
            </div>
            <div className="mt-1 text-xs text-fg-muted">
              χ² = {metrics.chi2} · ddl {metrics.dof}
            </div>
          </div>
          <div className="rounded-2xl border border-border-default bg-surface p-6">
            <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-fg-muted">
              Clusters déviants
            </div>
            <div className="mt-1 text-2xl font-semibold text-fg">
              {metrics.deviant_cluster_ids.length} / {metrics.k}
            </div>
            <div className="mt-1 text-xs text-fg-muted">
              taux favorable moyen : {metrics.global_positive_rate}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border-default bg-surface p-7">
        <h2 className="mb-3 text-[18px] font-medium text-fg">Par cluster</h2>
        <div className="overflow-hidden rounded-md border border-border-default">
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-fg-muted">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Cluster</th>
                <th className="px-4 py-2 text-right font-medium">Effectif</th>
                <th className="px-4 py-2 text-right font-medium">Taux fav.</th>
                <th className="px-4 py-2 text-right font-medium">Écart (pts)</th>
                <th className="px-4 py-2 text-left font-medium">
                  Caractéristiques dominantes
                </th>
              </tr>
            </thead>
            <tbody>
              {metrics.clusters.map((c) => (
                <tr key={c.id} className="border-t border-border-default">
                  <td className="px-4 py-2 text-fg">
                    #{c.id}
                    {c.is_deviant && (
                      <span className="ml-2 rounded bg-status-fail-bg px-1.5 py-0.5 text-[11px] text-status-fail">
                        déviant
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-fg-secondary">
                    {c.n}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-fg-secondary">
                    {c.positive_rate}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-fg-secondary">
                    {c.deviation_pp}
                  </td>
                  <td className="px-4 py-2 text-fg-secondary">
                    {c.top_features.length === 0
                      ? '—'
                      : c.top_features.map((f, i) => (
                          <span key={f.name}>
                            {i > 0 && ', '}
                            <span>{f.name}</span>
                            {' '}
                            <span className="text-fg-muted">
                              ({f.direction === 'above' ? '↑' : '↓'} {f.std_diff})
                            </span>
                          </span>
                        ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function M3View({ metrics }: { metrics: M3MetricsOut }) {
  const vInfo = VERDICT[metrics.verdict];
  return (
    <div className="flex flex-col gap-4">
      <section className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <div className="flex flex-col items-center rounded-2xl border border-border-default bg-surface p-8">
          <Gauge
            value={metrics.risk_score}
            label="Score de risque"
            caption={`/100 · ${vInfo.label}`}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-border-default bg-surface p-6">
            <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-fg-muted">
              Score global
            </div>
            <div className="mt-1 text-2xl font-semibold text-fg">
              {metrics.global_score}
            </div>
            <div className="mt-1 text-xs text-fg-muted">
              Verdict : {metrics.verdict}
            </div>
          </div>
          <div className="rounded-2xl border border-border-default bg-surface p-6">
            <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-fg-muted">
              Couverture
            </div>
            <div className="mt-1 text-2xl font-semibold text-fg">
              {metrics.n_pairs} paires
            </div>
            <div className="mt-1 text-xs text-fg-muted">
              {metrics.n_calls_failed} appel(s) en échec
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border-default bg-surface p-7">
        <h2 className="mb-3 text-[18px] font-medium text-fg">Par catégorie</h2>
        <div className="overflow-hidden rounded-md border border-border-default">
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-fg-muted">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Catégorie</th>
                <th className="px-4 py-2 text-right font-medium">Écart longueur</th>
                <th className="px-4 py-2 text-right font-medium">Écart sentiment</th>
                <th className="px-4 py-2 text-right font-medium">Taux de refus</th>
                <th className="px-4 py-2 text-right font-medium">Score</th>
                <th className="px-4 py-2 text-left font-medium">Verdict</th>
              </tr>
            </thead>
            <tbody>
              {metrics.categories.map((c) => (
                <tr key={c.name} className="border-t border-border-default">
                  <td className="px-4 py-2 text-fg">{c.name}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-fg-secondary">{c.length_gap}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-fg-secondary">{c.sentiment_gap}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-fg-secondary">{c.refusal_rate}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-fg-secondary">{c.score}</td>
                  <td className="px-4 py-2 text-fg-secondary">{c.verdict}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {metrics.divergent_examples.length > 0 && (
        <section className="rounded-2xl border border-border-default bg-surface p-7">
          <h2 className="mb-3 text-[18px] font-medium text-fg">Exemples divergents</h2>
          <div className="overflow-hidden rounded-md border border-border-default">
            <table className="w-full text-sm">
              <thead className="bg-surface-2 text-fg-muted">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Catégorie</th>
                  <th className="px-4 py-2 text-left font-medium">Raison</th>
                  <th className="px-4 py-2 text-left font-medium">Réponse A</th>
                  <th className="px-4 py-2 text-left font-medium">Réponse B</th>
                </tr>
              </thead>
              <tbody>
                {metrics.divergent_examples.map((d) => (
                  <tr key={d.prompt_id} className="border-t border-border-default">
                    <td className="px-4 py-2 text-fg">{d.category}</td>
                    <td className="px-4 py-2 text-fg-secondary">{d.reason}</td>
                    <td className="px-4 py-2 text-fg-secondary">{d.excerpt_a}</td>
                    <td className="px-4 py-2 text-fg-secondary">{d.excerpt_b}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {metrics.warnings.length > 0 && (
        <ul className="mt-2 rounded-md border border-status-warn-border bg-status-warn-bg p-3 text-sm text-status-warn">
          {metrics.warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ReportActions({ auditId }: { auditId: string }) {
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
          ? "Le rapport PDF est momentanément indisponible. Le rapport Excel reste disponible."
          : "Le téléchargement du rapport a échoué.",
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

export default function AuditResultPage() {
  const params = useParams<{ id: string }>();
  const id = typeof params?.id === 'string' ? params.id : '';
  const { data, isLoading, isError } = useAudit(id);

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

  const m = data.metrics;
  const v = m ? VERDICT[m.verdict] : null;
  const isM3 = data.module === 'M3' && m !== null;
  const isM2 = m !== null && 'clusters' in m;
  const m1 = (!isM3 && !isM2 && m !== null && 'groups' in m) ? (m as M1MetricsOut) : null;

  return (
    <>
      <Topbar
        crumbs={[
          { label: 'Audits', href: '/app/audits' },
          { label: data.code ?? data.id },
        ]}
      />
      <main className="flex-1 px-8 py-8">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-fg">
              {data.title}
            </h1>
            <p className="mt-1 font-mono text-xs text-fg-muted">
              {data.code ?? data.id} · {data.module} · {data.status}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {v && <StatusBadge tone={v.tone}>{v.label}</StatusBadge>}
            {m && <ReportActions auditId={data.id} />}
          </div>
        </header>

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

        {!m ? (
          <p className="text-sm text-fg-secondary">
            Résultats indisponibles pour cet audit.
          </p>
        ) : isM3 ? (
          <M3View metrics={m as M3MetricsOut} />
        ) : isM2 ? (
          <M2View metrics={m as M2MetricsOut} verdictLabel={v?.label ?? ''} />
        ) : m1 ? (
          <div className="flex flex-col gap-4">
            <section className="grid gap-4 lg:grid-cols-[320px_1fr]">
              <div className="flex flex-col items-center rounded-2xl border border-border-default bg-surface p-8">
                <Gauge
                  value={m1.risk_score}
                  label="Score de risque"
                  caption={`/100 · ${v?.label ?? ''}`}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-border-default bg-surface p-6">
                  <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-fg-muted">
                    Disparate Impact
                  </div>
                  <div className="mt-1 text-2xl font-semibold text-fg">
                    {m1.disparate_impact}
                  </div>
                  <div className="mt-1 text-xs text-fg-muted">
                    règle des 4/5 ; pire groupe : « {m1.worst_group} »
                  </div>
                </div>
                <div className="rounded-2xl border border-border-default bg-surface p-6">
                  <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-fg-muted">
                    Demographic Parity
                  </div>
                  <div className="mt-1 text-2xl font-semibold text-fg">
                    {m1.demographic_parity_diff}
                  </div>
                  <div className="mt-1 text-xs text-fg-muted">
                    référence : « {m1.reference_value} »
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-border-default bg-surface p-7">
              <h2 className="mb-3 text-[18px] font-medium text-fg">Par groupe</h2>
              <div className="overflow-hidden rounded-md border border-border-default">
                <table className="w-full text-sm">
                  <thead className="bg-surface-2 text-fg-muted">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium">Groupe</th>
                      <th className="px-4 py-2 text-right font-medium">Effectif</th>
                      <th className="px-4 py-2 text-right font-medium">
                        Taux favorable
                      </th>
                      <th className="px-4 py-2 text-right font-medium">DI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {m1.groups.map((g) => (
                      <tr key={g.value} className="border-t border-border-default">
                        <td className="px-4 py-2 text-fg">{g.value}</td>
                        <td className="px-4 py-2 text-right tabular-nums text-fg-secondary">
                          {g.n}
                        </td>
                        <td className="px-4 py-2 text-right tabular-nums text-fg-secondary">
                          {g.selection_rate}
                        </td>
                        <td className="px-4 py-2 text-right tabular-nums text-fg-secondary">
                          {g.disparate_impact}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {(m1.equal_opportunity_diff != null || m1.truelabel_reason != null) && (
              <section className="rounded-2xl border border-border-default bg-surface p-7">
                <h2 className="mb-3 text-[18px] font-medium text-fg">
                  Equal Opportunity &amp; Equalized Odds
                </h2>

                {m1.equal_opportunity_diff != null && (
                  <div className="overflow-hidden rounded-md border border-border-default">
                    <table className="w-full text-sm">
                      <thead className="bg-surface-2 text-fg-muted">
                        <tr>
                          <th className="px-4 py-2 text-left font-medium">Groupe</th>
                          <th className="px-4 py-2 text-right font-medium">TPR</th>
                          <th className="px-4 py-2 text-right font-medium">FPR</th>
                        </tr>
                      </thead>
                      <tbody>
                        {m1.groups.map((g) => (
                          <tr key={g.value} className="border-t border-border-default">
                            <td className="px-4 py-2 text-fg">{g.value}</td>
                            <td className="px-4 py-2 text-right tabular-nums text-fg-secondary">
                              {g.tpr != null ? g.tpr : '—'}
                            </td>
                            <td className="px-4 py-2 text-right tabular-nums text-fg-secondary">
                              {g.fpr != null ? g.fpr : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-border-default bg-surface-2 p-4">
                    <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-fg-muted">
                      Demographic Parity (écart)
                    </div>
                    <div className="mt-1 text-xl font-semibold text-fg">
                      {m1.demographic_parity_diff}
                    </div>
                    {m1.demographic_parity_verdict && (
                      <div className="mt-2">
                        <StatusBadge tone={m1.demographic_parity_verdict as StatusTone}>
                          {VERDICT[m1.demographic_parity_verdict].label}
                        </StatusBadge>
                      </div>
                    )}
                  </div>
                  <div className="rounded-xl border border-border-default bg-surface-2 p-4">
                    <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-fg-muted">
                      Equal Opportunity (écart TPR)
                    </div>
                    <div className="mt-1 text-xl font-semibold text-fg">
                      {m1.equal_opportunity_diff != null ? m1.equal_opportunity_diff : '—'}
                    </div>
                    {m1.equal_opportunity_verdict && (
                      <div className="mt-2">
                        <StatusBadge tone={m1.equal_opportunity_verdict as StatusTone}>
                          {VERDICT[m1.equal_opportunity_verdict].label}
                        </StatusBadge>
                      </div>
                    )}
                  </div>
                  <div className="rounded-xl border border-border-default bg-surface-2 p-4">
                    <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-fg-muted">
                      Equalized Odds (écart max)
                    </div>
                    <div className="mt-1 text-xl font-semibold text-fg">
                      {m1.equalized_odds_diff != null ? m1.equalized_odds_diff : '—'}
                    </div>
                    {m1.equalized_odds_verdict && (
                      <div className="mt-2">
                        <StatusBadge tone={m1.equalized_odds_verdict as StatusTone}>
                          {VERDICT[m1.equalized_odds_verdict].label}
                        </StatusBadge>
                      </div>
                    )}
                  </div>
                </div>

                <p className="mt-4 rounded-md border border-border-default bg-surface-2 px-4 py-3 text-sm text-fg-secondary">
                  DP/EO/EOdds ne peuvent être satisfaits simultanément — choix normatif
                </p>

                {m1.truelabel_reason && (
                  <p className="mt-3 text-sm text-fg-muted">
                    {m1.truelabel_reason}
                  </p>
                )}
              </section>
            )}
          </div>
        ) : null}

        {data.interpretation && (
          <div className="mt-4">
            <Interpretation interpretation={data.interpretation} />
          </div>
        )}
      </main>
    </>
  );
}
