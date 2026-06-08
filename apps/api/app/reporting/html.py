"""Pure HTML compliance report: build_report_html(AuditOut) -> str.

No I/O. The HTML is rendered to PDF by the apps/pdf microservice.
"""
from __future__ import annotations

from html import escape

from app.schemas.audit import AuditOut, M1MetricsOut, M2MetricsOut, M3MetricsOut, RecommendationOut

_VERDICT_FR = {
    "fail": ("Critique", "#b42318"),
    "warn": ("Vigilance", "#b54708"),
    "pass": ("Conforme", "#067647"),
}
_NOT_A_CERTIFICATE = (
    "Ce rapport est une aide à l'analyse documentée : il n'est pas un "
    "certificat de conformité ni un avis juridique."
)
_FR_LAW = (
    "Références droit français : Code du travail L.1132-1 ; Défenseur des "
    "droits ; CNIL ; ACPR (selon le contexte d'usage)."
)
_PRIORITY_LABEL_FR = {
    "high": "Action prioritaire",
    "medium": "À planifier",
    "low": "Maintien / veille",
}

_AI_ACT = [
    ("Article 9 — gestion des risques", "Risque agrégé / verdict"),
    ("Article 10 — qualité des données", "Pré-vérifications / groupes"),
    ("Article 11 — documentation technique", "Ce rapport (trace documentée)"),
]


def _e(v: object) -> str:
    return escape(str(v))


def _rows(pairs: list[tuple[str, object]]) -> str:
    return "".join(
        f"<tr><th>{_e(k)}</th><td>{_e(v)}</td></tr>" for k, v in pairs
    )


