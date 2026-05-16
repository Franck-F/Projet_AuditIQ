import structlog

from app.core.logging import configure_logging, get_logger


def test_logging_emits_structured_event():
    configure_logging()
    with structlog.testing.capture_logs() as logs:
        get_logger("test").info("hello", rows=3)
    assert logs[0]["event"] == "hello"
    assert logs[0]["rows"] == 3
    assert logs[0]["log_level"] == "info"
