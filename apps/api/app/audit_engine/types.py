from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True)
class M1Config:
    protected_attribute: str
    decision_column: str
    favorable_value: object
    privileged_value: object | None = None
    di_fail_below: float = 0.80
    di_warn_below: float = 0.90
    min_group_error: int = 5
    min_group_warn: int = 30


@dataclass(frozen=True)
class GroupStat:
    value: str
    n: int
    favorable: int
    selection_rate: float
    disparate_impact: float


@dataclass(frozen=True)
class M1Result:
    groups: list[GroupStat]
    reference_value: str
    disparate_impact: float
    demographic_parity_diff: float
    worst_group: str
    verdict: str
    risk_score: int
    warnings: list[str] = field(default_factory=list)
