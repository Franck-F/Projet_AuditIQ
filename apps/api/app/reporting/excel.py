"""Pure Excel compliance report: build_excel_report(AuditOut) -> bytes."""
from __future__ import annotations

import io
from collections.abc import Sequence

from openpyxl import Workbook
from openpyxl.worksheet.worksheet import Worksheet

from app.schemas.audit import AuditOut, M1MetricsOut, M2MetricsOut, M3MetricsOut

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


def _rows(ws: Worksheet, rows: Sequence[Sequence[object]]) -> None:
    for r in rows:
        ws.append(r)


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

    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()
