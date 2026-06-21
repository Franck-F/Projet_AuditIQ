"""Fusion LLM ↔ squelette déterministe (``merge_llm_text``).

Le squelette déterministe est la source de vérité : le LLM ne peut que
reformuler ``title``/``rationale``/``steps`` des entrées existantes (par ``id``).
"""
from app.interpretation._recommendations import merge_llm_text, skeleton_json
from app.interpretation.recommendations_catalog import Finding, build_recommendations


def _skeleton():
    return build_recommendations(
        Finding(
            verdict="fail", module="M1", sector="hr",
            attribute="sexe", worst_group="femme", reference_value="homme",
            metric_label="Disparate Impact", gap_text="0.6", risk_score=70,
        )
    )


def test_merge_applies_llm_text_by_id() -> None:
    skel = _skeleton()
    target = skel[0]
    raw = [
        {"id": target.id, "title": "Titre reformulé", "rationale": "Pourquoi reformulé."}
    ]
    merged = merge_llm_text(skel, raw)
    # Même nombre, même ordre, mêmes ids — squelette préservé.
    assert [r.id for r in merged] == [r.id for r in skel]
    patched = next(r for r in merged if r.id == target.id)
    assert patched.title == "Titre reformulé"
    assert patched.rationale == "Pourquoi reformulé."
    assert patched.detail == "Pourquoi reformulé."  # back-compat synchronisé
    # Champs structurels inchangés.
    assert patched.category == target.category
    assert patched.priority_level == target.priority_level
    assert patched.owner == target.owner
    assert patched.legal_ref == target.legal_ref


def test_merge_cannot_add_or_reprioritise() -> None:
    skel = _skeleton()
    raw = [
        {"id": "id_inexistant", "title": "Action fantôme", "priority_level": 1},
        {"id": skel[0].id, "priority_level": 3, "category": "escalade"},
    ]
    merged = merge_llm_text(skel, raw)
    # Aucune entrée ajoutée.
    assert len(merged) == len(skel)
    assert "Action fantôme" not in [r.title for r in merged]
    # La priorité/catégorie du LLM est ignorée.
    assert merged[0].priority_level == skel[0].priority_level
    assert merged[0].category == skel[0].category


def test_merge_keeps_skeleton_when_raw_invalid() -> None:
    skel = _skeleton()
    for raw in (None, "nope", {"not": "a list"}, 42, [], ["x", 1]):
        merged = merge_llm_text(skel, raw)
        assert [r.id for r in merged] == [r.id for r in skel]
        assert [r.title for r in merged] == [r.title for r in skel]


def test_merge_keeps_skeleton_text_when_patch_empty() -> None:
    skel = _skeleton()
    raw = [{"id": skel[0].id, "title": "   ", "steps": []}]
    merged = merge_llm_text(skel, raw)
    # Title vide ignoré → texte déterministe conservé.
    assert merged[0].title == skel[0].title


def test_skeleton_json_exposes_only_writable_fields() -> None:
    skel = _skeleton()
    blob = skeleton_json(skel)
    assert skel[0].id in blob
    assert "rationale" in blob
    # N'expose pas les champs structurels manipulables.
    assert "owner" not in blob
    assert "legal_ref" not in blob
