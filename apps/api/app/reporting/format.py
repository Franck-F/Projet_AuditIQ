"""Libellés français partagés par les sorties client (PDF/HTML, Excel)."""
from __future__ import annotations

#: Libellés de verdict destinés à l'utilisateur final.
#: Jamais de « Conforme / Non conforme » : détection ≠ verdict.
VERDICT_LABEL_FR: dict[str, str] = {
    "fail": "Risque élevé",
    "warn": "Vigilance",
    "pass": "Risque faible",
}

#: Statuts d'audit traduits pour les rapports.
STATUS_LABEL_FR: dict[str, str] = {
    "pending": "En attente",
    "running": "En cours",
    "done": "Terminé",
    "failed": "Échoué",
}


def verdict_label(verdict: object) -> str:
    """French label for a pass/warn/fail verdict (raw value as fallback)."""
    return VERDICT_LABEL_FR.get(str(verdict), str(verdict))


def status_label(status: object) -> str:
    """French label for an audit status (raw value as fallback)."""
    return STATUS_LABEL_FR.get(str(status), str(status))


def p_value_display(p: float) -> object:
    """p-value lisible par un non-technicien : « < 0,001 » sous le millième."""
    if p < 0.001:
        return "< 0,001"
    return p
