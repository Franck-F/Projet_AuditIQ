from __future__ import annotations

from dataclasses import dataclass


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
    groups: tuple[GroupStat, ...]
    reference_value: str
    disparate_impact: float
    demographic_parity_diff: float
    worst_group: str
    verdict: str
    risk_score: int
    warnings: tuple[str, ...] = ()

    def __post_init__(self) -> None:
        object.__setattr__(self, "groups", tuple(self.groups))
        object.__setattr__(self, "warnings", tuple(self.warnings))