def _detail(audit: AuditOut) -> str:
    m = audit.metrics
    if m is None:
        return "<p>Résultats indisponibles pour cet audit.</p>"
    if isinstance(m, M3MetricsOut):
        head = _rows([
            ("Score global", m.global_score),
            ("Verdict", m.verdict),
            ("Paires / échecs", f"{m.n_pairs} / {m.n_calls_failed}"),
        ])
        body = "".join(
            f"<tr><td>{_e(c.name)}</td><td>{c.length_gap}</td>"
            f"<td>{c.sentiment_gap}</td><td>{c.refusal_rate}</td>"
            f"<td>{c.score}</td><td>{_e(c.verdict)}</td></tr>"
            for c in m.categories
        )
        ex = "".join(
            f"<tr><td>{_e(d.category)}</td><td>{_e(d.reason)}</td>"
            f"<td>{_e(d.excerpt_a)}</td><td>{_e(d.excerpt_b)}</td></tr>"
            for d in m.divergent_examples
        )
        return (
            f"<h2>Module 3 — audit LLM/chatbot</h2>"
            f"<table class='kv'>{head}</table>"
            f"<table class='grid'><thead><tr><th>Catégorie</th><th>Écart "
            f"long.</th><th>Écart sent.</th><th>Taux refus</th><th>Score</th>"
            f"<th>Verdict</th></tr></thead><tbody>{body}</tbody></table>"
            + (
                f"<h2>Exemples divergents</h2><table class='grid'><thead>"
                f"<tr><th>Catégorie</th><th>Raison</th><th>Réponse A</th>"
                f"<th>Réponse B</th></tr></thead><tbody>{ex}</tbody></table>"
                if ex else ""
            )
        )
    if isinstance(m, M2MetricsOut):
        head = _rows(
            [
                ("Test du Khi-deux (p-value)", m.p_value),
                ("χ² / ddl", f"{m.chi2} / {m.dof}"),
                ("Taux favorable global", m.global_positive_rate),
                ("Clusters déviants", f"{len(m.deviant_cluster_ids)} / {m.k}"),
            ]
        )
        body = "".join(
            f"<tr><td>{c.id}</td><td>{c.n}</td><td>{c.positive_rate}</td>"
            f"<td>{c.deviation_pp}</td>"
            f"<td>{'oui' if c.is_deviant else 'non'}</td></tr>"
            for c in m.clusters
        )
        return (
            f"<h2>Module 2 — détection non supervisée</h2>"
            f"<table class='kv'>{head}</table>"
            f"<table class='grid'><thead><tr><th>Cluster</th><th>Effectif"
            f"</th><th>Taux fav.</th><th>Écart (pts)</th><th>Déviant</th>"
            f"</tr></thead><tbody>{body}</tbody></table>"
        )
    if isinstance(m, M1MetricsOut):
        head = _rows(
            [
                ("Disparate Impact", m.disparate_impact),
                ("Demographic Parity (écart)", m.demographic_parity_diff),
                ("Groupe le plus défavorisé", m.worst_group),
                ("Référence", m.reference_value),
            ]
        )
        body = "".join(
            f"<tr><td>{_e(g.value)}</td><td>{g.n}</td><td>{g.favorable}</td>"
            f"<td>{g.selection_rate}</td><td>{g.disparate_impact}</td></tr>"
            for g in m.groups
        )
        base = (
            f"<h2>Module 1 — audit supervisé</h2>"
            f"<table class='kv'>{head}</table>"
            f"<table class='grid'><thead><tr><th>Groupe</th><th>Effectif</th>"
            f"<th>Favorables</th><th>Taux</th><th>DI</th></tr></thead>"
            f"<tbody>{body}</tbody></table>"
        )
        if m.equal_opportunity_diff is None and m.truelabel_reason is None:
            eo_block = ""
        else:
            eo_parts: list[str] = []
            eo_parts.append("<h2>Equal Opportunity / Equalized Odds</h2>")
            if m.truelabel_reason is not None:
                eo_parts.append(
                    f"<p class='note'>{_e(m.truelabel_reason)}</p>"
                )
            if m.equal_opportunity_diff is not None:
                eo_kv = _rows(
                    [
                        ("Equal Opportunity (écart TPR)",
                         m.equal_opportunity_diff),
                        ("Verdict Equal Opportunity",
                         m.equal_opportunity_verdict or "—"),
                        ("Equalized Odds (écart max TPR/FPR)",
                         m.equalized_odds_diff),
                        ("Verdict Equalized Odds",
                         m.equalized_odds_verdict or "—"),
                        ("Demographic Parity (verdict par métrique)",
                         m.demographic_parity_verdict or "—"),
                    ]
                )
                tpr_rows = "".join(
                    f"<tr><td>{_e(g.value)}</td>"
                    f"<td>{_e(g.tpr if g.tpr is not None else '—')}</td>"
                    f"<td>{_e(g.fpr if g.fpr is not None else '—')}</td></tr>"
                    for g in m.groups
                )
                eo_parts.append(
                    f"<table class='kv'>{eo_kv}</table>"
                    f"<table class='grid'><thead><tr>"
                    f"<th>Groupe</th><th>TPR</th><th>FPR</th>"
                    f"</tr></thead><tbody>{tpr_rows}</tbody></table>"
                    f"<p class='note'>DP, Equal Opportunity et Equalized Odds ne "
                    f"peuvent être satisfaits simultanément — tout choix de "
                    f"métrique est un choix normatif, pas seulement technique.</p>"
                )
            eo_block = "".join(eo_parts)
        # Per-attribute marginal sections
        marg_parts: list[str] = []
        for marg in m.marginals:
            marg_kv = _rows(
                [
                    ("Disparate Impact", marg.disparate_impact),
                    ("Demographic Parity (écart)", marg.demographic_parity_diff),
                    ("Groupe le plus défavorisé", marg.worst_group),
                    ("Référence", marg.reference_value),
                    ("Verdict", marg.verdict),
                    ("Score de risque", marg.risk_score),
                ]
            )
            marg_body = "".join(
                f"<tr><td>{_e(g.value)}</td><td>{g.n}</td><td>{g.favorable}</td>"
                f"<td>{g.selection_rate}</td><td>{g.disparate_impact}</td></tr>"
                for g in marg.groups
            )
            marg_html = (
                f"<h2>Attribut protégé : {_e(marg.attribute)}</h2>"
                f"<table class='kv'>{marg_kv}</table>"
                f"<table class='grid'><thead><tr><th>Groupe</th><th>Effectif</th>"
                f"<th>Favorables</th><th>Taux</th><th>DI</th></tr></thead>"
                f"<tbody>{marg_body}</tbody></table>"
            )
            if marg.equal_opportunity_diff is not None:
                marg_eo_kv = _rows(
                    [
                        ("Equal Opportunity (écart TPR)", marg.equal_opportunity_diff),
                        ("Verdict EO", marg.equal_opportunity_verdict or "—"),
                        ("Equalized Odds (écart max TPR/FPR)", marg.equalized_odds_diff),
                        ("Verdict Eq. Odds", marg.equalized_odds_verdict or "—"),
                    ]
                )
                marg_html += f"<table class='kv'>{marg_eo_kv}</table>"
            if marg.warnings:
                warns = "".join(f"<li>{_e(w)}</li>" for w in marg.warnings)
                marg_html += f"<ul class='note'>{warns}</ul>"
            if marg.truelabel_reason is not None:
                marg_html += f"<p class='note'>{_e(marg.truelabel_reason)}</p>"
            marg_parts.append(marg_html)
        marg_block = "".join(marg_parts)

        # Per-pair intersectional sections
        ix_parts: list[str] = []
        for ix in m.pairwise:
            pair_title = (
                f"{_e(ix.primary_attribute)} × {_e(ix.secondary_attribute)}"
                if ix.primary_attribute
                else "Analyse intersectionnelle"
            )
            ix_kv = _rows(
                [
                    ("Disparate Impact intersectionnel", ix.disparate_impact),
                    ("Demographic Parity (écart intersectionnel)",
                     ix.demographic_parity_diff),
                    ("Verdict intersectionnel", ix.verdict),
                    ("Pire sous-groupe (primaire)", ix.worst_primary),
                    ("Pire sous-groupe (secondaire)", ix.worst_secondary),
                    ("DI marginal (attribut primaire)",
                     ix.marginal_di[0] if len(ix.marginal_di) > 0 else "—"),
                    ("DI marginal (attribut secondaire)",
                     ix.marginal_di[1] if len(ix.marginal_di) > 1 else "—"),
                ]
            )
            ix_cells = "".join(
                f"<tr><td>{_e(c.primary_value)}</td><td>{_e(c.secondary_value)}</td>"
                f"<td>{c.n}</td><td>{c.favorable}</td><td>{c.selection_rate}</td>"
                f"<td>{c.disparate_impact}</td><td>{_e(c.verdict)}</td></tr>"
                for c in ix.cells
            )
            ix_html = (
                f"<h2>Croisement : {pair_title}</h2>"
                f"<table class='kv'>{ix_kv}</table>"
                f"<table class='grid'><thead><tr>"
                f"<th>Groupe primaire</th><th>Groupe secondaire</th>"
                f"<th>Effectif</th><th>Favorables</th><th>Taux</th>"
                f"<th>DI</th><th>Verdict</th>"
                f"</tr></thead><tbody>{ix_cells}</tbody></table>"
            )
            if ix.equal_opportunity_diff is not None:
                ix_eo_kv = _rows(
                    [
                        ("Equal Opportunity intersectionnel (écart TPR)",
                         ix.equal_opportunity_diff),
                        ("Verdict EO intersectionnel",
                         ix.equal_opportunity_verdict or "—"),
                        ("Equalized Odds intersectionnel (écart max TPR/FPR)",
                         ix.equalized_odds_diff),
                        ("Verdict Equalized Odds intersectionnel",
                         ix.equalized_odds_verdict or "—"),
                    ]
                )
                ix_html += f"<table class='kv'>{ix_eo_kv}</table>"
            if ix.warnings:
                warns = "".join(f"<li>{_e(w)}</li>" for w in ix.warnings)
                ix_html += f"<ul class='note'>{warns}</ul>"
            if ix.reason is not None:
                ix_html += f"<p class='note'>{_e(ix.reason)}</p>"
            ix_parts.append(ix_html)
        ix_block = "".join(ix_parts)

        return base + eo_block + marg_block + ix_block
    return "<p>Résultats indisponibles pour cet audit.</p>"


