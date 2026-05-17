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


@dataclass(frozen=True)
class M2Config:
    decision_column: str
    positive_value: object
    feature_columns: tuple[str, ...] | None = None
    k: int = 5
    deviation_pp: float = 20.0
    chi2_alpha: float = 0.05
    random_state: int = 42
    min_rows_factor: int = 5
    min_rows_abs: int = 20
    min_cluster_warn: int = 30

    def __post_init__(self) -> None:
        if self.feature_columns is not None:
            object.__setattr__(
                self, "feature_columns", tuple(self.feature_columns)
            )


@dataclass(frozen=True)
class FeatureContribution:
    name: str
    std_diff: float
    direction: str  # "above" | "below"


@dataclass(frozen=True)
class ClusterStat:
    id: int
    n: int
    positive_rate: float
    deviation_pp: float
    is_deviant: bool
    top_features: tuple[FeatureContribution, ...] = ()

    def __post_init__(self) -> None:
        object.__setattr__(self, "top_features", tuple(self.top_features))


@dataclass(frozen=True)
class M2Result:
    n: int
    k: int
    global_positive_rate: float
    chi2: float
    p_value: float
    dof: int
    clusters: tuple[ClusterStat, ...]
    deviant_cluster_ids: tuple[int, ...]
    verdict: str
    risk_score: int
    warnings: tuple[str, ...] = ()

    def __post_init__(self) -> None:
        object.__setattr__(self, "clusters", tuple(self.clusters))
        object.__setattr__(
            self, "deviant_cluster_ids", tuple(self.deviant_cluster_ids)
        )
        object.__setattr__(self, "warnings", tuple(self.warnings))


@dataclass(frozen=True)
class IqrReport:
    warnings: tuple[str, ...] = ()

    def __post_init__(self) -> None:
        object.__setattr__(self, "warnings", tuple(self.warnings))


@dataclass(frozen=True)
class M3Config:
    lang: str = "fr"
    score_warn: float = 0.34
    score_fail: float = 0.67


@dataclass(frozen=True)
class PromptVariant:
    attribute_label: str
    fr: str
    en: str


@dataclass(frozen=True)
class PromptPair:
    id: str
    category: str
    variants: tuple[PromptVariant, ...]

    def __post_init__(self) -> None:
        object.__setattr__(self, "variants", tuple(self.variants))


@dataclass(frozen=True)
class ResponseRecord:
    pair_id: str
    category: str
    variant_label: str
    text: str
    failed: bool = False


@dataclass(frozen=True)
class M3Responses:
    records: tuple[ResponseRecord, ...]

    def __post_init__(self) -> None:
        object.__setattr__(self, "records", tuple(self.records))


@dataclass(frozen=True)
class CategoryStat:
    name: str
    length_gap: float
    sentiment_gap: float
    refusal_rate: float
    score: float
    verdict: str


@dataclass(frozen=True)
class DivergentExample:
    category: str
    prompt_id: str
    variant_a: str
    variant_b: str
    excerpt_a: str
    excerpt_b: str
    reason: str


@dataclass(frozen=True)
class M3Result:
    categories: tuple[CategoryStat, ...]
    global_score: float
    verdict: str
    risk_score: int
    divergent_examples: tuple[DivergentExample, ...]
    n_pairs: int
    n_calls_failed: int
    warnings: tuple[str, ...] = ()

    def __post_init__(self) -> None:
        object.__setattr__(self, "categories", tuple(self.categories))
        object.__setattr__(
            self, "divergent_examples", tuple(self.divergent_examples)
        )
        object.__setattr__(self, "warnings", tuple(self.warnings))
