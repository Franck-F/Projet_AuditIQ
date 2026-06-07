"""Pure Excel compliance report: build_excel_report(AuditOut) -> bytes."""
from __future__ import annotations

import io
from collections.abc import Sequence

from openpyxl import Workbook
from openpyxl.styles import Font
from openpyxl.worksheet.worksheet import Worksheet

from app.schemas.audit import AuditOut, M1MetricsOut, M2MetricsOut, M3MetricsOut, RecommendationOut

_VERDICT_FR = {
    "fail": "🔴 Critique",
    "warn": "🟠 Vigilance",
    "pass": "🟢 Conforme",
}
_NOT_A_CERTIFICATE = (
    "Ce rapport est une aide à l'analyse documentée : il n'est pas un "
    "certificat de conformité ni un avis juridique."
)
_AI_ACT_MAP = [
    ("Article 9 — système de gestion des risques", "Risque agrégé / verdict"),
    ("Article 10 — qualité et gouvernance des données", "Pré-vérifications / groupes"),
    ("Article 11 — documentation technique", "Ce rapport (trace documentée)"),
]
_FR_LAW = (
    "Références droit français : Code du travail L.1132-1 ; Défenseur des "
    "droits ; CNIL ; ACPR (selon le contexte d'usage)."
)


_PRIORITY_LABEL_FR = {
    "high": "Action prioritaire",
    "medium": "À planifier",
    "low": "Maintien / veille",
}


def _rows(ws: Worksheet, rows: Sequence[Sequence[object]]) -> None:
    for r in rows:
        ws.append(r)


def _write_recommendations_sheet(
    wb: Workbook, recs: list[RecommendationOut]
) -> None:
    if not recs:
        return
    ws = wb.create_sheet("Recommandations")
    ws.append(["#", "Priorité", "Action", "Détail"])
    for cell in ws[1]:
        cell.font = Font(bold=True)
    for idx, rec in enumerate(recs, start=1):
        ws.append([idx, _PRIORITY_LABEL_FR[rec.priority], rec.title, rec.detail])


