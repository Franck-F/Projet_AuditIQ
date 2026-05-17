# M3-B — Backend LLM-Audit (target client + SSRF + service/API) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the merged pure M3 engine into the API: an SSRF-hardened generic target-LLM HTTP client, migration `0004`, M3 DTOs, `interpret_m3`, synchronous `run_m3_audit` (bounded-concurrency + deadline), router dispatch, and a transversal M3 report branch.

**Architecture:** Extend the delivered M2 backend (schemas union+validator, `audit_service`, migrations, `reporting/`). M3 audits have no dataset — `0004` makes `dataset_id/decision_column/favorable_value` nullable; M3 target config (minus secrets) goes in `audits.config`. The LLM is called by the service (impure), never by the engine. SSRF mitigation (resolve+validate all IPs, IP-pinned connect, https-only, no redirects, size/time caps, no secret logging) is a first-order requirement.

**Tech Stack:** FastAPI, httpx, respx (tests), SQLAlchemy/Alembic, stdlib `socket`/`ipaddress`/`asyncio`. M3-A engine on `main` (`run_m3`, `PROMPT_BANK`, M3 types). No new dependency.

---

## Scope

Plan **M3-B** of the M3 decomposition (spec `docs/superpowers/specs/2026-05-17-m3-llm-audit-design.md` §6–§12). M3-A merged. **In:** M3 `Settings`, migration `0004`, `integrations/llm_target.py` (+SSRF), M3 DTOs + `module="M3"` validator, `interpretation/m3.py` + `prompts/m3_fr.md`, `audit_service.run_m3_audit` + module-aware `get_audit`, router dispatch, transversal M3 branch in `reporting/excel.py`+`reporting/html.py`. **Out:** all `apps/web` (M3-C). Python tests mock the target LLM over HTTP (respx) so they need no real network.

