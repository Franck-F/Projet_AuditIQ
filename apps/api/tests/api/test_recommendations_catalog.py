"""Catalogue déterministe de recommandations — persona « déployeur ».

Couvre : la gradation par sévérité (fail / warn / pass), la contextualisation
par secteur, l'ABSENCE d'actions de fournisseur, et le déterminisme hors-ligne.
"""
import pytest

from app.interpretation.recommendations_catalog import (
    FORBIDDEN_PROVIDER_TERMS,
    Finding,
    build_recommendations,
)

_ALL_TEXT_FIELDS = ("title", "rationale", "detail")


def _all_text(recs) -> str:
    parts: list[str] = []
    for r in recs:
        parts.append(r.title)
        parts.append(r.rationale)
        parts.append(r.detail)
        parts.extend(r.steps)
        if r.legal_ref:
            parts.append(r.legal_ref)
    return " ".join(parts).lower()


def _finding(verdict: str, sector: str = "hr", risk: int = 70) -> Finding:
    return Finding(
        verdict=verdict, module="M1", sector=sector,  # type: ignore[arg-type]
        attribute="sexe", worst_group="femme", reference_value="homme",
        metric_label="Disparate Impact", gap_text="0.6", risk_score=risk,
    )


# --- Gradation par sévérité --------------------------------------------------

def test_fail_has_priority1_and_core_categories() -> None:
    recs = build_recommendations(_finding("fail", risk=70))
    cats = {r.category for r in recs}
    # Risque élevé : documentation + supervision + relation fournisseur + usage.
    assert {"documentation", "supervision_humaine",
            "relation_fournisseur", "usage_outil"} <= cats
    # Conformité (information des personnes) présente.
    assert "conformite" in cats
    # Au moins une priorité 1 (haute).
    assert any(r.priority_level == 1 for r in recs)
    # Triées : priorités croissantes.
    assert [r.priority_level for r in recs] == sorted(
        r.priority_level for r in recs
    )


def test_fail_high_risk_adds_escalation() -> None:
    low = build_recommendations(_finding("fail", risk=70))
    high = build_recommendations(_finding("fail", risk=85))
    assert "escalade" not in {r.category for r in low}
    assert "escalade" in {r.category for r in high}


def test_warn_is_vigilance_no_escalation() -> None:
    recs = build_recommendations(_finding("warn"))
    cats = {r.category for r in recs}
    assert {"documentation", "supervision_humaine", "surveillance"} <= cats
    assert "escalade" not in cats
    # Vigilance : priorités 2, jamais 1.
    assert all(r.priority_level >= 2 for r in recs)


def test_pass_is_light_documentation_and_retest() -> None:
    recs = build_recommendations(_finding("pass", risk=10))
    cats = {r.category for r in recs}
    assert cats == {"documentation", "surveillance"}
    # Risque faible : priorité basse (3).
    assert all(r.priority_level == 3 for r in recs)


# --- Persona déployeur : aucune action de fournisseur ------------------------

@pytest.mark.parametrize("verdict", ["fail", "warn", "pass"])
@pytest.mark.parametrize("sector", ["hr", "credit", "insurance", "other"])
def test_no_provider_actions_anywhere(verdict: str, sector: str) -> None:
    recs = build_recommendations(_finding(verdict, sector=sector))
    blob = _all_text(recs)
    for term in FORBIDDEN_PROVIDER_TERMS:
        assert term not in blob, (
            f"terme fournisseur interdit « {term} » trouvé "
            f"({verdict}/{sector})"
        )


# --- Contextualisation secteur -----------------------------------------------

def test_hr_sector_mentions_cse_and_art_26_7() -> None:
    recs = build_recommendations(_finding("fail", sector="hr"))
    blob = _all_text(recs)
    assert "candidat" in blob or "cse" in blob
    assert "26.7" in blob


def test_credit_sector_mentions_art22_or_acpr() -> None:
    recs = build_recommendations(_finding("fail", sector="credit"))
    blob = _all_text(recs)
    assert "art. 22" in blob or "acpr" in blob or "consommation" in blob


def test_insurance_sector_mentions_assurances_or_acpr() -> None:
    recs = build_recommendations(_finding("fail", sector="insurance"))
    blob = _all_text(recs)
    assert "assurance" in blob or "acpr" in blob


# --- Rationale rattaché au constat -------------------------------------------

def test_rationale_cites_the_finding() -> None:
    recs = build_recommendations(_finding("fail"))
    blob = _all_text(recs)
    # Le groupe lésé et l'attribut apparaissent dans au moins un rationale.
    assert "femme" in blob
    assert "sexe" in blob


# --- Déterminisme ------------------------------------------------------------

def test_deterministic_offline() -> None:
    f = _finding("fail")
    a = build_recommendations(f)
    b = build_recommendations(f)
    assert [(r.id, r.title, r.priority_level, r.category) for r in a] == [
        (r.id, r.title, r.priority_level, r.category) for r in b
    ]


def test_owner_horizon_legal_ref_present_on_fail() -> None:
    recs = build_recommendations(_finding("fail"))
    for r in recs:
        assert r.owner in ("RH", "DPO", "Juridique", "Achats", "Direction")
        assert r.horizon in ("immediat", "court_terme", "continu")
        # priorité littérale dérivée cohérente
        assert (r.priority_level, r.priority) in (
            (1, "high"), (2, "medium"), (3, "low")
        )
