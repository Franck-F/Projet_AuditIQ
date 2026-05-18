"""Pure HTML compliance report: build_report_html(AuditOut) -> str.

No I/O. The HTML is rendered to PDF by the apps/pdf microservice.
"""
from __future__ import annotations

from html import escape

from app.schemas.audit import AuditOut, M1MetricsOut, M2MetricsOut, M3MetricsOut

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
            return base
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
        return base + "".join(eo_parts)
    return "<p>Résultats indisponibles pour cet audit.</p>"


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
<h2>Mise en regard AI Act</h2><table class="kv">{anchors}</table>
<p class="note">{_FR_LAW}</p>
<h2>Pré-vérifications</h2><ul>{pre}</ul>
<h2>Limites</h2><ul>{disc}</ul>
<footer>{_NOT_A_CERTIFICATE}</footer>
</body></html>"""
