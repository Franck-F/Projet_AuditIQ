import datetime
import uuid

from app.reporting.html import build_report_html
from app.schemas.audit import (
    AuditOut,
    ClusterStatOut,
    GroupStatOut,
    InterpretationOut,
    IntersectionalCellOut,
    IntersectionalOut,
    M1MetricsOut,
    M2MetricsOut,
    RecommendationOut,
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


def _m1_with_eo() -> AuditOut:
    return AuditOut(
        id=uuid.uuid4(), code="AUD-2026-010", title="Recrutement EO", status="done",
        module="M1", dataset_id=uuid.uuid4(), protected_attribute="genre",
        decision_column="embauche", favorable_value="oui", privileged_value=None,
        created_at=_NOW, completed_at=_NOW,
        metrics=M1MetricsOut(
            groups=[
                GroupStatOut(value="F", n=100, favorable=30,
                             selection_rate=0.3, disparate_impact=0.6,
                             tpr=0.5, fpr=0.4),
                GroupStatOut(value="H", n=100, favorable=50,
                             selection_rate=0.5, disparate_impact=1.0,
                             tpr=0.9, fpr=0.1),
            ],
            reference_value="H", disparate_impact=0.6,
            demographic_parity_diff=0.2, worst_group="F", verdict="fail",
            risk_score=80, warnings=[],
            equal_opportunity_diff=0.4,
            equalized_odds_diff=0.4,
            demographic_parity_verdict="warn",
            equal_opportunity_verdict="fail",
            equalized_odds_verdict="fail",
            truelabel_reason=None,
        ),
        interpretation=_interp(), pre_check=["Déséquilibre groupe F."],
        config=None,
    )


def test_html_m1_eo_section_present_when_set():
    h = build_report_html(_m1_with_eo())
    assert "Equal Opportunity" in h
    assert "Equalized Odds" in h
    # per-group TPR values present
    assert "0.5" in h
    assert "0.9" in h
    # existing M1 content still present
    assert "Disparate Impact" in h
    assert "AUD-2026-010" in h


def test_html_m1_eo_section_absent_when_not_set():
    h = build_report_html(_m1())
    # no EO section
    assert "Equal Opportunity" not in h
    assert "Equalized Odds" not in h
    # existing M1 content unchanged
    assert "Disparate Impact" in h
    assert "AUD-2026-001" in h


def test_html_m1_eo_escapes_group_names():
    """Group names and verdict strings in the EO section must be HTML-escaped."""
    audit = AuditOut(
        id=uuid.uuid4(), code="AUD-2026-020", title="XSS EO", status="done",
        module="M1", dataset_id=uuid.uuid4(), protected_attribute="genre",
        decision_column="embauche", favorable_value="oui", privileged_value=None,
        created_at=_NOW, completed_at=_NOW,
        metrics=M1MetricsOut(
            groups=[
                GroupStatOut(value="<b>F</b>", n=100, favorable=30,
                             selection_rate=0.3, disparate_impact=0.6,
                             tpr=0.5, fpr=0.4),
                GroupStatOut(value="H", n=100, favorable=50,
                             selection_rate=0.5, disparate_impact=1.0,
                             tpr=0.9, fpr=0.1),
            ],
            reference_value="H", disparate_impact=0.6,
            demographic_parity_diff=0.2, worst_group="<b>F</b>", verdict="fail",
            risk_score=80, warnings=[],
            equal_opportunity_diff=0.4,
            equalized_odds_diff=0.4,
            demographic_parity_verdict="warn",
            equal_opportunity_verdict="fail",
            equalized_odds_verdict="fail",
            truelabel_reason=None,
        ),
        interpretation=_interp(), pre_check=[], config=None,
    )
    h = build_report_html(audit)
    # raw tag must not appear in TPR/FPR rows
    assert "<b>F</b>" not in h
    assert "&lt;b&gt;F&lt;/b&gt;" in h


def test_html_m1_truelabel_reason_shown():
    audit = AuditOut(
        id=uuid.uuid4(), code="AUD-2026-021", title="Raison EO", status="done",
        module="M1", dataset_id=uuid.uuid4(), protected_attribute="genre",
        decision_column="embauche", favorable_value="oui", privileged_value=None,
        created_at=_NOW, completed_at=_NOW,
        metrics=M1MetricsOut(
            groups=[GroupStatOut(value="F", n=100, favorable=30,
                                 selection_rate=0.3, disparate_impact=0.6)],
            reference_value="H", disparate_impact=0.6,
            demographic_parity_diff=0.2, worst_group="F", verdict="fail",
            risk_score=80, warnings=[],
            truelabel_reason="Non calculable : moins de 2 groupes.",
        ),
        interpretation=_interp(), pre_check=[], config=None,
    )
    h = build_report_html(audit)
    assert "Non calculable" in h
    assert "Disparate Impact" in h


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


def _intersectional_out() -> IntersectionalOut:
    return IntersectionalOut(
        cells=[
            IntersectionalCellOut(
                primary_value="femme", secondary_value="etr",
                n=20, favorable=4, selection_rate=0.2,
                disparate_impact=0.4, verdict="fail",
            ),
            IntersectionalCellOut(
                primary_value="femme", secondary_value="fr",
                n=80, favorable=32, selection_rate=0.4,
                disparate_impact=0.8, verdict="warn",
            ),
            IntersectionalCellOut(
                primary_value="homme", secondary_value="etr",
                n=30, favorable=15, selection_rate=0.5,
                disparate_impact=1.0, verdict="pass",
            ),
            IntersectionalCellOut(
                primary_value="homme", secondary_value="fr",
                n=120, favorable=60, selection_rate=0.5,
                disparate_impact=1.0, verdict="pass",
            ),
        ],
        reference_primary="homme",
        reference_secondary="fr",
        worst_primary="femme",
        worst_secondary="etr",
        disparate_impact=0.4,
        demographic_parity_diff=0.3,
        verdict="fail",
        risk_score=75,
        marginal_di=[0.82, 0.9],
    )


def _m1_with_intersectional() -> AuditOut:
    return AuditOut(
        id=uuid.uuid4(), code="AUD-2026-050", title="Recrutement Intersect.", status="done",
        module="M1", dataset_id=uuid.uuid4(), protected_attribute="genre",
        decision_column="embauche", favorable_value="oui", privileged_value=None,
        created_at=_NOW, completed_at=_NOW,
        metrics=M1MetricsOut(
            groups=[GroupStatOut(value="F", n=100, favorable=30,
                                 selection_rate=0.3, disparate_impact=0.6)],
            reference_value="H", disparate_impact=0.6,
            demographic_parity_diff=0.2, worst_group="F", verdict="fail",
            risk_score=80, warnings=[],
            intersectional=_intersectional_out(),
        ),
        interpretation=_interp(), pre_check=["Déséquilibre groupe F."],
        config=None,
    )


def test_html_m1_intersectional_section_present():
    h = build_report_html(_m1_with_intersectional())
    # Crossed subgroup values present
    assert "etr" in h
    assert "femme" in h
    assert "intersectionnel" in h
    # marginal DI values
    assert "0.82" in h
    assert "0.9" in h
    # worst cell labels
    assert "femme" in h
    # existing M1 content still present
    assert "Disparate Impact" in h
    assert "AUD-2026-050" in h


def test_html_m1_intersectional_section_absent():
    h = build_report_html(_m1())
    # no intersectional section
    assert "intersectionnel" not in h
    assert "etr" not in h
    # existing M1 content unchanged
    assert "Disparate Impact" in h
    assert "AUD-2026-001" in h


def test_html_m1_intersectional_escapes_hostile_primary_value():
    """primary_value with HTML tags must be _e-escaped in the intersectional section."""
    hostile_primary = "<b>femme</b>"
    audit = AuditOut(
        id=uuid.uuid4(), code="AUD-2026-060", title="XSS Intersect.", status="done",
        module="M1", dataset_id=uuid.uuid4(), protected_attribute="genre",
        decision_column="embauche", favorable_value="oui", privileged_value=None,
        created_at=_NOW, completed_at=_NOW,
        metrics=M1MetricsOut(
            groups=[GroupStatOut(value="F", n=100, favorable=30,
                                 selection_rate=0.3, disparate_impact=0.6)],
            reference_value="H", disparate_impact=0.6,
            demographic_parity_diff=0.2, worst_group="F", verdict="fail",
            risk_score=80, warnings=[],
            intersectional=IntersectionalOut(
                cells=[
                    IntersectionalCellOut(
                        primary_value=hostile_primary, secondary_value="etr",
                        n=20, favorable=4, selection_rate=0.2,
                        disparate_impact=0.4, verdict="fail",
                    ),
                ],
                reference_primary="homme",
                reference_secondary="fr",
                worst_primary=hostile_primary,
                worst_secondary="etr",
                disparate_impact=0.4,
                demographic_parity_diff=0.3,
                verdict="fail",
                risk_score=75,
                marginal_di=[0.82, 0.9],
            ),
        ),
        interpretation=_interp(), pre_check=[], config=None,
    )
    h = build_report_html(audit)
    # Raw hostile tag must NOT appear
    assert "<b>femme</b>" not in h
    # Escaped form must be present
    assert "&lt;b&gt;femme&lt;/b&gt;" in h


def _interp_with_recommendations(recs: list[RecommendationOut]) -> InterpretationOut:
    return InterpretationOut(
        narrative="Texte.",
        ai_act_anchors=["AI Act, article 10"],
        disclaimers=["Aide à l'analyse."],
        provider="fallback",
        model="deterministic",
        recommendations=recs,
    )


def _sample_audit_with_recommendations(recs: list[RecommendationOut]) -> AuditOut:
    return AuditOut(
        id=uuid.uuid4(), code="AUD-2026-REC", title="Recrutement Recos", status="done",
        module="M1", dataset_id=uuid.uuid4(), protected_attribute="genre",
        decision_column="embauche", favorable_value="oui", privileged_value=None,
        created_at=_NOW, completed_at=_NOW,
        metrics=M1MetricsOut(
            groups=[GroupStatOut(value="F", n=100, favorable=30,
                                 selection_rate=0.3, disparate_impact=0.6)],
            reference_value="H", disparate_impact=0.6,
            demographic_parity_diff=0.2, worst_group="F", verdict="fail",
            risk_score=80, warnings=[],
        ),
        interpretation=_interp_with_recommendations(recs),
        pre_check=[],
        config=None,
    )


def test_html_includes_recommendations_section_when_present() -> None:
    audit = _sample_audit_with_recommendations([
        RecommendationOut(title="Re-collecter", detail="Détail.", priority="high"),
    ])
    html = build_report_html(audit)
    assert '<section class="recommendations">' in html
    assert "Recommandations" in html
    assert "Re-collecter" in html
    assert "Action prioritaire" in html


def test_html_omits_recommendations_section_when_empty() -> None:
    audit = _sample_audit_with_recommendations([])
    html = build_report_html(audit)
    assert '<section class="recommendations">' not in html


def test_html_escapes_recommendation_xss() -> None:
    """A <script> tag in title/detail must be escaped — no raw injection."""
    audit = _sample_audit_with_recommendations([
        RecommendationOut(
            title="<script>alert(1)</script>",
            detail="Détail.",
            priority="high",
        ),
    ])
    html = build_report_html(audit)
    assert "<script>alert(1)</script>" not in html
    assert "&lt;script&gt;alert(1)&lt;/script&gt;" in html
