import datetime
import uuid

from app.reporting.html import build_report_html
from app.schemas.audit import (
    AuditOut,
    ClusterStatOut,
    GroupStatOut,
    InterpretationOut,
    M1MetricsOut,
    M2MetricsOut,
)

_NOW = datetime.datetime(2026, 5, 17, tzinfo=datetime.timezone.utc)


def _interp() -> InterpretationOut:
    return InterpretationOut(
        narrative="Texte.", ai_act_anchors=["AI Act, article 10"],
        disclaimers=["Aide à l'analyse."], provider="fallback",
        model="deterministic",
    )


def _m1() -> AuditOut:
    return AuditOut(
        id=uuid.uuid4(), code="AUD-2026-001", title="Recrutement", status="done",
        module="M1", dataset_id=uuid.uuid4(), protected_attribute="genre",
        decision_column="embauche", favorable_value="oui", privileged_value=None,
        created_at=_NOW, completed_at=_NOW,
        metrics=M1MetricsOut(
            groups=[GroupStatOut(value="F", n=100, favorable=30,
                                 selection_rate=0.3, disparate_impact=0.6)],
            reference_value="H", disparate_impact=0.6,
            demographic_parity_diff=0.2, worst_group="F", verdict="fail",
            risk_score=80, warnings=[]),
        interpretation=_interp(), pre_check=["Déséquilibre groupe F."],
        config=None,
    )


def _m2() -> AuditOut:
    return AuditOut(
        id=uuid.uuid4(), code="AUD-2026-002", title="Détection", status="done",
        module="M2", dataset_id=uuid.uuid4(), protected_attribute=None,
        decision_column="embauche", favorable_value="oui", privileged_value=None,
        created_at=_NOW, completed_at=_NOW,
        metrics=M2MetricsOut(
            n=240, k=2, global_positive_rate=0.5, chi2=88.1, p_value=0.0001,
            dof=1,
            clusters=[ClusterStatOut(id=0, n=120, positive_rate=0.1,
                                     deviation_pp=-40, is_deviant=True,
                                     top_features=[])],
            deviant_cluster_ids=[0], verdict="fail", risk_score=88,
            warnings=[]),
        interpretation=_interp(), pre_check=[], config={"k": 2},
    )


def test_html_m1_is_wellformed_and_not_a_certificate():
    h = build_report_html(_m1())
    assert h.lstrip().startswith("<!DOCTYPE html>")
    assert "<html" in h and "</html>" in h
    assert "AUD-2026-001" in h
    assert "Disparate Impact" in h
    assert "n'est pas un certificat" in h
    assert h.count("n'est pas un certificat") >= 2
    assert "AI Act" in h and "L.1132-1" in h


def test_html_m2_renders_clusters():
    h = build_report_html(_m2())
    assert "AUD-2026-002" in h
    assert "Khi-deux" in h or "p-value" in h
    assert "n'est pas un certificat" in h


def test_html_m3_section():
    import datetime
    import uuid

    from app.reporting.html import build_report_html
    from app.schemas.audit import (
        CategoryStatOut,
        M3MetricsOut,
    )
    now = datetime.datetime(2026, 5, 17, tzinfo=datetime.timezone.utc)
    from app.schemas.audit import AuditOut, InterpretationOut
    a = AuditOut(
        id=uuid.uuid4(), code="AUD-2026-031", title="Chatbot", status="done",
        module="M3", dataset_id=None, protected_attribute=None,
        decision_column=None, favorable_value=None, privileged_value=None,
        created_at=now, completed_at=now,
        metrics=M3MetricsOut(
            categories=[CategoryStatOut(name="origine", length_gap=0.1,
                        sentiment_gap=0.1, refusal_rate=0.0, score=0.1,
                        verdict="pass")],
            global_score=0.1, verdict="pass", risk_score=10,
            divergent_examples=[], n_pairs=1, n_calls_failed=0, warnings=[]),
        interpretation=InterpretationOut(narrative="N.", ai_act_anchors=[
            "AI Act, article 50"], disclaimers=["Signal."],
            provider="fallback", model="deterministic"),
        pre_check=[], config={"lang": "fr"})
    h = build_report_html(a)
    assert "AUD-2026-031" in h and "origine" in h
    assert "n'est pas un certificat" in h


def test_html_m3_escapes_hostile_llm_text():
    import datetime
    import uuid

    from app.reporting.html import build_report_html
    from app.schemas.audit import (
        AuditOut,
        CategoryStatOut,
        DivergentExampleOut,
        InterpretationOut,
        M3MetricsOut,
    )

    now = datetime.datetime(2026, 5, 17, tzinfo=datetime.timezone.utc)
    hostile_excerpt_a = "<script>alert(1)</script>"
    hostile_excerpt_b = '"><img src=x onerror=alert(2)>'
    hostile_category = "<b>x</b>"
    hostile_reason = "<svg/onload=alert(3)>"

    a = AuditOut(
        id=uuid.uuid4(), code="AUD-2026-099", title="XSS-test", status="done",
        module="M3", dataset_id=None, protected_attribute=None,
        decision_column=None, favorable_value=None, privileged_value=None,
        created_at=now, completed_at=now,
        metrics=M3MetricsOut(
            categories=[CategoryStatOut(name="origine", length_gap=0.2,
                        sentiment_gap=0.2, refusal_rate=0.1, score=0.2,
                        verdict="fail")],
            global_score=0.2, verdict="fail", risk_score=70,
            divergent_examples=[
                DivergentExampleOut(
                    category=hostile_category,
                    prompt_id="p-001",
                    variant_a="A",
                    variant_b="B",
                    excerpt_a=hostile_excerpt_a,
                    excerpt_b=hostile_excerpt_b,
                    reason=hostile_reason,
                )
            ],
            n_pairs=1, n_calls_failed=0, warnings=[]),
        interpretation=InterpretationOut(narrative="N.", ai_act_anchors=[
            "AI Act, article 50"], disclaimers=["Signal."],
            provider="fallback", model="deterministic"),
        pre_check=[], config={"lang": "fr"})

    h = build_report_html(a)

    # No raw hostile tags must appear in the rendered HTML
    assert "<script>alert(1)</script>" not in h
    assert "onerror=alert(2)" not in h or "&lt;img" in h  # onerror text may appear but only inside entity-escaped tag
    assert "<img src=x onerror=alert(2)>" not in h
    assert "<svg/onload=alert(3)>" not in h

    # The escaped entity forms must be present instead
    assert "&lt;script&gt;alert(1)&lt;/script&gt;" in h
    assert "&quot;&gt;&lt;img src=x onerror=alert(2)&gt;" in h
    assert "&lt;b&gt;x&lt;/b&gt;" in h
    assert "&lt;svg/onload=alert(3)&gt;" in h
