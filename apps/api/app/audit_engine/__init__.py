"""AuditIQ audit engine — pure, no I/O. M1 supervised + M2 unsupervised + M3 LLM."""

from .anomaly_iqr import iqr_precheck
from .dataset_analysis import run_dataset_analysis
from .errors import AuditEngineError, DatasetValidationError
from .intersectional import run_intersectional
from .llm_audit import run_m3
from .llm_prompt_bank import PROMPT_BANK
from .m1_supervised import run_m1
from .metrics import (
    gap_verdict,
    truelabel_metrics,
)
from .types import (
    CategoryStat,
    ClusterStat,
    ColumnProfile,
    DatasetAnalysis,
    DivergentExample,
    FeatureContribution,
    GroupStat,
    IntersectionalCell,
    IntersectionalResult,
    IqrReport,
    M1Config,
    M1Result,
    M2Config,
    M2Result,
    M3Config,
    M3Responses,
    M3Result,
    PromptPair,
    PromptVariant,
    ResponseRecord,
    Suggestion,
)
from .unsupervised import run_m2

__all__ = [
    "ColumnProfile",
    "DatasetAnalysis",
    "Suggestion",
    "run_dataset_analysis",
    "run_m1",
    "run_m2",
    "iqr_precheck",
    "M1Config",
    "M1Result",
    "GroupStat",
    "M2Config",
    "M2Result",
    "ClusterStat",
    "FeatureContribution",
    "IqrReport",
    "AuditEngineError",
    "DatasetValidationError",
    "run_m3",
    "PROMPT_BANK",
    "M3Config",
    "M3Responses",
    "ResponseRecord",
    "M3Result",
    "CategoryStat",
    "DivergentExample",
    "PromptPair",
    "PromptVariant",
    "gap_verdict",
    "truelabel_metrics",
    "IntersectionalCell",
    "IntersectionalResult",
    "run_intersectional",
]
