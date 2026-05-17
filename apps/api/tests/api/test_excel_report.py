import datetime
import io
import uuid

from openpyxl import load_workbook

from app.reporting.excel import build_excel_report
from app.schemas.audit import (
    AuditOut,
    ClusterStatOut,
    GroupStatOut,
    InterpretationOut,
    M1MetricsOut,
    M2MetricsOut,
)

_NOW = datetime.datetime(2026, 5, 16, tzinfo=datetime.timezone.utc)


def _interp() -> InterpretationOut:
    return InterpretationOut(
        narrative="Texte.",
        ai_act_anchors=["AI Act, article 10"],
        disclaimers=["Aide à l'analyse."],
        provider="fallback",
        model="deterministic",
    )


def _m1_audit() -> AuditOut:
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
            risk_score=80, warnings=[],
        ),
        interpretation=_interp(), pre_check=["Déséquilibre groupe F."],
        config=None,
    )


def _m2_audit() -> AuditOut:
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
            deviant_cluster_ids=[0], verdict="fail", risk_score=88, warnings=[],
        ),
        interpretation=_interp(), pre_check=[], config={"k": 2},
    )


def _text(b: bytes) -> str:
    wb = load_workbook(io.BytesIO(b))
    return " ".join(
        str(c.value)
        for ws in wb.worksheets
        for row in ws.iter_rows()
        for c in row
        if c.value is not None
    )


def test_build_excel_m1_has_sheets_and_not_a_certificate():
    b = build_excel_report(_m1_audit())
    assert isinstance(b, bytes) and len(b) > 0
    wb = load_workbook(io.BytesIO(b))
    assert "Résumé" in wb.sheetnames
    assert "Détail" in wb.sheetnames
    assert "Conformité" in wb.sheetnames
    t = _text(b)
    assert "n'est pas un certificat" in t
    assert "AUD-2026-001" in t
    assert "Disparate Impact" in t


def test_build_excel_m2_renders_cluster_detail():
    t = _text(build_excel_report(_m2_audit()))
    assert "AUD-2026-002" in t
    assert "p-value" in t or "Khi-deux" in t
    assert "n'est pas un certificat" in t


def _m3_audit() -> AuditOut:
    from app.schemas.audit import (
        CategoryStatOut,
        DivergentExampleOut,
        M3MetricsOut,
    )
    return AuditOut(
        id=uuid.uuid4(), code="AUD-2026-030", title="Chatbot", status="done",
        module="M3", dataset_id=None, protected_attribute=None,
        decision_column=None, favorable_value=None, privileged_value=None,
        created_at=_NOW, completed_at=_NOW,
        metrics=M3MetricsOut(
            categories=[CategoryStatOut(name="genre", length_gap=0.4,
                        sentiment_gap=0.2, refusal_rate=0.5, score=0.55,
                        verdict="warn")],
            global_score=0.55, verdict="warn", risk_score=55,
            divergent_examples=[DivergentExampleOut(category="genre",
                prompt_id="g1", variant_a="m", variant_b="f",
                excerpt_a="long", excerpt_b="Je ne peux pas",
                reason="refus")],
            n_pairs=1, n_calls_failed=0, warnings=[]),
        interpretation=_interp(), pre_check=[], config={"lang": "fr"},
    )


def test_build_excel_m3_section():
    import io

    from openpyxl import load_workbook

    from app.reporting.excel import build_excel_report

    wb = load_workbook(io.BytesIO(build_excel_report(_m3_audit())))
    text = " ".join(
        str(c.value) for ws in wb.worksheets for row in ws.iter_rows()
        for c in row if c.value is not None
    )
    assert "AUD-2026-030" in text
    assert "genre" in text
    assert "n'est pas un certificat" in text
