"""AuditIQ audit engine — pure, no I/O. M1 supervised + M2 unsupervised + M3 LLM."""

from .anomaly_iqr import iqr_precheck
from .errors import AuditEngineError, DatasetValidationError
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
    DivergentExample,
    FeatureContribution,
    GroupStat,
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
)
from .unsupervised import run_m2

__all__ = [
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
]
