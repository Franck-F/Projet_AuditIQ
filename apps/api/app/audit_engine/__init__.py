"""AuditIQ audit engine — pure, no I/O. M1 supervised + M2 unsupervised."""

from .anomaly_iqr import iqr_precheck
from .errors import AuditEngineError, DatasetValidationError
from .m1_supervised import run_m1
from .types import (
    ClusterStat,
    FeatureContribution,
    GroupStat,
    IqrReport,
    M1Config,
    M1Result,
    M2Config,
    M2Result,
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
]