Run from `apps/api/`. `uv run python -m pytest`. Commit `git -c core.autocrlf=false commit` (author Franck F preconfigured; **never** Co-Authored-By/Claude trailer). **At execution start, in the worktree run `git config user.name "Franck F"; git config user.email "franck-dilane1.fambou@epitech.digital"`** (fresh worktrees don't inherit it; the M3-A fixup commit leaked a malformed `epitech` author — pin first).

## File Structure

- Modify `app/core/config.py` — 6 `llm_*` settings.
- Create `migrations/versions/0004_m3.py` — `dataset_id`/`decision_column`/`favorable_value` nullable.
- Modify `app/models/audit.py` — those 3 columns → nullable.
- Create `app/integrations/llm_target.py` — `TargetConfig`, `call_target_llm`, SSRF guard, restricted `response_path`.
- Modify `app/schemas/audit.py` — `TargetIn`, `CategoryStatOut`, `DivergentExampleOut`, `M3MetricsOut`; `AuditCreate` `module="M3"` + validator; `AuditOut.metrics` union; optional M1 columns already nullable from 0002.
- Create `app/interpretation/m3.py`, `app/interpretation/prompts/m3_fr.md`.
- Modify `app/services/audit_service.py` — `_to_m3_metrics_out`, `run_m3_audit`, module-aware `get_audit`.
- Modify `app/routers/audits.py` — dispatch `module=="M3"`.
- Modify `app/reporting/excel.py` + `app/reporting/html.py` — M3 branch.
- Tests: `tests/api/test_migration_0004.py`, `test_llm_target.py`, `test_schemas_m3.py`, `test_interpret_m3.py`, `test_audit_service_m3.py`, extend `test_audits_router.py`, `test_excel_report.py`, `test_report_html.py`.

Patterns to follow (read first): `app/schemas/audit.py` (the M1|M2 union + `_per_module` validator), `app/services/audit_service.py` (`run_m2_audit`, `get_audit`, `_to_m2_metrics_out`), `migrations/versions/0002_m2.py`/`0003_reports.py`, `app/integrations/llm_target.py`-analog `app/reporting/pdf_client.py` (httpx + `APIError` 502), `app/interpretation/m2.py` + `prompts/m2_fr.md`, `app/reporting/excel.py`/`html.py` (M1/M2 `isinstance` branches), `app/core/errors.py` (`APIError(detail,*,title,status)`), `tests/api/test_audit_service_m2.py` (`ctx` fixture), `tests/api/test_pdf_client.py` (respx pattern). Conventions: single `AuditCreate` + `@model_validator` per module; `extra="forbid"`; services raise `APIError`/engine `DatasetValidationError` → RFC 7807; `_JSON = sa.JSON().with_variant(JSONB,"postgresql")`; `interpret_*` never raises (deterministic fallback).

---

### Task 1: M3 settings

**Files:**
- Modify: `app/core/config.py`
- Test: `tests/api/test_config_m3.py`

- [ ] **Step 1: Write the failing test**

Create `tests/api/test_config_m3.py`:

```python
from app.core.config import Settings


def test_m3_defaults():
    s = Settings(_env_file=None)
    assert s.llm_target_timeout_s == 20
    assert s.llm_target_max_concurrency == 4
    assert s.llm_audit_max_calls == 80
    assert s.llm_audit_deadline_s == 45
    assert s.llm_target_max_bytes == 1_000_000
    assert s.llm_target_allow_http is False


def test_m3_env_override(monkeypatch):
    monkeypatch.setenv("LLM_TARGET_ALLOW_HTTP", "true")
    monkeypatch.setenv("LLM_AUDIT_MAX_CALLS", "10")
    s = Settings(_env_file=None)
    assert s.llm_target_allow_http is True
    assert s.llm_audit_max_calls == 10
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run python -m pytest tests/api/test_config_m3.py -v`
Expected: FAIL — `Settings` has no `llm_*` fields.

- [ ] **Step 3: Write minimal implementation**

In `app/core/config.py`, add directly below the `pdf_service_secret` line in `Settings`:

```python
    llm_target_timeout_s: int = 20
    llm_target_max_concurrency: int = 4
    llm_audit_max_calls: int = 80
    llm_audit_deadline_s: int = 45
    llm_target_max_bytes: int = 1_000_000
    llm_target_allow_http: bool = False
```

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run python -m pytest tests/api/test_config_m3.py tests/api/test_config.py -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/core/config.py tests/api/test_config_m3.py
git -c core.autocrlf=false commit -m "feat(api): M3 target-LLM settings"
```

---

### Task 2: Migration 0004 (M3 nullable columns)

**Files:**
- Modify: `app/models/audit.py`
- Create: `migrations/versions/0004_m3.py`
- Test: `tests/api/test_migration_0004.py`

- [ ] **Step 1: Write the failing test**

Create `tests/api/test_migration_0004.py`:

```python
from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect


def test_0004_makes_m3_columns_nullable_and_reverses(tmp_path, monkeypatch):
    db = tmp_path / "m3.db"
    monkeypatch.setenv("SUPABASE_DB_URL", f"sqlite+aiosqlite:///{db}")
    cfg = Config("alembic.ini")

    command.upgrade(cfg, "head")
    cols = {
        c["name"]: c
        for c in inspect(create_engine(f"sqlite:///{db}")).get_columns("audits")
    }
    assert cols["dataset_id"]["nullable"] is True
    assert cols["decision_column"]["nullable"] is True
    assert cols["favorable_value"]["nullable"] is True

    command.downgrade(cfg, "0003")
    cols2 = {
        c["name"]: c
        for c in inspect(create_engine(f"sqlite:///{db}")).get_columns("audits")
    }
    assert cols2["decision_column"]["nullable"] is False
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run python -m pytest tests/api/test_migration_0004.py -v`
Expected: FAIL — no `0004` revision.

- [ ] **Step 3: Write minimal implementation**

Create `migrations/versions/0004_m3.py`:

```python
"""m3: dataset_id/decision_column/favorable_value nullable

Revision ID: 0004
Revises: 0003
Create Date: 2026-05-17
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("audits") as b:
        b.alter_column("dataset_id", existing_type=sa.Uuid(), nullable=True)
        b.alter_column("decision_column", existing_type=sa.String(255),
                        nullable=True)
        b.alter_column("favorable_value", existing_type=sa.String(255),
                        nullable=True)


def downgrade() -> None:
    with op.batch_alter_table("audits") as b:
        b.alter_column("favorable_value", existing_type=sa.String(255),
                        nullable=False)
        b.alter_column("decision_column", existing_type=sa.String(255),
                        nullable=False)
        b.alter_column("dataset_id", existing_type=sa.Uuid(), nullable=False)
```

In `app/models/audit.py`, change the three columns' `Mapped[...]` + `nullable=`:

```python
    dataset_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("datasets.id"), nullable=True
    )
```
```python
    decision_column: Mapped[str | None] = mapped_column(
        String(255), nullable=True
    )
    favorable_value: Mapped[str | None] = mapped_column(
        String(255), nullable=True
    )
```
(Keep every other column exactly; `protected_attribute`/`privileged_value` are already nullable from 0002.)

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run python -m pytest tests/api/test_migration_0004.py tests/api/test_migrations.py tests/api/test_migration_0002.py tests/api/test_migration_0003.py -v`
Expected: PASS (new + existing migration tests; up→down→up clean).

- [ ] **Step 5: Commit**

```bash
git add app/models/audit.py migrations/versions/0004_m3.py tests/api/test_migration_0004.py
git -c core.autocrlf=false commit -m "feat(api): migration 0004 — M3 nullable audit columns"
```

---

### Task 3: SSRF-hardened target-LLM client

**Files:**
- Create: `app/integrations/llm_target.py`
- Test: `tests/api/test_llm_target.py`

- [ ] **Step 1: Write the failing test**

Create `tests/api/test_llm_target.py`:

```python
import httpx
import pytest
import respx

from app.core.errors import APIError
from app.integrations.llm_target import TargetConfig, call_target_llm, extract


def test_extract_restricted_path():
    data = {"choices": [{"message": {"content": "salut"}}]}
    assert extract(data, "choices.0.message.content") == "salut"
    with pytest.raises(APIError):
        extract(data, "choices.5.message.content")
    with pytest.raises(APIError):
        extract({"a": 1}, "a.b")


@pytest.mark.parametrize("url", [
    "http://127.0.0.1/render",
    "http://localhost/x",
    "http://169.254.169.254/latest/meta-data",
    "http://10.0.0.5/v1",
    "http://[::1]/v1",
])
async def test_ssrf_blocks_private_and_metadata(url, monkeypatch):
    monkeypatch.setenv("LLM_TARGET_ALLOW_HTTP", "true")
    from app.core.config import get_settings

    get_settings.cache_clear()
    try:
        cfg = TargetConfig(url=url, method="POST", headers={},
                           body_template='{"p":"{prompt}"}',
                           response_path="a")
        with pytest.raises(APIError) as e:
            await call_target_llm(cfg, "hello")
        assert e.value.status == 422
    finally:
        get_settings.cache_clear()


async def test_https_required_outside_dev(monkeypatch):
    monkeypatch.setenv("API_ENV", "production")
    monkeypatch.setenv("LLM_TARGET_ALLOW_HTTP", "false")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "k")
    monkeypatch.setenv("SUPABASE_URL", "https://x.supabase.co")
    monkeypatch.setenv("SUPABASE_DB_URL", "postgresql+asyncpg://u:p@h/d")
    from app.core.config import get_settings

    get_settings.cache_clear()
    try:
        cfg = TargetConfig(url="http://api.example.com/v1", method="POST",
                           headers={}, body_template='{"p":"{prompt}"}',
                           response_path="a")
        with pytest.raises(APIError) as e:
            await call_target_llm(cfg, "hi")
        assert e.value.status == 422
    finally:
        get_settings.cache_clear()


@respx.mock
async def test_call_success_substitutes_prompt_and_extracts(monkeypatch):
    # Resolve to a public IP so the SSRF guard passes; respx intercepts.
    import app.integrations.llm_target as m

    monkeypatch.setattr(m, "_resolve_ips",
                        lambda host: ["93.184.216.34"])
    route = respx.post("https://api.example.com/v1").mock(
        return_value=httpx.Response(
            200, json={"choices": [{"message": {"content": "Bonjour"}}]}
        )
    )
    cfg = TargetConfig(
        url="https://api.example.com/v1", method="POST",
        headers={"Authorization": "Bearer SECRET"},
        body_template='{"messages":[{"role":"user","content":"{prompt}"}]}',
        response_path="choices.0.message.content",
    )
    out = await call_target_llm(cfg, 'dis "bonjour"')
    assert out == "Bonjour"
    sent = route.calls[0].request
    assert sent.headers["authorization"] == "Bearer SECRET"
    import json as _j
    assert _j.loads(sent.content)["messages"][0]["content"] == 'dis "bonjour"'


@respx.mock
async def test_call_5xx_raises(monkeypatch):
    import app.integrations.llm_target as m

    monkeypatch.setattr(m, "_resolve_ips", lambda host: ["93.184.216.34"])
    respx.post("https://api.example.com/v1").mock(
        return_value=httpx.Response(503)
    )
    cfg = TargetConfig(url="https://api.example.com/v1", method="POST",
                       headers={}, body_template='{"p":"{prompt}"}',
                       response_path="a")
    with pytest.raises(APIError):
        await call_target_llm(cfg, "x")
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run python -m pytest tests/api/test_llm_target.py -v`
Expected: FAIL — `ModuleNotFoundError: app.integrations.llm_target`.

- [ ] **Step 3: Write minimal implementation**

Create `app/integrations/llm_target.py`:

```python
"""Generic, SSRF-hardened HTTP client to an arbitrary target LLM.

First-order security: resolve & validate every IP, pin the connection to a
validated IP (no DNS rebinding), https outside dev, no redirects, timeout,
streamed size cap, secrets never logged.
"""
from __future__ import annotations

import ipaddress
import json
import socket
from dataclasses import dataclass

import httpx

from app.core.config import get_settings
from app.core.errors import APIError

_METADATA = {"169.254.169.254", "fd00:ec2::254"}


@dataclass(frozen=True)
class TargetConfig:
    url: str
    method: str
    headers: dict[str, str]
    body_template: str
    response_path: str


def _bad(detail: str) -> APIError:
    return APIError(detail, title="Unprocessable Entity", status=422)


def extract(data: object, path: str) -> str:
    """Restricted dotted/index path resolver (no eval). Raises APIError 422."""
    cur: object = data
    for part in path.split("."):
        if isinstance(cur, list):
            try:
                cur = cur[int(part)]
            except (ValueError, IndexError) as exc:
                raise _bad(
                    f"response_path : index « {part} » invalide."
                ) from exc
        elif isinstance(cur, dict) and part in cur:
            cur = cur[part]
        else:
            raise _bad(f"response_path : segment « {part} » introuvable.")
    if not isinstance(cur, str):
        raise _bad("response_path : la valeur extraite n'est pas du texte.")
    return cur


def _resolve_ips(host: str) -> list[str]:
    infos = socket.getaddrinfo(host, None)
    return [i[4][0] for i in infos]


def _assert_public(url: str) -> tuple[str, list[str]]:
    """Validate scheme + every resolved IP. Returns (host, validated_ips)."""
    s = get_settings()
    parsed = httpx.URL(url)
    scheme = parsed.scheme
    host = parsed.host
    if scheme == "http" and not (
        s.api_env.lower() == "development" or s.llm_target_allow_http
    ):
        raise _bad("URL cible : https requis.")
    if scheme not in ("http", "https"):
        raise _bad("URL cible : schéma non autorisé.")
    if not host:
        raise _bad("URL cible : hôte manquant.")
    try:
        ips = _resolve_ips(host)
    except OSError as exc:
        raise _bad("URL cible : hôte non résolu.") from exc
    if not ips:
        raise _bad("URL cible : aucune adresse résolue.")
    for ip in ips:
        if ip in _METADATA:
            raise _bad("URL cible : adresse de métadonnées interdite.")
        addr = ipaddress.ip_address(ip)
        if (
            addr.is_private
            or addr.is_loopback
            or addr.is_link_local
            or addr.is_multicast
            or addr.is_reserved
            or addr.is_unspecified
        ):
            raise _bad(
                "URL cible : adresse non publique interdite (SSRF)."
            )
    return host, ips


async def call_target_llm(cfg: TargetConfig, prompt: str) -> str:
    """POST the prompt-substituted body to the validated, IP-pinned target.

    Raises APIError on SSRF/validation (422) or transport/non-2xx (502).
    """
    host, ips = _assert_public(cfg.url)
    parsed = httpx.URL(cfg.url)
    pinned = parsed.copy_with(host=ips[0])
    body = cfg.body_template.replace(
        "{prompt}", json.dumps(prompt)[1:-1]
    )
    timeout = httpx.Timeout(float(get_settings().llm_target_timeout_s))
    max_bytes = get_settings().llm_target_max_bytes
    try:
        async with httpx.AsyncClient(
            timeout=timeout, follow_redirects=False
        ) as client:
            req = client.build_request(
                cfg.method,
                pinned,
                content=body.encode(),
                headers={
                    **cfg.headers,
                    "Host": host,
                    "Content-Type": "application/json",
                },
                extensions={"sni_hostname": host},
            )
            resp = await client.send(req, stream=True)
            try:
                chunks: list[bytes] = []
                size = 0
                async for c in resp.aiter_bytes():
                    size += len(c)
                    if size > max_bytes:
                        raise _bad("Réponse du LLM cible trop volumineuse.")
                    chunks.append(c)
            finally:
                await resp.aclose()
            resp.raise_for_status()
    except APIError:
        raise
    except httpx.HTTPError as exc:
        raise APIError(
            "Le LLM cible est injoignable ou a renvoyé une erreur.",
            title="Bad Gateway",
            status=502,
        ) from exc
    try:
        data = json.loads(b"".join(chunks).decode())
    except (ValueError, UnicodeDecodeError) as exc:
        raise APIError(
            "Réponse du LLM cible illisible (JSON attendu).",
            title="Bad Gateway",
            status=502,
        ) from exc
    return extract(data, cfg.response_path)
```

> Note: respx matches the request URL. The success/5xx tests `monkeypatch` `_resolve_ips` to a public IP and respx matches `https://api.example.com/v1` — httpx's `copy_with(host=ip)` keeps the URL path; respx route on the original URL still matches because respx pattern-matches scheme+host+path and the test registers the pattern on the original host. If respx does not match the IP-swapped host, the implementer must register the respx route on the pinned IP URL instead — adjust the test's `respx.post(...)` target to `f"https://{ip}/v1"` accordingly and keep the assertion on `route.calls[0].request` headers/content. Pick whichever respx matching the installed version supports; the security behavior (validate+pin) must not be weakened.

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run python -m pytest tests/api/test_llm_target.py -v`
Expected: PASS (extract, 5 SSRF-block params, https-required, success, 5xx).

- [ ] **Step 5: Commit**

```bash
git add app/integrations/llm_target.py tests/api/test_llm_target.py
git -c core.autocrlf=false commit -m "feat(api): SSRF-hardened target-LLM client"
```

---

### Task 4: M3 DTOs + module validator

**Files:**
- Modify: `app/schemas/audit.py`
- Test: `tests/api/test_schemas_m3.py`

- [ ] **Step 1: Write the failing test**

Create `tests/api/test_schemas_m3.py`:

```python
import uuid

import pytest
from pydantic import ValidationError

from app.schemas.audit import AuditCreate, M3MetricsOut


def test_m3_create_requires_target_forbids_dataset_fields():
    a = AuditCreate(
        dataset_id=uuid.uuid4(), title="t", module="M3",
        target={"url": "https://x/y", "method": "POST", "headers": {},
                "body_template": '{"p":"{prompt}"}',
                "response_path": "a.b"},
        lang="fr",
    )
    assert a.module == "M3"
    assert a.target is not None and a.target.response_path == "a.b"
    with pytest.raises(ValidationError):
        AuditCreate(dataset_id=uuid.uuid4(), title="t", module="M3")  # no target
    with pytest.raises(ValidationError):
        AuditCreate(
            dataset_id=uuid.uuid4(), title="t", module="M3",
            decision_column="d",  # not allowed for M3
            target={"url": "https://x", "method": "POST", "headers": {},
                    "body_template": "{prompt}", "response_path": "a"},
        )


def test_m3_metrics_out_shape():
    m = M3MetricsOut(
        categories=[{"name": "genre", "length_gap": 0.1,
                     "sentiment_gap": 0.2, "refusal_rate": 0.0,
                     "score": 0.15, "verdict": "pass"}],
        global_score=0.15, verdict="pass", risk_score=15,
        divergent_examples=[{"category": "genre", "prompt_id": "g1",
                             "variant_a": "m", "variant_b": "f",
                             "excerpt_a": "x", "excerpt_b": "y",
                             "reason": "longueur"}],
        n_pairs=1, n_calls_failed=0, warnings=[],
    )
    assert m.categories[0].name == "genre"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run python -m pytest tests/api/test_schemas_m3.py -v`
Expected: FAIL — `ImportError: cannot import name 'M3MetricsOut'`.

- [ ] **Step 3: Write minimal implementation**

In `app/schemas/audit.py` add after `M2MetricsOut` (keep all existing models):

```python
class TargetIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    url: str
    method: str = "POST"
    headers: dict[str, str] = {}
    body_template: str
    response_path: str


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
```

Extend `AuditCreate`: add fields `target: TargetIn | None = None` and `lang: str = "fr"`, allow `"M3"` in the `module` Literal, and extend the `_per_module` validator's branch (keep M1/M2 rules unchanged):

```python
    module: Literal["M1", "M2", "M3"] = "M1"
    ...
    target: TargetIn | None = None
    lang: str = "fr"
```
add to `_per_module` (after the M2 branch, before `return self`):
```python
        if self.module == "M3":
            if self.target is None:
                raise ValueError("module M3 : 'target' est requis.")
            if (
                self.protected_attribute is not None
                or self.decision_column is not None
                or self.favorable_value is not None
                or self.config is not None
            ):
                raise ValueError(
                    "module M3 : 'protected_attribute'/'decision_column'/"
                    "'favorable_value'/'config' ne s'appliquent pas."
                )
```
> The existing M1/M2 branches must NOT require their fields when `module=="M3"`. If `_per_module` currently has `if self.module == "M1": ... elif self.module == "M2": ...`, add an `elif self.module == "M3":` so M1/M2 validation never runs for M3 (read the real validator and integrate cleanly — keep M1/M2 behaviour identical).

`AuditOut.metrics` becomes `M1MetricsOut | M2MetricsOut | M3MetricsOut | None`.

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run python -m pytest tests/api/test_schemas_m3.py tests/api/test_schemas_m2.py tests/api/test_audits_router.py -v`
Expected: PASS (new + existing M1/M2 schema/router still green).

- [ ] **Step 5: Commit**

```bash
git add app/schemas/audit.py tests/api/test_schemas_m3.py
git -c core.autocrlf=false commit -m "feat(api): M3 DTOs + module validator"
```

---

### Task 5: M3 interpretation + prompt + fallback

**Files:**
- Create: `app/interpretation/prompts/m3_fr.md`
- Create: `app/interpretation/m3.py`
- Test: `tests/api/test_interpret_m3.py`

- [ ] **Step 1: Write the failing test**

Create `tests/api/test_interpret_m3.py`:

```python
import json

from app.audit_engine import M3Config, M3Responses, ResponseRecord, run_m3
from app.interpretation.m3 import interpret_m3


def _result():
    recs = [
        ResponseRecord(pair_id="g1", category="genre", variant_label="m",
                       text="Une réponse correcte et suffisamment longue."),
        ResponseRecord(pair_id="g1", category="genre", variant_label="f",
                       text="Je ne peux pas répondre à cette demande."),
    ]
    return run_m3(M3Responses(records=recs), M3Config())


async def test_interpret_m3_fallback_when_no_provider():
    out = await interpret_m3(_result(), provider=None)
    assert out.provider == "fallback"
    assert out.model == "deterministic"
    anchors = " ".join(out.ai_act_anchors)
    assert "50" in anchors
    assert out.narrative
    assert out.disclaimers


class _Fake:
    name = "fake"
    model = "fake-1"

    async def complete(self, prompt: str, *, as_json: bool = False) -> str:
        return json.dumps({"narrative": "Texte FR.",
                           "ai_act_anchors": ["AI Act, article 50"],
                           "disclaimers": ["Signal à approfondir."]})


async def test_interpret_m3_uses_provider_then_falls_back():
    out = await interpret_m3(_result(), provider=_Fake())
    assert out.provider == "fake"
    assert out.narrative == "Texte FR."

    class _Boom:
        name = "boom"
        model = "x"

        async def complete(self, prompt: str, *, as_json: bool = False) -> str:
            raise RuntimeError("down")

    out2 = await interpret_m3(_result(), provider=_Boom())
    assert out2.provider == "fallback"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run python -m pytest tests/api/test_interpret_m3.py -v`
Expected: FAIL — `ModuleNotFoundError: app.interpretation.m3`.

- [ ] **Step 3: Write minimal implementation**

Create `app/interpretation/prompts/m3_fr.md`:

```markdown
# Prompt M3 — interprétation audit LLM/chatbot (FR) — v1

Tu expliques à des non-spécialistes, en français clair, un audit M3 d'un
chatbot/LLM : on lui a soumis des prompts pairés ne différant que par un
attribut sensible et on a mesuré, par catégorie, les écarts de longueur, de
sentiment et l'asymétrie de refus. Métriques au format JSON :

{metrics_json}

Consignes STRICTES :
- Explique simplement (3–6 phrases) quelles catégories montrent un écart de
  traitement et de quelle nature (longueur / ton / refus).
- Cite les ancrages : AI Act article 50 (transparence des systèmes d'IA
  générative en contact avec le public) et la doctrine de la CNIL sur les
  chatbots.
- N'emploie JAMAIS de formulation absolue (« certifié conforme », « garanti »,
  « 100 % »).
- Termine par les limites : sentiment lexical grossier et détection de refus
  heuristique sur des réponses courtes — un signal à approfondir, pas une
  preuve de discrimination.

Réponds UNIQUEMENT par un objet JSON valide, sans texte autour :
{{"narrative": "<texte FR>", "ai_act_anchors": ["..."], "disclaimers": ["..."]}}
```

Create `app/interpretation/m3.py` (mirror `app/interpretation/m2.py` exactly, M3 data + anchors):

```python
from __future__ import annotations

import json
from importlib import resources

from app.audit_engine import M3Result
from app.interpretation.base import LLMProvider
from app.schemas.audit import InterpretationOut

_AI_ACT_ANCHORS = [
    "AI Act, article 50 (transparence des systèmes d'IA générative en "
    "contact avec le public)",
    "Doctrine CNIL sur les chatbots en contact avec le public",
]
_DISCLAIMERS = [
    "Signal statistique à approfondir : ni une preuve de discrimination, ni "
    "une certification.",
    "Sentiment lexical grossier et détection de refus heuristique sur des "
    "réponses courtes — fiabilité limitée.",
    "Banque de prompts réduite (~10 paires) : couverture indicative.",
]


def load_prompt_template() -> str:
    return (
        resources.files("app.interpretation.prompts")
        .joinpath("m3_fr.md")
        .read_text(encoding="utf-8")
    )


def _metrics_json(result: M3Result) -> str:
    return json.dumps(
        {
            "verdict": result.verdict,
            "risk_score": result.risk_score,
            "global_score": result.global_score,
            "n_pairs": result.n_pairs,
            "n_calls_failed": result.n_calls_failed,
            "categories": [
                {
                    "name": c.name,
                    "length_gap": c.length_gap,
                    "sentiment_gap": c.sentiment_gap,
                    "refusal_rate": c.refusal_rate,
                    "score": c.score,
                    "verdict": c.verdict,
                }
                for c in result.categories
            ],
            "warnings": list(result.warnings),
        },
        ensure_ascii=False,
    )


def _fallback(result: M3Result) -> InterpretationOut:
    verdicts = {
        "fail": "des écarts de traitement marqués entre variantes ont été "
        "détectés",
        "warn": "un signal d'écart de traitement, à confirmer, a été détecté",
        "pass": "aucun écart de traitement marqué n'a été détecté",
    }
    phrase = verdicts.get(result.verdict, result.verdict)
    worst = (
        max(result.categories, key=lambda c: c.score).name
        if result.categories
        else "—"
    )
    narrative = (
        f"Sur {result.n_pairs} paires de prompts soumises au chatbot, "
        f"{phrase}. Catégorie la plus exposée : « {worst} ». Score de risque "
        f"agrégé : {result.risk_score}/100. Verdict : {result.verdict}. "
        f"Les écarts mesurés (longueur, ton, refus) sont un signal à "
        f"approfondir, pas une preuve de discrimination."
    )
    return InterpretationOut(
        narrative=narrative,
        ai_act_anchors=list(_AI_ACT_ANCHORS),
        disclaimers=list(_DISCLAIMERS),
        provider="fallback",
        model="deterministic",
    )


async def interpret_m3(
    result: M3Result, *, provider: LLMProvider | None
) -> InterpretationOut:
    if provider is None:
        return _fallback(result)
    try:
        prompt = load_prompt_template().format(metrics_json=_metrics_json(result))
        raw = await provider.complete(prompt, as_json=True)
        data = json.loads(raw)
        return InterpretationOut(
            narrative=str(data["narrative"]),
            ai_act_anchors=[str(a) for a in data.get("ai_act_anchors", [])]
            or list(_AI_ACT_ANCHORS),
            disclaimers=[str(d) for d in data.get("disclaimers", [])]
            or list(_DISCLAIMERS),
            provider=provider.name,
            model=provider.model,
        )
    except Exception:  # noqa: BLE001 — any LLM/parse failure → safe fallback
        return _fallback(result)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run python -m pytest tests/api/test_interpret_m3.py -v`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add app/interpretation/m3.py app/interpretation/prompts/m3_fr.md tests/api/test_interpret_m3.py
git -c core.autocrlf=false commit -m "feat(api): M3 interpretation + FR prompt + fallback"
```

---

### Task 6: `run_m3_audit` service

**Files:**
- Modify: `app/services/audit_service.py`
- Test: `tests/api/test_audit_service_m3.py`

- [ ] **Step 1: Write the failing test**

Create `tests/api/test_audit_service_m3.py` (reuse the `ctx`-style org/user seed from `tests/api/test_audit_service_m2.py` — read it; here no dataset is needed):

```python
import httpx
import respx

from app.schemas.audit import AuditCreate, M3MetricsOut
from app.services import audit_service


def _target():
    return {
        "url": "https://api.example.com/v1", "method": "POST",
        "headers": {"Authorization": "Bearer SECRET"},
        "body_template": '{"messages":[{"role":"user","content":"{prompt}"}]}',
        "response_path": "choices.0.message.content",
    }


async def test_run_m3_audit_persists_no_secret(ctx, monkeypatch):
    sm, org_id, user_id = ctx  # adapt to the real fixture's yield
    import app.integrations.llm_target as lt

    monkeypatch.setattr(lt, "_resolve_ips", lambda host: ["93.184.216.34"])
    with respx.mock:
        # genuine answer for "m"/A variants, refusal for "f"/B variants
        def _h(request):
            body = request.content.decode()
            refuse = "ingénieure" in body or "Mohamed" in body
            txt = ("Je ne peux pas répondre."
                   if refuse else
                   "Une réponse neutre, correcte et assez longue ici.")
            return httpx.Response(
                200, json={"choices": [{"message": {"content": txt}}]}
            )

        respx.post("https://api.example.com/v1").mock(side_effect=_h)
        async with sm() as session:
            out = await audit_service.run_m3_audit(
                session, org_id=org_id, user_id=user_id,
                body=AuditCreate(title="Chatbot RH", module="M3",
                                 target=_target(), lang="fr"),
                llm_provider=None,
            )
    assert out.module == "M3"
    assert out.status == "done"
    assert isinstance(out.metrics, M3MetricsOut)
    assert out.interpretation is not None
    assert out.config is not None
    # secret header MUST NOT be persisted
    blob = str(out.config)
    assert "SECRET" not in blob and "Authorization" not in blob

    async with sm() as session:
        fetched = await audit_service.get_audit(session, out.id, org_id=org_id)
    assert isinstance(fetched.metrics, M3MetricsOut)
```

> Read `tests/api/test_audit_service_m2.py` and reproduce its exact `ctx` fixture (org/user seed). Shape it to yield `(session_maker, org_id, user_id)`; M3 needs no dataset. Keep assertions intact. If `run_m3_audit`'s signature differs (e.g. no `storage` param — M3 has none), match the real `run_m2_audit` shape minus `storage`/`dataset`.

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run python -m pytest tests/api/test_audit_service_m3.py -v`
Expected: FAIL — `AttributeError: ... has no attribute 'run_m3_audit'`.

- [ ] **Step 3: Write minimal implementation**

In `app/services/audit_service.py` add imports (extend existing): `import asyncio`; `from app.audit_engine import M3Config, M3Responses, ResponseRecord, run_m3, PROMPT_BANK`; `from app.integrations.llm_target import TargetConfig, call_target_llm`; `from app.interpretation.m3 import interpret_m3`; and add `CategoryStatOut, DivergentExampleOut, M3MetricsOut` to the existing `from app.schemas.audit import (...)`.

Add an M3 metrics mapper + the service (mirror `run_m2_audit` shape, minus dataset/storage):

```python
_BANK_VERSION = "v1"


def _to_m3_metrics_out(r: "M3Result") -> M3MetricsOut:  # type: ignore[name-defined]
    return M3MetricsOut(
        categories=[
            CategoryStatOut(
                name=c.name, length_gap=c.length_gap,
                sentiment_gap=c.sentiment_gap, refusal_rate=c.refusal_rate,
                score=c.score, verdict=cast(Verdict, c.verdict),
            )
            for c in r.categories
        ],
        global_score=r.global_score,
        verdict=cast(Verdict, r.verdict),
        risk_score=r.risk_score,
        divergent_examples=[
            DivergentExampleOut(
                category=e.category, prompt_id=e.prompt_id,
                variant_a=e.variant_a, variant_b=e.variant_b,
                excerpt_a=e.excerpt_a, excerpt_b=e.excerpt_b, reason=e.reason,
            )
            for e in r.divergent_examples
        ],
        n_pairs=r.n_pairs, n_calls_failed=r.n_calls_failed,
        warnings=list(r.warnings),
    )


async def run_m3_audit(
    session: AsyncSession,
    *,
    org_id: uuid.UUID,
    user_id: uuid.UUID,
    body: AuditCreate,
    llm_provider: LLMProvider | None,
) -> AuditOut:
    assert body.target is not None  # enforced by AuditCreate._per_module
    s = get_settings()
    tcfg = TargetConfig(
        url=body.target.url, method=body.target.method,
        headers=dict(body.target.headers),
        body_template=body.target.body_template,
        response_path=body.target.response_path,
    )
    lang = body.lang if body.lang in ("fr", "en") else "fr"

    audit = Audit(
        code=await _next_code(session, org_id),
        org_id=org_id,
        dataset_id=None,
        module="M3",
        title=body.title,
        status="running",
        protected_attribute=None,
        decision_column=None,
        favorable_value=None,
        privileged_value=None,
        config={
            "target": {
                "url": body.target.url,
                "method": body.target.method,
                "response_path": body.target.response_path,
            },
            "bank_version": _BANK_VERSION,
            "lang": lang,
        },
        created_by=user_id,
    )
    session.add(audit)
    await session.flush()

    calls: list[tuple[str, str, str, str]] = []  # pair_id, category, label, prompt
    for pair in PROMPT_BANK:
        for v in pair.variants:
            calls.append(
                (pair.id, pair.category, v.attribute_label,
                 v.fr if lang == "fr" else v.en)
            )
    calls = calls[: s.llm_audit_max_calls]

    sem = asyncio.Semaphore(s.llm_target_max_concurrency)
    results: dict[int, tuple[str, bool]] = {}

    async def _one(i: int, prompt: str) -> None:
        async with sem:
            try:
                txt = await call_target_llm(tcfg, prompt)
                results[i] = (txt, False)
            except Exception:  # noqa: BLE001 — per-call failure is non-fatal
                results[i] = ("", True)

    tasks = [
        asyncio.create_task(_one(i, c[3])) for i, c in enumerate(calls)
    ]
    done, pending = await asyncio.wait(
        tasks, timeout=float(s.llm_audit_deadline_s)
    )
    for t in pending:
        t.cancel()

    records: list[ResponseRecord] = []
    for i, (pid, cat, label, _prompt) in enumerate(calls):
        text, failed = results.get(i, ("", True))
        records.append(
            ResponseRecord(pair_id=pid, category=cat, variant_label=label,
                           text=text, failed=failed)
        )

    result = run_m3(M3Responses(records=records), M3Config(lang=lang))
    metrics_out = _to_m3_metrics_out(result)
    interpretation = await interpret_m3(result, provider=llm_provider)
    session.add(
        AuditResult(
            audit_id=audit.id,
            metrics=metrics_out.model_dump(),
            verdict=result.verdict,
            risk_score=result.risk_score,
            interpretation=interpretation.model_dump(),
            pre_check=[],
        )
    )
    audit.status = "done"
    audit.completed_at = datetime.datetime.now(tz=datetime.timezone.utc)
    await session.commit()
    return _audit_out(audit, metrics_out, interpretation, [])
```

Add `from app.audit_engine import M3Result` to the typing imports (or replace the string annotation with the real import — keep mypy strict happy: `from app.audit_engine import M3Result` at module top alongside the other engine imports, and use `r: M3Result`).

Make `get_audit` M3-aware: in its `metrics` branch add `elif audit.module == "M3": metrics = M3MetricsOut.model_validate(result.metrics)` before the M1/M2 fallback (keep M1/M2/None branches).

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run python -m pytest tests/api/test_audit_service_m3.py tests/api/test_audit_service_m2.py -v`
Expected: PASS (new M3 + existing M1/M2 service tests).

- [ ] **Step 5: Commit**

```bash
git add app/services/audit_service.py tests/api/test_audit_service_m3.py
git -c core.autocrlf=false commit -m "feat(api): run_m3_audit (bounded concurrency + deadline)"
```

---

### Task 7: Router M3 dispatch

**Files:**
- Modify: `app/routers/audits.py`
- Test: `tests/api/test_audits_router.py`

- [ ] **Step 1: Write the failing test**

Append to `tests/api/test_audits_router.py` (reuse the existing `client`/auth fixtures + respx pattern):

```python
async def test_post_audits_m3(client, monkeypatch):
    import httpx as _hx
    import respx as _rx

    import app.integrations.llm_target as lt
    monkeypatch.setattr(lt, "_resolve_ips", lambda host: ["93.184.216.34"])
    with _rx.mock:
        _rx.post("https://api.example.com/v1").mock(
            return_value=_hx.Response(
                200, json={"choices": [{"message": {"content":
                    "Une réponse neutre et suffisamment longue pour le test."}}]}
            )
        )
        r = await client.post("/api/v1/audits", json={
            "title": "Chatbot", "module": "M3",
            "target": {"url": "https://api.example.com/v1", "method": "POST",
                       "headers": {}, "body_template":
                       '{"messages":[{"role":"user","content":"{prompt}"}]}',
                       "response_path": "choices.0.message.content"},
            "lang": "fr",
        })
    assert r.status_code == 201, r.text
    assert r.json()["module"] == "M3"
    assert r.json()["metrics"]["verdict"] in ("pass", "warn", "fail")


async def test_post_audits_m3_ssrf_is_422(client):
    r = await client.post("/api/v1/audits", json={
        "title": "bad", "module": "M3",
        "target": {"url": "http://169.254.169.254/latest", "method": "POST",
                   "headers": {}, "body_template": "{prompt}",
                   "response_path": "a"},
        "lang": "fr",
    })
    assert r.status_code == 422
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run python -m pytest tests/api/test_audits_router.py -k m3 -v`
Expected: FAIL — M3 routed to run_m1/run_m2 (or unhandled) → not 201.

- [ ] **Step 3: Write minimal implementation**

In `app/routers/audits.py` `create_audit`, add an M3 branch before the M1/M2 dispatch (mirror the existing `if body.module == "M2": return await audit_service.run_m2_audit(...)`):

```python
    if body.module == "M3":
        return await audit_service.run_m3_audit(
            session, org_id=user.org_id, user_id=user.id,
            body=body, llm_provider=llm_provider,
        )
```
(Place it alongside the M2 branch; `run_m3_audit` takes no `storage`. SSRF/invalid target raises `APIError(422)` inside `call_target_llm` during `run_m3_audit`, mapped by the existing RFC 7807 handler.)

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run python -m pytest tests/api/test_audits_router.py -v`
Expected: PASS (existing M1/M2 + 2 new M3).

- [ ] **Step 5: Commit**

```bash
git add app/routers/audits.py tests/api/test_audits_router.py
git -c core.autocrlf=false commit -m "feat(api): POST /audits dispatch M3"
```

---

### Task 8: Transversal M3 report branch

**Files:**
- Modify: `app/reporting/excel.py`
- Modify: `app/reporting/html.py`
- Test: `tests/api/test_excel_report.py`, `tests/api/test_report_html.py`

- [ ] **Step 1: Write the failing test**

Append to `tests/api/test_excel_report.py` a helper + test (reuse its `_interp`, `_NOW`; build an M3 `AuditOut`):

```python
def _m3_audit() -> AuditOut:
    from app.schemas.audit import (
        CategoryStatOut, DivergentExampleOut, M3MetricsOut,
    )
    return AuditOut(
        id=uuid.uuid4(), code="AUD-2026-030", title="Chatbot", status="done",
        module="M3", dataset_id=None, protected_attribute=None,
        decision_column=None, favorable_value=None, privileged_value=None,
        created_at=_NOW, completed_at=_NOW,
        metrics=M3MetricsOut(
            categories=[CategoryStatOut(name="genre", length_gap=0.4,
                        sentiment_gap=0.2, refusal_rate=0.5, score=0.55,
                        verdict="warn")],
            global_score=0.55, verdict="warn", risk_score=55,
            divergent_examples=[DivergentExampleOut(category="genre",
                prompt_id="g1", variant_a="m", variant_b="f",
                excerpt_a="long", excerpt_b="Je ne peux pas",
                reason="refus")],
            n_pairs=1, n_calls_failed=0, warnings=[]),
        interpretation=_interp(), pre_check=[], config={"lang": "fr"},
    )


def test_build_excel_m3_section():
    from app.reporting.excel import build_excel_report
    import io
    from openpyxl import load_workbook

    wb = load_workbook(io.BytesIO(build_excel_report(_m3_audit())))
    text = " ".join(
        str(c.value) for ws in wb.worksheets for row in ws.iter_rows()
        for c in row if c.value is not None
    )
    assert "AUD-2026-030" in text
    assert "genre" in text
    assert "n'est pas un certificat" in text
```

And append to `tests/api/test_report_html.py`:

```python
def test_html_m3_section():
    from app.reporting.html import build_report_html
    from app.schemas.audit import (
        CategoryStatOut, DivergentExampleOut, M3MetricsOut,
    )
    import datetime, uuid
    now = datetime.datetime(2026, 5, 17, tzinfo=datetime.timezone.utc)
    from app.schemas.audit import AuditOut, InterpretationOut
    a = AuditOut(
        id=uuid.uuid4(), code="AUD-2026-031", title="Chatbot", status="done",
        module="M3", dataset_id=None, protected_attribute=None,
        decision_column=None, favorable_value=None, privileged_value=None,
        created_at=now, completed_at=now,
        metrics=M3MetricsOut(
            categories=[CategoryStatOut(name="origine", length_gap=0.1,
                        sentiment_gap=0.1, refusal_rate=0.0, score=0.1,
                        verdict="pass")],
            global_score=0.1, verdict="pass", risk_score=10,
            divergent_examples=[], n_pairs=1, n_calls_failed=0, warnings=[]),
        interpretation=InterpretationOut(narrative="N.", ai_act_anchors=[
            "AI Act, article 50"], disclaimers=["Signal."],
            provider="fallback", model="deterministic"),
        pre_check=[], config={"lang": "fr"})
    h = build_report_html(a)
    assert "AUD-2026-031" in h and "origine" in h
    assert "n'est pas un certificat" in h
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run python -m pytest tests/api/test_excel_report.py::test_build_excel_m3_section tests/api/test_report_html.py::test_html_m3_section -v`
Expected: FAIL — M3 metrics fall through the M1/M2 `isinstance` branches (no `categories` rendering / KeyError-ish).

- [ ] **Step 3: Write minimal implementation**

In `app/reporting/excel.py`, in the per-module detail dispatch (currently `if m is None / isinstance(m, M2MetricsOut) / else M1`), add an `M3MetricsOut` branch (import `M3MetricsOut` from `app.schemas.audit`). Insert before the M2 check:

```python
    elif isinstance(m, M3MetricsOut):
        _rows(detail, [
            ["Module 3 — audit LLM/chatbot"],
            ["Score global", m.global_score],
            ["Verdict", m.verdict],
            ["Paires", m.n_pairs, "Appels échoués", m.n_calls_failed],
            [],
            ["Catégorie", "Écart long.", "Écart sent.", "Taux refus",
             "Score", "Verdict"],
        ])
        for c in m.categories:
            detail.append([c.name, c.length_gap, c.sentiment_gap,
                           c.refusal_rate, c.score, c.verdict])
```
(Match the real `excel.py` structure: it uses `if m is None: ... elif isinstance(m, M2MetricsOut): ... else: <M1>`. Convert to `elif isinstance(m, M3MetricsOut): ...` placed so M1 stays the final `else`. Keep the "n'est pas un certificat" rows intact.)

In `app/reporting/html.py`, in `_detail(audit)` add before the M2 `isinstance` branch (import `M3MetricsOut`):

```python
    if isinstance(m, M3MetricsOut):
        head = _rows([
            ("Score global", m.global_score),
            ("Verdict", m.verdict),
            ("Paires / échecs", f"{m.n_pairs} / {m.n_calls_failed}"),
        ])
        body = "".join(
            f"<tr><td>{_e(c.name)}</td><td>{c.length_gap}</td>"
            f"<td>{c.sentiment_gap}</td><td>{c.refusal_rate}</td>"
            f"<td>{c.score}</td><td>{_e(c.verdict)}</td></tr>"
            for c in m.categories
        )
        ex = "".join(
            f"<tr><td>{_e(d.category)}</td><td>{_e(d.reason)}</td>"
            f"<td>{_e(d.excerpt_a)}</td><td>{_e(d.excerpt_b)}</td></tr>"
            for d in m.divergent_examples
        )
        return (
            f"<h2>Module 3 — audit LLM/chatbot</h2>"
            f"<table class='kv'>{head}</table>"
            f"<table class='grid'><thead><tr><th>Catégorie</th><th>Écart "
            f"long.</th><th>Écart sent.</th><th>Taux refus</th><th>Score</th>"
            f"<th>Verdict</th></tr></thead><tbody>{body}</tbody></table>"
            + (
                f"<h2>Exemples divergents</h2><table class='grid'><thead>"
                f"<tr><th>Catégorie</th><th>Raison</th><th>Réponse A</th>"
                f"<th>Réponse B</th></tr></thead><tbody>{ex}</tbody></table>"
                if ex else ""
            )
        )
```
(All dynamic values via `_e()` — escaped, per the existing html.py XSS-safe pattern. Place this `if isinstance(m, M3MetricsOut):` before the existing M2 `isinstance` check; keep M2/M1/None paths unchanged.)

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run python -m pytest tests/api/test_excel_report.py tests/api/test_report_html.py -v`
Expected: PASS (existing M1/M2 report tests + new M3).

- [ ] **Step 5: Commit**

```bash
git add app/reporting/excel.py app/reporting/html.py tests/api/test_excel_report.py tests/api/test_report_html.py
git -c core.autocrlf=false commit -m "feat(api): M3 branch in Excel/HTML reports"
```

---

### Task 9: Full API gate

**Files:** None (verification + minimal fixups)

- [ ] **Step 1: Full API suite**

Run: `uv run python -m pytest -q`
Expected: PASS, 0 failed (prior + all M3-B tests; no M1/M2/M2-C regression).

- [ ] **Step 2: Lint**

Run: `uv run python -m ruff check app tests`
Expected: `All checks passed!` — fix minimally, re-run.

- [ ] **Step 3: Type-check (strict)**

Run: `uv run python -m mypy app`
Expected: `Success: no issues found`. Likely fixups: the `M1|M2|M3` metrics union narrowing in `excel.py`/`html.py`/`get_audit` via `isinstance`; `M3Result` import for `_to_m3_metrics_out` (use a real import, not a string annotation, to satisfy strict); `asyncio.wait` typing. Apply minimal precise fixes; never blanket `Any`.

- [ ] **Step 4: Scope sanity**

Run: `git --no-pager diff --stat origin/main..HEAD` — confirm changes only under `apps/api/**` (no `apps/web`, `apps/pdf`, docs). Report file list. Run `git --no-pager log --format='%ae' origin/main..HEAD | sort -u` — must be ONLY `franck-dilane1.fambou@epitech.digital` (report; if any other, name commits — controller handles history).

- [ ] **Step 5: Commit any gate fixes**

```bash
git add -A
git -c core.autocrlf=false commit -m "chore(api): gate fixups for M3-B"
```
(Skip if Steps 1–3 already clean.)

---

## Self-Review

**1. Spec coverage (§6 client/SSRF, §7 service, §8 DTO/API, §9 errors, §11 build, §12 acceptance):**
- §6 generic SSRF-hardened client, restricted `response_path`, IP-pin/no-rebind, https-only-outside-dev, no redirects, timeout, streamed size cap, secret never logged → Task 3 (extract + 5 SSRF-block params + https-required + success + 5xx).
- §7 `run_m3_audit` bounded concurrency (`Semaphore`) under global deadline (`asyncio.wait` timeout → pending cancelled → marked failed → partial result via engine's failed-aware path), config without secrets, nullable cols, module-aware `get_audit` → Tasks 2, 6 (`test_run_m3_audit_persists_no_secret` asserts no secret in config + M3MetricsOut round-trip).
- §8 single `AuditCreate` + `_per_module` M3 branch (target required, dataset/decision/favorable/config forbidden), `M3MetricsOut` union → Task 4. Backward-compat: M1/M2 branches unchanged.
- §9 SSRF/invalid target → 422 RFC 7807 in `call_target_llm` propagated through `run_m3_audit` → Task 7 (`test_post_audits_m3_ssrf_is_422`); per-call transient failure non-fatal (engine counts it); `interpret_m3` failure → fallback (Task 5).
- §11 build order Settings→migration→client→DTO→interpret→service→router→report→gate = Tasks 1–9. §12 acceptance: M3 audit (mocked OpenAI-compatible) → category+global scores+verdict+art.50 narrative (Task 7); private/metadata URL → 422 (Tasks 3,7); no secret persisted/logged (Task 6); Excel+PDF carry M3 (Task 8); gates green (Task 9).
- Reporting: M3 branch added to BOTH `excel.py` and `html.py` (PDF goes through the existing Puppeteer path → M3 PDF works transversally, no `apps/pdf` change). report_service untouched (cache/endpoints already module-agnostic from M2-C).

**2. Placeholder scan:** No TBD/"handle errors". The Task-3 respx note is a concrete conditional (register respx on original-host vs pinned-IP depending on installed respx behavior) with the security invariant fixed — an instruction, not a placeholder. Tasks 6/8 instruct reusing the real `ctx`/`_interp` fixtures verbatim (must honor real names).

**3. Type consistency:** `TargetConfig(url,method,headers,body_template,response_path)` (Task 3) ↔ `TargetIn` (Task 4) ↔ `run_m3_audit` building it (Task 6) — field-for-field. `M3MetricsOut/CategoryStatOut/DivergentExampleOut` (Task 4) consumed by `_to_m3_metrics_out` (Task 6) and the report branches (Task 8), shaped exactly per M3-A `M3Result/CategoryStat/DivergentExample`. `run_m3`/`PROMPT_BANK`/`M3Config`/`M3Responses`/`ResponseRecord` are the merged M3-A public API. `interpret_m3(result,*,provider)->InterpretationOut` (Task 5) called by Task 6. `call_target_llm(TargetConfig,prompt)->str` raising `APIError` (Task 3) consumed by Task 6 (per-call try/except → non-fatal). Reuses proven `_audit_out`, `_next_code`, `get_audit`, `APIError`, `cast`, `Verdict`, `LLMProvider`, `_JSON` migration idiom. `M3Result` imported (not string-annotated) for mypy-strict in Task 6 (noted in Task 9 fixups).
