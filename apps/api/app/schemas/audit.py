from __future__ import annotations

import datetime
import uuid
from typing import Literal

from pydantic import BaseModel, ConfigDict, model_validator

Verdict = Literal["pass", "warn", "fail"]


class M2ConfigIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    features: list[str] | None = None
    k: int = 5
    deviation_pp: float = 20.0
    chi2_alpha: float = 0.05


class AuditCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    dataset_id: uuid.UUID
    title: str
    module: Literal["M1", "M2"] = "M1"
    protected_attribute: str | None = None
    decision_column: str
    favorable_value: str
    privileged_value: str | None = None
    config: M2ConfigIn | None = None

    @model_validator(mode="after")
    def _per_module(self) -> AuditCreate:
        if self.module == "M1":
            if not self.protected_attribute:
                raise ValueError(
                    "module M1 : 'protected_attribute' est requis."
                )
            if self.config is not None:
                raise ValueError("module M1 : 'config' n'est pas accepté.")
        else:
            if self.protected_attribute is not None:
                raise ValueError(
                    "module M2 : 'protected_attribute' ne s'applique pas "
                    "(détection non supervisée)."
                )
            if self.privileged_value is not None:
                raise ValueError(
                    "module M2 : 'privileged_value' ne s'applique pas."
                )
        return self


class GroupStatOut(BaseModel):
    model_config = ConfigDict(extra="forbid")

    value: str
    n: int
    favorable: int
    selection_rate: float
    disparate_impact: float


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


class InterpretationOut(BaseModel):
    model_config = ConfigDict(extra="forbid")

    narrative: str
    ai_act_anchors: list[str]
    disclaimers: list[str]
    provider: str
    model: str


class AuditOut(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="forbid")

    id: uuid.UUID
    code: str | None = None
    title: str
    status: str
    module: str
    dataset_id: uuid.UUID
    protected_attribute: str | None = None
    decision_column: str
    favorable_value: str
    privileged_value: str | None = None
    created_at: datetime.datetime
    completed_at: datetime.datetime | None = None
    metrics: M1MetricsOut | M2MetricsOut | None = None
    interpretation: InterpretationOut | None = None
    pre_check: list[str] = []
    config: dict[str, object] | None = None
