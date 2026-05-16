'use client';

import { useParams } from 'next/navigation';

import { Topbar } from '@/components/app/Topbar';
import { Gauge } from '@/components/product/Gauge';
import { StatusBadge, type StatusTone } from '@/components/product/StatusBadge';
import { useAudit } from '@/lib/query/use-audit';
import type { M1MetricsOut } from '@/lib/api/audits';

const VERDICT: Record<'fail' | 'warn' | 'pass', { tone: StatusTone; label: string }> = {
  fail: { tone: 'fail', label: 'Critique' },
  warn: { tone: 'warn', label: 'Vigilance' },
  pass: { tone: 'pass', label: 'Conforme' },
};

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
  const isM1 = (metrics: typeof m): metrics is M1MetricsOut =>
    metrics !== null && 'groups' in metrics;
  const v = m ? VERDICT[m.verdict] : null;

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
          {v && <StatusBadge tone={v.tone}>{v.label}</StatusBadge>}
        </header>

        {!m ? (
          <p className="text-sm text-fg-secondary">
            Résultats indisponibles pour cet audit.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            <section className="grid gap-4 lg:grid-cols-[320px_1fr]">
              <div className="flex flex-col items-center rounded-2xl border border-border-default bg-surface p-8">
                <Gauge
                  value={m.risk_score}
                  label="Score de risque"
                  caption={`/100 · ${v?.label ?? ''}`}
                />
              </div>
              {isM1(m) && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-border-default bg-surface p-6">
                  <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-fg-muted">
                    Disparate Impact
                  </div>
                  <div className="mt-1 text-2xl font-semibold text-fg">
                    {m.disparate_impact}
                  </div>
                  <div className="mt-1 text-xs text-fg-muted">
                    règle des 4/5 ; pire groupe : « {m.worst_group} »
                  </div>
                </div>
                <div className="rounded-2xl border border-border-default bg-surface p-6">
                  <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-fg-muted">
                    Demographic Parity
                  </div>
                  <div className="mt-1 text-2xl font-semibold text-fg">
                    {m.demographic_parity_diff}
                  </div>
                  <div className="mt-1 text-xs text-fg-muted">
                    référence : « {m.reference_value} »
                  </div>
                </div>
              </div>
              )}
            </section>

            {isM1(m) && (
            <section className="rounded-2xl border border-border-default bg-surface p-7">
              <h2 className="mb-3 text-[18px] font-medium text-fg">
                Par groupe
              </h2>
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
                    {m.groups.map((g) => (
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
            )}

            {data.interpretation && (
              <section className="rounded-2xl border border-border-default bg-surface p-7">
                <h2 className="mb-3 text-[18px] font-medium text-fg">
                  Interprétation
                </h2>
                <p className="text-sm leading-relaxed text-fg-secondary">
                  {data.interpretation.narrative}
                </p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-fg-muted">
                      Ancrages AI Act
                    </div>
                    <ul className="mt-2 list-disc pl-5 text-sm text-fg-secondary">
                      {data.interpretation.ai_act_anchors.map((a) => (
                        <li key={a}>{a}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-fg-muted">
                      Limites
                    </div>
                    <ul className="mt-2 list-disc pl-5 text-sm text-fg-secondary">
                      {data.interpretation.disclaimers.map((d) => (
                        <li key={d}>{d}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                <p className="mt-4 font-mono text-[11px] text-fg-muted">
                  Interprétation : {data.interpretation.provider} /{' '}
                  {data.interpretation.model}
                </p>
              </section>
            )}
          </div>
        )}
      </main>
    </>
  );
}
