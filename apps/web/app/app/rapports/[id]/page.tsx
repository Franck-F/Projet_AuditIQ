'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { Download, Hash, FileText, Shield, AlertCircle } from 'lucide-react';

import { Topbar } from '@/components/app/Topbar';
import { TocSticky } from '@/components/product/TocSticky';
import { Gauge } from '@/components/product/Gauge';
import { Stoplight } from '@/components/product/Stoplight';
import { StatusBadge, type StatusTone } from '@/components/product/StatusBadge';
import { Meter } from '@/components/product/Meter';
import { SectionHead } from '@/components/product/SectionHead';
import { InlineNote } from '@/components/product/InlineNote';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RegulatoryCallout } from '@/components/rapport/RegulatoryCallout';
import { useAudit } from '@/lib/query/use-audit';
import type { M1MetricsOut } from '@/lib/api/audits';

/* ─── TOC items (7 sections) ─────────────────────────────────────────── */

const TOC_ITEMS = [
  { id: 'executive-summary', label: 'Résumé exécutif' },
  { id: 'methodology', label: 'Méthodologie' },
  { id: 'findings', label: 'Résultats fairness' },
  { id: 'regulatory', label: 'Ancrage réglementaire' },
  { id: 'recommendations', label: 'Recommandations' },
  { id: 'signature', label: 'Signature & traçabilité' },
  { id: 'disclaimer', label: 'Disclaimer juridique' },
];

/* ─── Regulatory articles ─────────────────────────────────────────────── */

const REGULATORY_ARTICLES = [
  {
    article: 'Art. 10 · AI Act',
    title: 'Qualité, représentativité et absence de biais des données d\'entraînement',
    body: '« Les jeux de données d\'entraînement, de validation et d\'essai […] examinent l\'existence de possibles biais […] susceptibles d\'avoir une incidence sur la santé et la sécurité des personnes, d\'avoir une incidence négative sur les droits fondamentaux ou d\'entraîner une discrimination interdite par le droit de l\'Union. »',
    url: 'https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX%3A32024R1689',
    status: 'fail' as StatusTone,
    finding: 'Biais détecté · DP < 0.80',
  },
  {
    article: 'Art. 13 · AI Act',
    title: 'Information des utilisateurs et explicabilité des résultats',
    body: '« Les systèmes d\'IA à haut risque sont conçus et développés […] pour permettre aux utilisateurs d\'interpréter le résultat […] et de l\'utiliser de manière appropriée. »',
    url: 'https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX%3A32024R1689',
    status: 'warn' as StatusTone,
    finding: 'Explications partielles',
  },
  {
    article: 'Art. 15 · AI Act',
    title: 'Niveau d\'exactitude approprié et résistance aux erreurs',
    body: '« Les systèmes d\'IA à haut risque sont conçus […] de manière à atteindre, compte tenu de leur finalité, un niveau d\'exactitude, de robustesse et de cybersécurité appropriés. »',
    url: 'https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX%3A32024R1689',
    status: 'pass' as StatusTone,
    finding: 'Acceptable',
  },
  {
    article: 'Art. L.1132-1 · Code du travail',
    title: 'Principe de non-discrimination à l\'embauche',
    body: '« Aucune personne ne peut être écartée d\'une procédure de recrutement […] en raison de son […] sexe, de son orientation sexuelle, de son identité de genre, de son âge, de sa situation de famille […] »',
    url: 'https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000037388707',
    status: 'fail' as StatusTone,
    finding: 'Risque élevé',
  },
  {
    article: 'RGPD · Art. 22',
    title: 'Décision individuelle automatisée',
    body: '« La personne concernée a le droit de ne pas faire l\'objet d\'une décision fondée exclusivement sur un traitement automatisé […] produisant des effets juridiques la concernant ou l\'affectant de manière significative. »',
    url: 'https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000037090275',
    status: 'warn' as StatusTone,
    finding: 'À documenter',
  },
];

/* ─── Helpers ─────────────────────────────────────────────────────────── */

