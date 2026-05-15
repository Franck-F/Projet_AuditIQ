class AuditEngineError(Exception):
    """Base error for the pure audit engine. No I/O, no framework deps."""


class DatasetValidationError(AuditEngineError):
    """Input data/config can't be audited. Caller maps this to HTTP 422."""

    def __init__(self, message: str, *, field: str | None = None) -> None:
        super().__init__(message)
        self.message = message
        self.field = field