def _render_recommendations(recs: list[RecommendationOut]) -> str:
    if not recs:
        return ""
    items = "".join(
        '<li class="rec rec-' + escape(r.priority) + '">'
        '<div class="rec-head">'
        '<span class="rec-title">' + escape(r.title) + '</span>'
        '<span class="rec-prio">' + escape(_PRIORITY_LABEL_FR[r.priority]) + '</span>'
        '</div>'
        '<p class="rec-detail">' + escape(r.detail) + '</p>'
        '</li>'
        for r in recs
    )
    return (
        '<section class="recommendations">'
        '<h3>Recommandations</h3>'
        '<ul>' + items + '</ul>'
        '</section>'
    )


def build_report_html(audit: AuditOut) -> str:
    m = audit.metrics
    verdict = m.verdict if m is not None else "pass"
    label, color = _VERDICT_FR.get(verdict, ("—", "#475467"))
    risk = m.risk_score if m is not None else "—"
    pre = "".join(f"<li>{_e(w)}</li>" for w in audit.pre_check) or "<li>Aucune.</li>"
    disc = (
        "".join(f"<li>{_e(d)}</li>" for d in audit.interpretation.disclaimers)
        if audit.interpretation is not None
        else "<li>—</li>"
    )
    anchors = "".join(
        f"<tr><th>{_e(a)}</th><td>{_e(b)}</td></tr>" for a, b in _AI_ACT
    )
    narrative = (
        _e(audit.interpretation.narrative)
        if audit.interpretation is not None
        else ""
    )
    recs = (
        audit.interpretation.recommendations
        if audit.interpretation is not None
        else []
    )
    recs_html = _render_recommendations(recs)
    return f"""<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8">
<style>
body{{font-family:Arial,Helvetica,sans-serif;color:#101828;margin:32px}}
h1{{font-size:22px}} h2{{font-size:16px;margin-top:24px}}
table{{border-collapse:collapse;width:100%;margin:8px 0;font-size:12px}}
.kv th{{text-align:left;width:240px;color:#475467}}
.grid th,.grid td,.kv th,.kv td{{border:1px solid #eaecf0;padding:6px 8px}}
.badge{{display:inline-block;padding:4px 10px;border-radius:6px;color:#fff;
background:{color};font-weight:bold}}
.note{{color:#475467;font-size:11px;margin-top:6px}}
footer{{margin-top:32px;border-top:1px solid #eaecf0;padding-top:8px;
color:#475467;font-size:10px}}
.recommendations{{margin-top:24px}}
.recommendations h3{{font-size:14px;font-weight:600;margin-bottom:8px}}
.recommendations ul{{list-style:none;padding:0}}
.recommendations .rec{{border:1px solid #d4d4d8;border-radius:6px;padding:12px;margin-bottom:8px}}
.recommendations .rec-head{{display:flex;justify-content:space-between;gap:12px;margin-bottom:6px}}
.recommendations .rec-title{{font-weight:500;font-size:13px}}
.recommendations .rec-prio{{font-size:10px;text-transform:uppercase;letter-spacing:0.05em;color:#71717a}}
.recommendations .rec-high .rec-prio{{color:#dc2626}}
.recommendations .rec-medium .rec-prio{{color:#d97706}}
.recommendations .rec-detail{{font-size:12px;color:#52525b;margin:0}}
</style></head><body>
<h1>Rapport de conformité AuditIQ</h1>
<p class="note">{_NOT_A_CERTIFICATE}</p>
<table class="kv">
<tr><th>Audit</th><td>{_e(audit.code or audit.id)}</td></tr>
<tr><th>Titre</th><td>{_e(audit.title)}</td></tr>
<tr><th>Module</th><td>{_e(audit.module)}</td></tr>
<tr><th>Statut</th><td>{_e(audit.status)}</td></tr>
<tr><th>Verdict</th><td><span class="badge">{_e(label)}</span></td></tr>
<tr><th>Score de risque</th><td>{_e(risk)}/100</td></tr>
</table>
{_detail(audit)}
<h2>Interprétation</h2><p>{narrative}</p>
{recs_html}
<h2>Mise en regard AI Act</h2><table class="kv">{anchors}</table>
<p class="note">{_FR_LAW}</p>
<h2>Pré-vérifications</h2><ul>{pre}</ul>
<h2>Limites</h2><ul>{disc}</ul>
<footer>{_NOT_A_CERTIFICATE}</footer>
</body></html>"""