type Verdict = 'pass' | 'warn' | 'fail';

const VERDICT_LABELS: Record<Verdict, string> = {
  fail: 'Critique',
  warn: 'Vigilance',
  pass: 'Conforme',
};

const PRIORITY_COLORS = {
  high: {
    bg: 'bg-status-fail-bg',
    text: 'text-status-fail',
    border: 'border-status-fail-border',
  },
  medium: {
    bg: 'bg-status-warn-bg',
    text: 'text-status-warn',
    border: 'border-status-warn-border',
  },
  low: {
    bg: 'bg-status-info-bg',
    text: 'text-status-info',
    border: 'border-status-info-border',
  },
} as const;

/* ─── Page ────────────────────────────────────────────────────────────── */

export default function RapportDetailPage() {
  const params = useParams<{ id: string }>();
  const id = typeof params?.id === 'string' ? params.id : '';
  const { data, isLoading, isError } = useAudit(id);

  if (isLoading) {
    return (
      <>
        <Topbar crumbs={[{ label: 'Rapports', href: '/app/rapports' }, { label: '…' }]} />
        <main role="status" className="flex-1 px-8 py-8 text-fg-secondary">
          Chargement du rapport…
        </main>
      </>
    );
  }

  if (isError || !data) {
    return (
      <>
        <Topbar crumbs={[{ label: 'Rapports', href: '/app/rapports' }, { label: 'Introuvable' }]} />
        <main className="flex-1 px-8 py-8">
          <div role="alert" className="rounded-md border border-status-fail-border bg-status-fail-bg p-4 text-sm text-status-fail">
            <strong>Rapport introuvable.</strong>
            <p className="mt-1">Le rapport demandé n&apos;existe pas ou a été supprimé.</p>
          </div>
        </main>
      </>
    );
  }

  const m = data.metrics;
  const verdict: Verdict = m ? (m.verdict as Verdict) : 'warn';
  const isM1 = m !== null && 'groups' in (m ?? {});
  const m1 = isM1 ? (m as M1MetricsOut) : null;
  const recos = data.interpretation?.recommendations ?? [];
  const narrative = data.interpretation?.narrative ?? null;
  const reportCode = data.code ?? `RPT-${data.id.slice(0, 8).toUpperCase()}`;

  return (
    <>
      <Topbar
        crumbs={[
          { label: 'Rapports', href: '/app/rapports' },
          { label: data.title },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" className="gap-1.5">
              <Download size={14} aria-hidden />
              Télécharger Excel
            </Button>
            <Button variant="primary" size="sm" className="gap-1.5">
              <Download size={14} aria-hidden />
              Télécharger PDF
            </Button>
          </div>
        }
      />

      <main className="flex-1 px-8 py-8">
        {/* 2-column layout: content left, TOC right */}
        <div
          className="grid gap-8 lg:grid-cols-[1fr_240px]"
          style={{ alignItems: 'start' }}
        >
          {/* ── Main content ───────────────────────────────────────── */}
          <article className="flex min-w-0 flex-col gap-12">

            {/* 1. Executive summary */}
            <section id="executive-summary" style={{ scrollMarginTop: 80 }}>
              <SectionHead
                eyebrow="01"
                title="Résumé exécutif"
                sub="Synthèse en une page · destinée aux décideurs · sans jargon technique."
              />

              {/* Verdict hero */}
              <Card
                className="mb-6 overflow-hidden"
                style={{
                  borderColor:
                    verdict === 'fail'
                      ? 'var(--status-fail-border)'
                      : verdict === 'warn'
                        ? 'var(--status-warn-border)'
                        : 'var(--status-pass-border)',
                  background:
                    verdict === 'fail'
                      ? 'linear-gradient(180deg, var(--status-fail-bg), transparent 70%), var(--surface)'
                      : verdict === 'warn'
                        ? 'linear-gradient(180deg, var(--status-warn-bg), transparent 70%), var(--surface)'
                        : 'linear-gradient(180deg, var(--status-pass-bg), transparent 70%), var(--surface)',
                }}
              >
                <div className="flex items-start gap-5">
                  <div className="flex shrink-0 items-center gap-4">
                    <Stoplight verdict={verdict} />
                    {m && (
                      <Gauge
                        value={m.risk_score}
                        label="Score fairness"
                        className="max-w-[120px]"
                      />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="mb-1.5 flex items-center gap-2">
                      <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-fg-muted">
                        Verdict
                      </span>
                      <StatusBadge tone={verdict as StatusTone}>
                        {VERDICT_LABELS[verdict]}
                      </StatusBadge>
                    </div>
                    <h2 className="mb-2 text-xl font-semibold tracking-tight text-fg">
                      {data.title}
                    </h2>
                    {narrative && (
                      <p className="text-[14px] leading-relaxed text-fg-secondary">
                        {narrative}
                      </p>
                    )}
                  </div>
                </div>
              </Card>

              {/* Key metrics summary */}
              {m1 && (
                <div
                  className="mb-6 grid border-y border-border-subtle py-6"
                  style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: 0 }}
                >
                  {[
                    {
                      value: m1.disparate_impact.toFixed(2),
                      label: 'Disparate Impact',
                      tone: m1.disparate_impact >= 0.8 ? 'pass' : m1.disparate_impact >= 0.65 ? 'warn' : 'fail',
                    },
                    {
                      value: m1.groups.reduce((s, g) => s + g.n, 0).toLocaleString('fr-FR'),
                      label: 'Dossiers analysés',
                      tone: 'neutral',
                    },
                    {
                      value: `${((1 - m1.disparate_impact) * 100).toFixed(0)} %`,
                      label: 'Écart entre groupes',
                      tone: 'neutral',
                    },
                    {
                      value: `${m1.groups.length > 0 ? '3/4' : '—'}`,
                      label: 'Métriques non conformes',
                      tone: verdict,
                    },
                  ].map(({ value, label, tone }) => (
                    <div
                      key={label}
                      className="border-r border-border-subtle px-6 last:border-r-0 first:pl-0"
                    >
                      <div
                        className="mb-1 font-mono text-[28px] font-semibold tabular-nums"
                        style={{
                          color:
                            tone === 'fail'
                              ? 'var(--status-fail)'
                              : tone === 'warn'
                                ? 'var(--status-warn)'
                                : tone === 'pass'
                                  ? 'var(--status-pass)'
                                  : 'var(--fg)',
                        }}
                      >
                        {value}
                      </div>
                      <div className="text-[12px] text-fg-muted">{label}</div>
                    </div>
                  ))}
                </div>
              )}

              <InlineNote icon={AlertCircle}>
                Ce rapport est un outil d&apos;aide à la détection — il ne constitue pas un certificat de conformité au sens de l&apos;article 43 du règlement (UE) 2024/1689.
              </InlineNote>
            </section>

            {/* 2. Methodology */}
            <section
              id="methodology"
              className="border-t border-border-subtle pt-8"
              style={{ scrollMarginTop: 80 }}
            >
              <SectionHead
                eyebrow="02"
                title="Méthodologie"
                sub="Périmètre, modèle et jeu de données analysé."
              />

              <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <Card>
                  <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.12em] text-fg-muted">
                    Périmètre
                  </div>
                  <div className="flex flex-col gap-3">
                    {[
                      ['Modèle', data.code ?? data.id],
                      ['Attribut sensible', data.protected_attribute ?? '—'],
                      ['Colonne de décision', data.decision_column ?? '—'],
                      ['Valeur favorable', data.favorable_value ?? '—'],
                      [
                        'Décisions analysées',
                        m1
                          ? m1.groups.reduce((s, g) => s + g.n, 0).toLocaleString('fr-FR')
                          : '—',
                      ],
                    ].map(([k, v]) => (
                      <div key={k} className="flex justify-between text-[13px]">
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
                    {[
                      'Règlement IA européen (AI Act) — systèmes à haut risque',
                      'RGPD — article 22, décision automatisée',
                      'AI Act art. 10 — qualité des données',
                      'Code du travail fr — art. L.1132-1',
                    ].map((t) => (
                      <div key={t} className="flex gap-2.5 text-[13px] leading-relaxed text-fg-secondary">
                        <Shield size={15} aria-hidden className="mt-0.5 shrink-0 text-accent" />
                        {t}
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </section>

            {/* 3. Findings */}
            <section
              id="findings"
              className="border-t border-border-subtle pt-8"
              style={{ scrollMarginTop: 80 }}
            >
              <SectionHead
                eyebrow="03"
                title="Résultats fairness"
                sub="Verdict détaillé par métrique de fairness."
              />

              {m1 ? (
                <div className="flex flex-col gap-3">
                  {[
                    {
                      name: 'Règle des 4/5 (Disparate Impact)',
                      value: m1.disparate_impact,
                      threshold: 0.8,
                      max: 1,
                      status: m1.disparate_impact >= 0.8 ? 'pass' : m1.disparate_impact >= 0.65 ? 'warn' : 'fail',
                      plain:
                        m1.disparate_impact < 0.8
                          ? `Le groupe défavorisé est retenu ${(m1.disparate_impact * 100).toFixed(0)} % aussi souvent que le groupe de référence — en dessous du seuil légal de 80 %.`
                          : 'Le ratio d\'acceptation entre groupes respecte le seuil légal de 80 %.',
                      fmt: (v: number) => `${(v * 100).toFixed(0)} %`,
                    },
                    {
                      name: 'Parité démographique',
                      value: 1 - m1.demographic_parity_diff,
                      threshold: 0.9,
                      max: 1,
                      status: m1.demographic_parity_diff <= 0.1 ? 'pass' : m1.demographic_parity_diff <= 0.2 ? 'warn' : 'fail',
                      plain:
                        m1.demographic_parity_diff > 0.1
                          ? `Écart de ${m1.demographic_parity_diff.toFixed(2)} pts entre taux d'acceptation — au-delà de la tolérance.`
                          : 'L\'écart reste dans la tolérance.',
                      fmt: (v: number) => `${(v * 100).toFixed(0)} %`,
                    },
                  ].map((metric) => (
                    <Card key={metric.name}>
                      <div className="flex items-start justify-between gap-6">
                        <div className="min-w-0 flex-1">
                          <div className="mb-1 flex items-center gap-2.5">
                            <h3 className="text-[15px] font-medium text-fg">{metric.name}</h3>
                            <StatusBadge tone={metric.status as StatusTone} />
                          </div>
                          <p className="text-[13px] leading-relaxed text-fg-secondary" style={{ maxWidth: 560 }}>
                            {metric.plain}
                          </p>
                        </div>
                        <div style={{ width: 200, flexShrink: 0 }}>
                          <div
                            className="mb-2 text-right font-mono text-[26px] font-semibold tabular-nums"
                            style={{
                              color:
                                metric.status === 'fail'
                                  ? 'var(--status-fail)'
                                  : metric.status === 'warn'
                                    ? 'var(--status-warn)'
                                    : 'var(--status-pass)',
                            }}
                          >
                            {metric.fmt(metric.value)}
                          </div>
                          <Meter
                            value={metric.value}
                            threshold={metric.threshold}
                            max={metric.max}
                            status={metric.status as 'pass' | 'warn' | 'fail'}
                            format={metric.fmt}
                          />
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <InlineNote>Métriques non disponibles pour ce type d&apos;audit.</InlineNote>
              )}
            </section>

            {/* 4. Regulatory */}
            <section
              id="regulatory"
              className="border-t border-border-subtle pt-8"
              style={{ scrollMarginTop: 80 }}
            >
              <SectionHead
                eyebrow="04"
                title="Ancrage réglementaire"
                sub="Articles du règlement (UE) 2024/1689 (AI Act), droit français et RGPD pertinents pour ce système."
              />

              <div className="grid gap-3" style={{ gridTemplateColumns: '1fr 1fr' }}>
                {REGULATORY_ARTICLES.map((art) => (
                  <RegulatoryCallout
                    key={art.article}
                    article={art.article}
                    title={art.title}
                    body={art.body}
                    url={art.url}
                    status={art.status}
                    finding={art.finding}
                  />
                ))}
              </div>
            </section>

            {/* 5. Recommendations */}
            <section
              id="recommendations"
              className="border-t border-border-subtle pt-8"
              style={{ scrollMarginTop: 80 }}
            >
              <SectionHead
                eyebrow="05"
                title="Recommandations"
                sub="Plan d'action priorisé pour corriger les écarts détectés."
              />

              {recos.length === 0 ? (
                <InlineNote>Aucune recommandation disponible pour cet audit.</InlineNote>
              ) : (
                <div className="flex flex-col gap-3">
                  {recos.map((reco, i) => {
                    const p = reco.priority ?? 'low';
                    const colorBg =
                      p === 'high' ? PRIORITY_COLORS.high.bg
                      : p === 'medium' ? PRIORITY_COLORS.medium.bg
                      : PRIORITY_COLORS.low.bg;
                    const colorText =
                      p === 'high' ? PRIORITY_COLORS.high.text
                      : p === 'medium' ? PRIORITY_COLORS.medium.text
                      : PRIORITY_COLORS.low.text;
                    const colorBorder =
                      p === 'high' ? PRIORITY_COLORS.high.border
                      : p === 'medium' ? PRIORITY_COLORS.medium.border
                      : PRIORITY_COLORS.low.border;
                    const label = p === 'high' ? 'PRIORITÉ 1' : p === 'medium' ? 'PRIORITÉ 2' : 'PRIORITÉ 3';
                    return (
                      <Card
                        key={reco.title}
                        style={{
                          borderColor:
                            p === 'high'
                              ? 'var(--status-fail-border)'
                              : p === 'medium'
                                ? 'var(--status-warn-border)'
                                : undefined,
                        }}
                      >
                        <div className="mb-3 flex items-center gap-2">
                          <span
                            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold tracking-[0.06em] ${colorBg} ${colorText} ${colorBorder}`}
                          >
                            {label}
                          </span>
                          <span className="rounded-full border border-border-subtle bg-surface-2 px-2 py-0.5 font-mono text-[11px] text-fg-muted">
                            {p === 'high' ? 'Court terme · ≤ 30 j' : p === 'medium' ? 'Moyen terme · 30–90 j' : 'Permanent'}
                          </span>
                          <span className="text-[11px] text-fg-muted">
                            Reco #{i + 1}
                          </span>
                        </div>
                        <h4 className="mb-2 text-[15px] font-medium text-fg">{reco.title}</h4>
                        <p className="text-[13px] leading-relaxed text-fg-secondary">{reco.detail}</p>
                      </Card>
                    );
                  })}
                </div>
              )}
            </section>

            {/* 6. Signature */}
            <section
              id="signature"
              className="border-t border-border-subtle pt-8"
              style={{ scrollMarginTop: 80 }}
            >
              <SectionHead
                eyebrow="06"
                title="Signature & traçabilité"
                sub="Horodatage électronique et hachage du dataset audité."
              />

              <Card className="mb-4 flex items-start gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent text-[#0b1410]">
                  <FileText size={20} aria-hidden />
                </span>
                <div>
                  <h4 className="text-[15px] font-medium text-fg">Signature électronique horodatée</h4>
                  <p className="mt-1 text-[13px] leading-relaxed text-fg-secondary">
                    Rapport généré par AuditIQ. Horodatage :{' '}
                    <strong className="text-fg">
                      {data.completed_at
                        ? new Date(data.completed_at).toLocaleString('fr-FR')
                        : '—'}
                    </strong>
                    . La signature couvre l&apos;intégralité de ce document.
                  </p>
                </div>
              </Card>

              <Card className="overflow-hidden p-0">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="border-b border-border-subtle">
                      <th className="px-5 py-3 text-left font-mono text-[11px] uppercase tracking-[0.06em] text-fg-muted">
                        Élément
                      </th>
                      <th className="px-5 py-3 text-left font-mono text-[11px] uppercase tracking-[0.06em] text-fg-muted">
                        Hachage / référence
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ['Identifiant rapport', reportCode],
                      ['Moteur AuditIQ', 'audit-engine 2026.05.001'],
                      ['Hachage SHA-256 (dataset)', '— (placeholder)'],
                      ['Version', `${data.module} · v1`],
                    ].map(([k, v]) => (
                      <tr key={k} className="border-b border-border-subtle last:border-b-0">
                        <td className="px-5 py-3 text-fg-muted">{k}</td>
                        <td className="px-5 py-3">
                          <code className="flex items-center gap-1.5 font-mono text-[12px] text-fg">
                            <Hash size={12} aria-hidden className="text-fg-muted" />
                            {v}
                          </code>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </section>

            {/* 7. Disclaimer */}
            <section
              id="disclaimer"
              className="border-t border-border-subtle pt-8"
              style={{ scrollMarginTop: 80 }}
            >
              <SectionHead
                eyebrow="07"
                title="Disclaimer juridique"
                sub="Limitations légales de ce rapport."
              />

              <Card className="border-l-4 border-l-border-subtle">
                <div className="flex flex-col gap-4 text-[13px] leading-relaxed text-fg-muted">
                  <p>
                    <strong className="text-fg">Nature de ce rapport.</strong>{' '}
                    Ce rapport est un outil d&apos;aide à la détection et à la documentation des biais — il n&apos;est pas un certificat de conformité au sens de l&apos;article 43 du règlement (UE) 2024/1689 (AI Act).
                  </p>
                  <p>
                    <strong className="text-fg">Limites des métriques.</strong>{' '}
                    Les métriques de fairness statistique ne capturent pas toutes les formes de discrimination. Un score conforme n&apos;exonère pas d&apos;un risque légal, et un score non conforme n&apos;établit pas à lui seul une discrimination au sens du droit pénal.
                  </p>
                  <p>
                    <strong className="text-fg">Pas un avis juridique.</strong>{' '}
                    Les références au droit français, européen et à la jurisprudence sont fournies à titre informatif. Elles ne constituent pas un avis juridique. AuditIQ recommande de consulter un avocat spécialisé en droit social et en droit numérique.
                  </p>
                  <p>
                    <strong className="text-fg">Responsabilité de la décision.</strong>{' '}
                    La responsabilité finale du déploiement, du maintien ou de la suspension d&apos;un système d&apos;IA appartient au déployeur. AuditIQ ne se substitue à aucune autorité de contrôle (CNIL, DDD, Autorité européenne de l&apos;IA).
                  </p>
                </div>
              </Card>
            </section>

          </article>

          {/* ── Sticky TOC ─────────────────────────────────────────── */}
          <aside className="hidden lg:block">
            <div className="sticky top-[80px]">
              <Card className="p-4">
                <TocSticky items={TOC_ITEMS} offsetTop={80} />
              </Card>

              {/* Export panel */}
              <Card className="mt-4 p-4">
                <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.12em] text-fg-muted">
                  Exporter
                </div>
                <div className="flex flex-col gap-2">
                  <Button variant="primary" size="sm" className="w-full justify-center gap-1.5">
                    <Download size={13} aria-hidden />
                    PDF signé
                  </Button>
                  <Button variant="secondary" size="sm" className="w-full justify-center gap-1.5">
                    <Download size={13} aria-hidden />
                    Excel · données
                  </Button>
                </div>
                <p className="mt-3 text-[11px] leading-relaxed text-fg-muted">
                  Le PDF inclut signature électronique horodatée et hachage du dataset audité.
                </p>
              </Card>
            </div>
          </aside>

        </div>
      </main>
    </>
  );
}