def build_excel_report(audit: AuditOut) -> bytes:
    wb = Workbook()
    summary = wb.active
    summary.title = "Résumé"
    m = audit.metrics
    verdict = m.verdict if m is not None else "—"
    risk = m.risk_score if m is not None else "—"
    _rows(
        summary,
        [
            ["Rapport de conformité AuditIQ"],
            [],
            ["Audit", audit.code or str(audit.id)],
            ["Titre", audit.title],
            ["Module", audit.module],
            ["Statut", audit.status],
            ["Verdict", _VERDICT_FR.get(verdict, verdict)],
            ["Score de risque", f"{risk}/100"],
            [],
            [_NOT_A_CERTIFICATE],
        ],
    )

    detail = wb.create_sheet("Détail")
    if m is None:
        _rows(detail, [["Résultats indisponibles pour cet audit."]])
    elif isinstance(m, M2MetricsOut):
        _rows(
            detail,
            [
                ["Module 2 — détection non supervisée"],
                ["Test du Khi-deux (p-value)", m.p_value],
                ["χ²", m.chi2, "ddl", m.dof],
                ["Taux favorable global", m.global_positive_rate],
                ["Clusters déviants", f"{len(m.deviant_cluster_ids)} / {m.k}"],
                [],
                ["Cluster", "Effectif", "Taux fav.", "Écart (pts)", "Déviant"],
            ],
        )
        for c in m.clusters:
            detail.append(
                [c.id, c.n, c.positive_rate, c.deviation_pp,
                 "oui" if c.is_deviant else "non"]
            )
    elif isinstance(m, M3MetricsOut):
        _rows(
            detail,
            [
                ["Module 3 — audit LLM/chatbot"],
                ["Score global", m.global_score],
                ["Verdict", m.verdict],
                ["Paires", m.n_pairs, "Appels échoués", m.n_calls_failed],
                [],
                ["Catégorie", "Écart long.", "Écart sent.", "Taux refus",
                 "Score", "Verdict"],
            ],
        )
        for cat in m.categories:
            detail.append([cat.name, cat.length_gap, cat.sentiment_gap,
                           cat.refusal_rate, cat.score, cat.verdict])
    elif isinstance(m, M1MetricsOut):
        _rows(
            detail,
            [
                ["Module 1 — audit supervisé"],
                ["Disparate Impact", m.disparate_impact],
                ["Demographic Parity (écart)", m.demographic_parity_diff],
                ["Groupe le plus défavorisé", m.worst_group],
                ["Référence", m.reference_value],
                [],
                ["Groupe", "Effectif", "Favorables", "Taux", "DI"],
            ],
        )
        for g in m.groups:
            detail.append(
                [g.value, g.n, g.favorable, g.selection_rate,
                 g.disparate_impact]
            )
        if m.equal_opportunity_diff is not None or m.truelabel_reason is not None:
            _rows(detail, [[]])
            if m.truelabel_reason is not None:
                _rows(detail, [["Note vérité-terrain", m.truelabel_reason]])
            if m.equal_opportunity_diff is not None:
                _rows(
                    detail,
                    [
                        ["Métriques vérité-terrain (Equal Opportunity / Equalized Odds)"],
                        ["Equal Opportunity (écart TPR)",
                         m.equal_opportunity_diff,
                         "Verdict EO",
                         m.equal_opportunity_verdict or "—"],
                        ["Equalized Odds (écart max TPR/FPR)",
                         m.equalized_odds_diff,
                         "Verdict Eq. Odds",
                         m.equalized_odds_verdict or "—"],
                        ["Demographic Parity (verdict)",
                         m.demographic_parity_verdict or "—"],
                        [],
                        ["Groupe", "TPR", "FPR"],
                    ],
                )
                for g in m.groups:
                    if g.tpr is not None or g.fpr is not None:
                        detail.append(
                            [g.value,
                             g.tpr if g.tpr is not None else "—",
                             g.fpr if g.fpr is not None else "—"]
                        )
                _rows(
                    detail,
                    [
                        [],
                        ["Note normative",
                         "DP, Equal Opportunity et Equalized Odds ne peuvent "
                         "être satisfaits simultanément — tout choix de "
                         "métrique est un choix normatif, pas seulement "
                         "technique."],
                    ],
                )
        for marg in m.marginals:
            _rows(
                detail,
                [
                    [],
                    [f"Attribut protégé : {marg.attribute}"],
                    ["Disparate Impact", marg.disparate_impact],
                    ["Demographic Parity (écart)", marg.demographic_parity_diff],
                    ["Groupe le plus défavorisé", marg.worst_group],
                    ["Référence", marg.reference_value],
                    ["Verdict", marg.verdict],
                    ["Score de risque", marg.risk_score],
                    [],
                    ["Groupe", "Effectif", "Favorables", "Taux", "DI"],
                ],
            )
            for g in marg.groups:
                detail.append(
                    [g.value, g.n, g.favorable, g.selection_rate,
                     g.disparate_impact]
                )
            if marg.equal_opportunity_diff is not None:
                _rows(
                    detail,
                    [
                        [],
                        ["Equal Opportunity (écart TPR)",
                         marg.equal_opportunity_diff,
                         "Verdict EO",
                         marg.equal_opportunity_verdict or "—"],
                        ["Equalized Odds (écart max TPR/FPR)",
                         marg.equalized_odds_diff,
                         "Verdict Eq. Odds",
                         marg.equalized_odds_verdict or "—"],
                    ],
                )
            if marg.warnings:
                for w in marg.warnings:
                    detail.append(["Avertissement", w])
            if marg.truelabel_reason is not None:
                _rows(detail, [["Note vérité-terrain", marg.truelabel_reason]])
        for ix in m.pairwise:
            pair_title = (
                f"{ix.primary_attribute} × {ix.secondary_attribute}"
                if ix.primary_attribute
                else "Analyse intersectionnelle"
            )
            _rows(
                detail,
                [
                    [],
                    [f"Croisement : {pair_title}"],
                    ["Disparate Impact intersectionnel", ix.disparate_impact],
                    ["Demographic Parity (écart intersectionnel)",
                     ix.demographic_parity_diff],
                    ["Verdict intersectionnel", ix.verdict],
                    ["Pire sous-groupe (primaire)", ix.worst_primary],
                    ["Pire sous-groupe (secondaire)", ix.worst_secondary],
                    ["DI marginal (attribut primaire)", ix.marginal_di[0]
                     if len(ix.marginal_di) > 0 else "—"],
                    ["DI marginal (attribut secondaire)", ix.marginal_di[1]
                     if len(ix.marginal_di) > 1 else "—"],
                    [],
                    ["Matrice croisée : sous-groupes"],
                    ["Groupe primaire", "Groupe secondaire", "Effectif",
                     "Favorables", "Taux", "DI", "Verdict"],
                ],
            )
            for cell in ix.cells:
                detail.append([
                    cell.primary_value, cell.secondary_value, cell.n,
                    cell.favorable, cell.selection_rate,
                    cell.disparate_impact, cell.verdict,
                ])
            if ix.equal_opportunity_diff is not None:
                _rows(
                    detail,
                    [
                        [],
                        ["Equal Opportunity intersectionnel (écart TPR)",
                         ix.equal_opportunity_diff,
                         "Verdict EO intersect.",
                         ix.equal_opportunity_verdict or "—"],
                        ["Equalized Odds intersectionnel (écart max TPR/FPR)",
                         ix.equalized_odds_diff,
                         "Verdict Eq. Odds intersect.",
                         ix.equalized_odds_verdict or "—"],
                    ],
                )
            if ix.warnings:
                for w in ix.warnings:
                    detail.append(["Avertissement", w])
            if ix.reason is not None:
                _rows(detail, [["Note", ix.reason]])

    conformity = wb.create_sheet("Conformité")
    _rows(
        conformity,
        [
            ["Mise en regard AI Act"],
            ["Article", "Élément du rapport"],
            *[[a, b] for a, b in _AI_ACT_MAP],
            [],
            [_FR_LAW],
            [],
            ["Pré-vérifications"],
            *([[w] for w in audit.pre_check] or [["Aucune."]]),
            [],
            ["Limites"],
            *(
                [[d] for d in audit.interpretation.disclaimers]
                if audit.interpretation is not None
                else [["—"]]
            ),
            [],
            [_NOT_A_CERTIFICATE],
        ],
    )

    _write_recommendations_sheet(
        wb,
        audit.interpretation.recommendations if audit.interpretation is not None else [],
    )

    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()
