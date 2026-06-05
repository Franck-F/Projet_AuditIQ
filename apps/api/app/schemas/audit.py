from __future__ import annotations

import datetime
import uuid
from typing import Any, Literal

from pydantic import AnyHttpUrl, BaseModel, ConfigDict, Field, model_validator

Verdict = Literal["pass", "warn", "fail"]


class M2ConfigIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    features: list[str] | None = None
    k: int = 5
    deviation_pp: float = 20.0
    chi2_alpha: float = 0.05
    random_state: int = 42


class TargetIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    url: str
    method: str = "POST"
    headers: dict[str, str] = {}
    body_template: str
    response_path: str


class AuditCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    dataset_id: uuid.UUID | None = None
    title: str
    module: Literal["M1", "M2", "M3"] = "M1"
    protected_attribute: str | None = None
    decision_column: str | None = None
    favorable_value: str | None = None
    privileged_value: str | None = None
    ground_truth_column: str | None = None
    secondary_protected_attribute: str | None = None
    secondary_privileged_value: str | None = None
    config: M2ConfigIn | None = None
    target: TargetIn | None = None
    lang: str = "fr"

    @model_validator(mode="after")
    def _per_module(self) -> AuditCreate:
        if self.module == "M1":
            if self.dataset_id is None:
                raise ValueError("module M1 : 'dataset_id' est requis.")
            if not self.protected_attribute:
                raise ValueError(
                    "module M1 : 'protected_attribute' est requis."
                )
            if not self.decision_column:
                raise ValueError(
                    "module M1 : 'decision_column' est requis."
                )
            if not self.favorable_value:
                raise ValueError(
                    "module M1 : 'favorable_value' est requis."
                )
            if self.config is not None:
                raise ValueError("module M1 : 'config' n'est pas accepté.")
            if self.ground_truth_column is not None and (
                self.ground_truth_column == self.decision_column
                or self.ground_truth_column == self.protected_attribute
            ):
                raise ValueError(
                    "module M1 : 'ground_truth_column' doit différer des "
                    "colonnes décision et attribut protégé."
                )
            if self.secondary_protected_attribute is not None and (
                self.secondary_protected_attribute == self.protected_attribute
                or self.secondary_protected_attribute == self.decision_column
                or self.secondary_protected_attribute == self.ground_truth_column
            ):
                raise ValueError(
                    "module M1 : 'secondary_protected_attribute' doit différer "
                    "de l'attribut protégé, de la colonne décision et de la "
                    "colonne vérité-terrain."
                )
        elif self.module == "M2":
            if self.dataset_id is None:
                raise ValueError("module M2 : 'dataset_id' est requis.")
            if not self.decision_column:
                raise ValueError(
                    "module M2 : 'decision_column' est requis."
                )
            if not self.favorable_value:
                raise ValueError(
                    "module M2 : 'favorable_value' est requis."
                )
            if self.protected_attribute is not None:
                raise ValueError(
                    "module M2 : 'protected_attribute' ne s'applique pas "
                    "(détection non supervisée)."
                )
            if self.privileged_value is not None:
                raise ValueError(
                    "module M2 : 'privileged_value' ne s'applique pas."
                )
            if self.ground_truth_column is not None:
                raise ValueError(
                    "module M2 : 'ground_truth_column' ne s'applique pas "
                    "(M1 uniquement)."
                )
            if self.secondary_protected_attribute is not None:
                raise ValueError(
                    "module M2 : 'secondary_protected_attribute' ne "
                    "s'applique pas (M1 uniquement)."
                )
            if self.secondary_privileged_value is not None:
                raise ValueError(
                    "module M2 : 'secondary_privileged_value' ne "
                    "s'applique pas (M1 uniquement)."
                )
        elif self.module == "M3":
            if self.target is None:
                raise ValueError("module M3 : 'target' est requis.")
            if (
                self.protected_attribute is not None
                or self.decision_column is not None
                or self.favorable_value is not None
                or self.privileged_value is not None
                or self.ground_truth_column is not None
                or self.secondary_protected_attribute is not None
                or self.secondary_privileged_value is not None
                or self.config is not None
            ):
                raise ValueError(
                    "module M3 : 'protected_attribute'/'decision_column'/"
                    "'favorable_value'/'privileged_value'/'ground_truth_column'/"
                    "'secondary_protected_attribute'/'secondary_privileged_value'/"
                    "'config' ne s'appliquent pas."
                )
        return self


class GroupStatOut(BaseModel):
    model_config = ConfigDict(extra="forbid")

    value: str
    n: int
    favorable: int
    selection_rate: float
    disparate_impact: float
    tpr: float | None = None
    fpr: float | None = None


class IntersectionalCellOut(BaseModel):
    model_config = ConfigDict(extra="forbid")

    primary_value: str
    secondary_value: str
    n: int
    favorable: int
    selection_rate: float
    disparate_impact: float
    verdict: Verdict
    tpr: float | None = None
    fpr: float | None = None


class IntersectionalOut(BaseModel):
    model_config = ConfigDict(extra="forbid")

    cells: list[IntersectionalCellOut]
    reference_primary: str
    reference_secondary: str
    worst_primary: str
    worst_secondary: str
    disparate_impact: float
    demographic_parity_diff: float
    verdict: Verdict
    risk_score: int
    marginal_di: list[float]
    equal_opportunity_diff: float | None = None
    equalized_odds_diff: float | None = None
    demographic_parity_verdict: Verdict | None = None
    equal_opportunity_verdict: Verdict | None = None
    equalized_odds_verdict: Verdict | None = None
    warnings: list[str] = []
    reason: str | None = None


class M1MetricsOut(BaseModel):
    model_config = ConfigDict(extra="forbid")

    groups: list[GroupStatOut]
    reference_value: str
    disparate_impact: float
    demographic_parity_diff: float
    worst_group: str
    verdict: Verdict
    risk_score: int
    warnings: list[str]
    equal_opportunity_diff: float | None = None
    equalized_odds_diff: float | None = None
    demographic_parity_verdict: Verdict | None = None
    equal_opportunity_verdict: Verdict | None = None
    equalized_odds_verdict: Verdict | None = None
    truelabel_reason: str | None = None
    intersectional: IntersectionalOut | None = None


class FeatureContributionOut(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str
    std_diff: float
    direction: str


class ClusterStatOut(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: int
    n: int
    positive_rate: float
    deviation_pp: float
    is_deviant: bool
    top_features: list[FeatureContributionOut]


class M2MetricsOut(BaseModel):
    model_config = ConfigDict(extra="forbid")

    n: int
    k: int
    global_positive_rate: float
    chi2: float
    p_value: float
    dof: int
    clusters: list[ClusterStatOut]
    deviant_cluster_ids: list[int]
    verdict: Verdict
    risk_score: int
    warnings: list[str]


class CategoryStatOut(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str
    length_gap: float
    sentiment_gap: float
    refusal_rate: float
    score: float
    verdict: Verdict


class DivergentExampleOut(BaseModel):
    model_config = ConfigDict(extra="forbid")

    category: str
    prompt_id: str
    variant_a: str
    variant_b: str
    excerpt_a: str
    excerpt_b: str
    reason: str


class M3MetricsOut(BaseModel):
    model_config = ConfigDict(extra="forbid")

    categories: list[CategoryStatOut]
    global_score: float
    verdict: Verdict
    risk_score: int
    divergent_examples: list[DivergentExampleOut]
    n_pairs: int
    n_calls_failed: int
    warnings: list[str]


class RecommendationOut(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str = Field(min_length=1, max_length=200)
    detail: str = Field(min_length=1, max_length=1000)
    priority: Literal["high", "medium", "low"]


class InterpretationOut(BaseModel):
    model_config = ConfigDict(extra="forbid")

    narrative: str
    ai_act_anchors: list[str]
    disclaimers: list[str]
    provider: str
    model: str
    recommendations: list[RecommendationOut] = Field(default_factory=list)
    degraded: bool = False
    """True when the LLM path was attempted but failed (auth, network, quota,
    or unparseable output) and we fell back to the deterministic narrative.
    False on the LLM success path and on the expected no-provider fallback."""


class AuditOut(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="forbid")

    id: uuid.UUID
    code: str | None = None
    title: str
    status: str
    module: str
    dataset_id: uuid.UUID | None = None
    protected_attribute: str | None = None
    decision_column: str | None = None
    favorable_value: str | None = None
    privileged_value: str | None = None
    created_at: datetime.datetime
    completed_at: datetime.datetime | None = None
    error: str | None = None
    metrics: M1MetricsOut | M2MetricsOut | M3MetricsOut | None = None
    interpretation: InterpretationOut | None = None
    pre_check: list[str] = []
    config: dict[str, object] | None = None


class M3TestConnectionIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    target: TargetIn
    test_prompt: str = "Bonjour, peux-tu te présenter brièvement ?"


class M3TestConnectionOut(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: Literal["ok", "error"]
    elapsed_ms: int
    request_sent: dict[str, Any] | None = None
    response_raw: Any = None
    extracted_value: str | None = None
    error: str | None = None


class M3ValidateUrlIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    url: AnyHttpUrl


class M3ValidateUrlOut(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: Literal["ok"]
