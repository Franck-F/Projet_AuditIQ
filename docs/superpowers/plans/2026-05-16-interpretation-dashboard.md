# Interpretation (Gemini + fallback) + Dashboard Implementation Plan (Plan 2C)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every M1 audit gains a French narrative + AI-Act anchors + disclaimers (Gemini, with a deterministic fallback that never blocks the audit), and `GET /api/v1/dashboard/summary` returns real org-scoped aggregates that will replace the web mocks.

**Architecture:** Builds on merged Plan 1 (engine) + 2A (foundation) + 2B (datasets/audit endpoint). New `app/interpretation/` layer: `LLMProvider` Protocol (injectable like `Storage`), `GeminiProvider` (google-genai, blocking call wrapped in `asyncio.to_thread`), `interpret_m1()` which builds a prompt from a versioned FR template and ALWAYS returns an `InterpretationOut` (LLM JSON parsed on success, deterministic templated French on any failure → `provider="fallback"`). `audit_service` calls it between `run_m1` and persistence (replacing the `interpretation={}` seam). `dashboard_service` aggregates org audits → `DashboardSummaryOut`. Tests use a fake provider + SQLite; no network.

**Tech Stack:** FastAPI, Pydantic v2, SQLAlchemy 2 async, `google-genai` (already a dep), the merged `app.audit_engine`. `uv` from `apps/api`. pnpm/uv repo — never `npm install`.

---

## File Structure

```
apps/api/app/
├── interpretation/__init__.py
├── interpretation/base.py            # LLMProvider Protocol
├── interpretation/prompts/m1_fr.md   # versioned FR prompt template (packaged)
├── interpretation/gemini.py          # GeminiProvider + get_llm_provider()
├── interpretation/m1.py              # interpret_m1() + deterministic fallback + constants
├── schemas/audit.py                  # MODIFY: + InterpretationOut, AuditOut.interpretation
├── schemas/dashboard.py              # DashboardSummaryOut (+ nested)
├── services/audit_service.py         # MODIFY: call interpret_m1, persist, expose in AuditOut
├── services/dashboard_service.py     # get_summary() — org-scoped aggregation
├── routers/dashboard.py              # GET /dashboard/summary
├── routers/audits.py                 # MODIFY: inject llm provider dep
├── core/config.py                    # MODIFY: + gemini_api_key, gemini_model
└── main.py                           # MODIFY: include dashboard router
apps/api/tests/api/
  test_config_gemini.py · test_interpretation.py · test_audit_interpretation.py
  · test_dashboard_service.py · test_dashboard_router.py
```

Conventions: Conventional Commits; every commit ends with a blank line then
`Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>`; use
`git -c core.autocrlf=false commit`. Never `git push` (controller integrates).
Tests on SQLite + `MemoryStorage` + a fake `LLMProvider`; no network.

---

### Task 1: Config — Gemini settings

**Files:**
- Modify: `apps/api/app/core/config.py`
- Test: `apps/api/tests/api/test_config_gemini.py`

- [ ] **Step 1: Write the failing test**

Create `apps/api/tests/api/test_config_gemini.py`:

```python
from app.core.config import Settings


def test_gemini_defaults():
    s = Settings(_env_file=None)
    assert s.gemini_api_key.get_secret_value() == ""
    assert s.gemini_model == "gemini-1.5-pro"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run pytest tests/api/test_config_gemini.py -q`
Expected: FAIL — `AttributeError: 'Settings' object has no attribute 'gemini_api_key'`.

- [ ] **Step 3: Write minimal implementation**

In `apps/api/app/core/config.py`, add these two fields to `Settings` immediately
after the `retention_days_default: int = 30` line:

```python
    gemini_api_key: SecretStr = SecretStr("")
    gemini_model: str = "gemini-1.5-pro"
```

`SecretStr` is already imported in `config.py` (Plan 2A). Change nothing else.

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run pytest tests/api/test_config_gemini.py -q`
Expected: PASS (1 passed). Also `uv run pytest tests/api/test_config.py tests/api/test_config_storage.py -q` still green.

- [ ] **Step 5: Commit**

```bash
git add apps/api/app/core/config.py apps/api/tests/api/test_config_gemini.py
git -c core.autocrlf=false commit -m "feat(api): Gemini settings

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Interpretation schema + LLMProvider Protocol

**Files:**
- Modify: `apps/api/app/schemas/audit.py`
- Create: `apps/api/app/interpretation/__init__.py` (empty), `apps/api/app/interpretation/base.py`
- Test: `apps/api/tests/api/test_interpretation.py` (Part A only — schema/protocol)

- [ ] **Step 1: Write the failing test**

Create `apps/api/tests/api/test_interpretation.py`:

```python
import pytest
from pydantic import ValidationError

from app.interpretation.base import LLMProvider
from app.schemas.audit import InterpretationOut


def test_interpretation_out_shape():
    i = InterpretationOut(
        narrative="texte",
        ai_act_anchors=["AI Act art. 10"],
        disclaimers=["Aide à l'analyse, pas un verdict de conformité."],
        provider="fallback",
        model="deterministic",
    )
    assert i.provider == "fallback"
    with pytest.raises(ValidationError):
        InterpretationOut(narrative="x", ai_act_anchors=[], disclaimers=[],
                           provider="p", model="m", extra="nope")


class _FakeProvider:
    name = "fake"
    model = "fake-1"

    async def complete(self, prompt: str, *, as_json: bool = False) -> str:
        return "{}"


def test_fake_provider_satisfies_protocol():
    assert isinstance(_FakeProvider(), LLMProvider)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run pytest tests/api/test_interpretation.py -q`
Expected: FAIL — `ModuleNotFoundError: No module named 'app.interpretation'`.

- [ ] **Step 3: Write minimal implementation**

Append to `apps/api/app/schemas/audit.py` (after the `AuditOut` class), then add
the `interpretation` field to `AuditOut`:

Add this new model BEFORE `AuditOut` (so `AuditOut` can reference it):

```python
class InterpretationOut(BaseModel):
    model_config = ConfigDict(extra="forbid")

    narrative: str
    ai_act_anchors: list[str]
    disclaimers: list[str]
    provider: str
    model: str
```

Then in `AuditOut`, add this field immediately after `metrics: M1MetricsOut | None = None`:

```python
    interpretation: InterpretationOut | None = None
```

Create `apps/api/app/interpretation/__init__.py` as an empty (0-byte) file.

Create `apps/api/app/interpretation/base.py`:

```python
from __future__ import annotations

from typing import Protocol, runtime_checkable


@runtime_checkable
class LLMProvider(Protocol):
    name: str
    model: str

    async def complete(self, prompt: str, *, as_json: bool = False) -> str: ...
```

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run pytest tests/api/test_interpretation.py -q`
Expected: PASS (2 passed). Also `uv run pytest tests/api/test_schemas_audit.py -q`
still green (the new field is optional, defaults None).

- [ ] **Step 5: Commit**

```bash
git add apps/api/app/schemas/audit.py apps/api/app/interpretation/__init__.py apps/api/app/interpretation/base.py apps/api/tests/api/test_interpretation.py
git -c core.autocrlf=false commit -m "feat(api): InterpretationOut + LLMProvider protocol

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: FR prompt template

**Files:**
- Create: `apps/api/app/interpretation/prompts/__init__.py` (empty), `apps/api/app/interpretation/prompts/m1_fr.md`
- Test: extend `apps/api/tests/api/test_interpretation.py`

- [ ] **Step 1: Write the failing test**

Append to `apps/api/tests/api/test_interpretation.py`:

```python
def test_prompt_template_loads_and_has_placeholder():
    from app.interpretation.m1 import load_prompt_template

    tpl = load_prompt_template()
    assert "{metrics_json}" in tpl
    assert "AI Act" in tpl
    assert "JSON" in tpl
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run pytest tests/api/test_interpretation.py::test_prompt_template_loads_and_has_placeholder -q`
Expected: FAIL — `ModuleNotFoundError: No module named 'app.interpretation.m1'`.

- [ ] **Step 3: Write minimal implementation**

Create `apps/api/app/interpretation/prompts/__init__.py` as an empty (0-byte) file.

Create `apps/api/app/interpretation/prompts/m1_fr.md`:

```markdown
# Prompt M1 — interprétation fairness (FR) — v1

Tu es un assistant qui explique un audit de fairness à des non-spécialistes,
en français clair. On te donne les métriques techniques d'un audit M1
(supervisé) au format JSON :

{metrics_json}

Consignes STRICTES :
- Explique le résultat simplement (3–6 phrases), sans jargon non défini.
- Cite les ancrages réglementaires pertinents : AI Act articles 10, 13, 15 et la
  règle des 4/5 (adverse impact). Le Code du travail L.1132-1 si discrimination.
- N'emploie JAMAIS de formulation absolue (« certifié conforme », « garanti »,
  « 100 % »). C'est une aide à l'analyse, pas un verdict de conformité.
- Termine par les limites de l'analyse.

Réponds UNIQUEMENT par un objet JSON valide, sans texte autour :
{{"narrative": "<texte FR>", "ai_act_anchors": ["..."], "disclaimers": ["..."]}}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run pytest tests/api/test_interpretation.py::test_prompt_template_loads_and_has_placeholder -q`
Expected: PASS. (Implementation of `load_prompt_template` lands in Task 4; this
step only needs the template file + `prompts/__init__.py`. If the test errors
because `app.interpretation.m1` does not exist yet, that is the expected red —
it goes green at Task 4 Step 4. Mark this task's checkbox done once Task 4's
suite is green; commit the template now so the file is versioned.)

- [ ] **Step 5: Commit**

```bash
git add apps/api/app/interpretation/prompts/
git -c core.autocrlf=false commit -m "feat(api): versioned FR M1 interpretation prompt

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: `interpret_m1` + deterministic fallback + GeminiProvider

**Files:**
- Create: `apps/api/app/interpretation/gemini.py`, `apps/api/app/interpretation/m1.py`
- Test: extend `apps/api/tests/api/test_interpretation.py`

- [ ] **Step 1: Write the failing test**

Append to `apps/api/tests/api/test_interpretation.py`:

```python
import json

from app.audit_engine import M1Config, run_m1
from app.interpretation.m1 import interpret_m1


def _result():
    import pandas as pd

    df = pd.DataFrame(
        {"genre": ["H"] * 200 + ["F"] * 200,
         "decision": (["oui"] * 100 + ["non"] * 100)
         + (["oui"] * 72 + ["non"] * 128)}
    )
    return run_m1(df, M1Config(protected_attribute="genre",
                               decision_column="decision",
                               favorable_value="oui"))


class _OkProvider:
    name = "gemini"
    model = "gemini-1.5-pro"

    async def complete(self, prompt: str, *, as_json: bool = False) -> str:
        return json.dumps({
            "narrative": "Écart défavorable détecté pour les femmes.",
            "ai_act_anchors": ["AI Act art. 10"],
            "disclaimers": ["Aide à l'analyse."],
        })


class _BoomProvider:
    name = "gemini"
    model = "gemini-1.5-pro"

    async def complete(self, prompt: str, *, as_json: bool = False) -> str:
        raise RuntimeError("quota exceeded")


async def test_interpret_m1_uses_provider_json():
    out = await interpret_m1(_result(), provider=_OkProvider())
    assert out.provider == "gemini"
    assert "femmes" in out.narrative.lower()
    assert out.ai_act_anchors == ["AI Act art. 10"]


async def test_interpret_m1_fallback_when_provider_none():
    out = await interpret_m1(_result(), provider=None)
    assert out.provider == "fallback"
    assert out.model == "deterministic"
    assert "0.72" in out.narrative or "fail" in out.narrative.lower()
    assert out.ai_act_anchors  # non-empty
    assert out.disclaimers  # non-empty


async def test_interpret_m1_fallback_when_provider_raises():
    out = await interpret_m1(_result(), provider=_BoomProvider())
    assert out.provider == "fallback"
    assert out.disclaimers
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run pytest tests/api/test_interpretation.py -q`
Expected: FAIL — `ModuleNotFoundError: No module named 'app.interpretation.m1'`.

- [ ] **Step 3: Write minimal implementation**

Create `apps/api/app/interpretation/gemini.py`:

```python
from __future__ import annotations

import asyncio

from app.core.config import get_settings
from app.interpretation.base import LLMProvider


class GeminiProvider:
    name = "gemini"

    def __init__(self, *, api_key: str, model: str) -> None:
        from google import genai

        self._client = genai.Client(api_key=api_key)
        self.model = model

    async def complete(self, prompt: str, *, as_json: bool = False) -> str:
        def _call() -> str:
            resp = self._client.models.generate_content(
                model=self.model, contents=prompt
            )
            return resp.text or ""

        return await asyncio.to_thread(_call)


def get_llm_provider() -> LLMProvider | None:
    s = get_settings()
    key = s.gemini_api_key.get_secret_value()
    if not key:
        return None
    return GeminiProvider(api_key=key, model=s.gemini_model)
```

Create `apps/api/app/interpretation/m1.py`:

```python
from __future__ import annotations

import json
from importlib import resources

from app.audit_engine import M1Result
from app.interpretation.base import LLMProvider
from app.schemas.audit import InterpretationOut

_AI_ACT_ANCHORS = [
    "AI Act, article 10 (qualité et gouvernance des données)",
    "AI Act, article 13 (transparence)",
    "AI Act, article 15 (exactitude, robustesse)",
    "Règle des 4/5 (adverse impact) ; Code du travail L.1132-1",
]
_DISCLAIMERS = [
    "Résultat d'aide à l'analyse : ni un verdict de conformité, ni une "
    "certification.",
    "L'appréciation réglementaire finale relève de votre responsabilité.",
    "Analyse limitée à l'attribut protégé et à la décision fournis.",
]


def load_prompt_template() -> str:
    return (
        resources.files("app.interpretation.prompts")
        .joinpath("m1_fr.md")
        .read_text(encoding="utf-8")
    )


def _metrics_json(result: M1Result) -> str:
    return json.dumps(
        {
            "disparate_impact": result.disparate_impact,
            "demographic_parity_diff": result.demographic_parity_diff,
            "verdict": result.verdict,
            "risk_score": result.risk_score,
            "worst_group": result.worst_group,
            "reference_value": result.reference_value,
            "groups": [
                {
                    "value": g.value,
                    "n": g.n,
                    "selection_rate": g.selection_rate,
                    "disparate_impact": g.disparate_impact,
                }
                for g in result.groups
            ],
            "warnings": list(result.warnings),
        },
        ensure_ascii=False,
    )


def _fallback(result: M1Result) -> InterpretationOut:
    verdicts = {
        "fail": "non respectée (impact disproportionné)",
        "warn": "respectée mais avec une marge faible",
        "pass": "respectée",
    }
    phrase = verdicts.get(result.verdict, result.verdict)
    narrative = (
        f"Sur l'attribut analysé, la règle des 4/5 est {phrase}. "
        f"Le Disparate Impact est de {result.disparate_impact} "
        f"(groupe le plus défavorisé : « {result.worst_group} » ; "
        f"référence : « {result.reference_value} »). "
        f"Score de risque agrégé : {result.risk_score}/100. "
        f"Verdict : {result.verdict}."
    )
    return InterpretationOut(
        narrative=narrative,
        ai_act_anchors=list(_AI_ACT_ANCHORS),
        disclaimers=list(_DISCLAIMERS),
        provider="fallback",
        model="deterministic",
    )


async def interpret_m1(
    result: M1Result, *, provider: LLMProvider | None
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

Run: `uv run pytest tests/api/test_interpretation.py -q`
Expected: PASS (all interpretation tests incl. the Task-3 template test).
The prompt uses `str.format`, so the literal JSON braces in the template are
doubled (`{{` `}}`) — verify the template renders without `KeyError`.

- [ ] **Step 5: Commit**

```bash
git add apps/api/app/interpretation/gemini.py apps/api/app/interpretation/m1.py apps/api/tests/api/test_interpretation.py
git -c core.autocrlf=false commit -m "feat(api): interpret_m1 with Gemini + deterministic fallback

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Wire interpretation into `audit_service`

**Files:**
- Modify: `apps/api/app/services/audit_service.py`
- Modify: `apps/api/app/routers/audits.py`
- Test: `apps/api/tests/api/test_audit_interpretation.py`

- [ ] **Step 1: Write the failing test**

Create `apps/api/tests/api/test_audit_interpretation.py`:

```python
import uuid

import pytest
from sqlalchemy.ext.asyncio import async_sessionmaker

from app.core.db import Base, make_engine
from app.integrations.storage import MemoryStorage
from app.models import Organization, User
from app.schemas.audit import AuditCreate
from app.services import audit_service, dataset_service


@pytest.fixture
async def ctx(tmp_path):
    eng = make_engine(f"sqlite+aiosqlite:///{tmp_path / 'i.db'}")
    async with eng.begin() as c:
        await c.run_sync(Base.metadata.create_all)
    sm = async_sessionmaker(eng, expire_on_commit=False)
    async with sm() as s:
        org = Organization(name="acme")
        s.add(org)
        await s.flush()
        u = User(id=uuid.uuid4(), org_id=org.id, email="a@acme.fr")
        s.add(u)
        await s.commit()
        oid, uid = org.id, u.id
    yield sm, oid, uid
    await eng.dispose()


def _csv() -> bytes:
    rows = ["genre,decision"]
    rows += ["H,oui"] * 100 + ["H,non"] * 100 + ["F,oui"] * 72 + ["F,non"] * 128
    return ("\n".join(rows) + "\n").encode()


async def test_audit_persists_fallback_interpretation(ctx):
    sm, oid, uid = ctx
    store = MemoryStorage()
    async with sm() as s:
        ds = await dataset_service.create_dataset(
            s, store, org_id=oid, user_id=uid, filename="r.csv",
            raw=_csv(), retention_days=30,
        )
        out = await audit_service.run_m1_audit(
            s, store, org_id=oid, user_id=uid,
            body=AuditCreate(dataset_id=ds.id, title="R",
                             protected_attribute="genre",
                             decision_column="decision",
                             favorable_value="oui"),
            llm_provider=None,
        )
        aid = out.id
    assert out.interpretation is not None
    assert out.interpretation.provider == "fallback"
    assert out.interpretation.disclaimers
    async with sm() as s:
        got = await audit_service.get_audit(s, aid, org_id=oid)
        assert got.interpretation is not None
        assert got.interpretation.provider == "fallback"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run pytest tests/api/test_audit_interpretation.py -q`
Expected: FAIL — `TypeError: run_m1_audit() got an unexpected keyword argument 'llm_provider'`.

- [ ] **Step 3: Write minimal implementation**

In `apps/api/app/services/audit_service.py`:

(a) Add imports near the other `app.` imports:

```python
from app.interpretation.base import LLMProvider
from app.interpretation.m1 import interpret_m1
from app.schemas.audit import InterpretationOut
```

(b) Change the `run_m1_audit` signature to accept the provider — replace the
`def run_m1_audit(` parameter block so it reads exactly:

```python
async def run_m1_audit(
    session: AsyncSession,
    storage: Storage,
    *,
    org_id: uuid.UUID,
    user_id: uuid.UUID,
    body: AuditCreate,
    llm_provider: LLMProvider | None,
) -> AuditOut:
```

(c) Replace the persistence block. Find:

```python
    metrics_out = _to_metrics_out(result)
    session.add(
        AuditResult(
            audit_id=audit.id,
            metrics=metrics_out.model_dump(),
            verdict=result.verdict,
            risk_score=result.risk_score,
            interpretation={},
        )
    )
    audit.status = "done"
    audit.completed_at = datetime.datetime.now(tz=datetime.timezone.utc)
    await session.commit()
    return _audit_out(audit, metrics_out)
```

Replace with:

```python
    metrics_out = _to_metrics_out(result)
    interpretation = await interpret_m1(result, provider=llm_provider)
    session.add(
        AuditResult(
            audit_id=audit.id,
            metrics=metrics_out.model_dump(),
            verdict=result.verdict,
            risk_score=result.risk_score,
            interpretation=interpretation.model_dump(),
        )
    )
    audit.status = "done"
    audit.completed_at = datetime.datetime.now(tz=datetime.timezone.utc)
    await session.commit()
    return _audit_out(audit, metrics_out, interpretation)
```

(d) Change `_audit_out` to accept and set interpretation. Replace the whole
`_audit_out` function with:

```python
def _audit_out(
    audit: Audit,
    metrics: M1MetricsOut | None,
    interpretation: InterpretationOut | None = None,
) -> AuditOut:
    return AuditOut(
        id=audit.id,
        code=audit.code,
        title=audit.title,
        status=audit.status,
        module=audit.module,
        dataset_id=audit.dataset_id,
        protected_attribute=audit.protected_attribute,
        decision_column=audit.decision_column,
        favorable_value=audit.favorable_value,
        privileged_value=audit.privileged_value,
        created_at=audit.created_at,
        completed_at=audit.completed_at,
        metrics=metrics,
        interpretation=interpretation,
    )
```

(e) In `get_audit`, replace the final block. Find:

```python
    metrics = (
        M1MetricsOut.model_validate(result.metrics) if result is not None else None
    )
    return _audit_out(audit, metrics)
```

Replace with:

```python
    metrics = (
        M1MetricsOut.model_validate(result.metrics) if result is not None else None
    )
    interpretation = (
        InterpretationOut.model_validate(result.interpretation)
        if result is not None and result.interpretation
        else None
    )
    return _audit_out(audit, metrics, interpretation)
```

In `apps/api/app/routers/audits.py`:

(a) Add imports:

```python
from app.interpretation.base import LLMProvider
from app.interpretation.gemini import get_llm_provider
```

(b) Add a provider dependency factory after `router = APIRouter(...)`:

```python
def get_llm_provider_dep() -> LLMProvider | None:
    return get_llm_provider()
```

(c) Change `create_audit` to inject + pass the provider. Replace the
`create_audit` function with:

```python
@router.post("", response_model=AuditOut, status_code=201)
async def create_audit(
    body: AuditCreate,
    user: CurrentUser = Depends(get_current_user),  # noqa: B008
    session: AsyncSession = Depends(get_session),  # noqa: B008
    storage: Storage = Depends(get_storage_dep),  # noqa: B008
    llm_provider: LLMProvider | None = Depends(get_llm_provider_dep),  # noqa: B008
) -> AuditOut:
    return await audit_service.run_m1_audit(
        session,
        storage,
        org_id=user.org_id,
        user_id=user.id,
        body=body,
        llm_provider=llm_provider,
    )
```

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run pytest tests/api/test_audit_interpretation.py -q`
Expected: PASS (1 passed). Then run the existing audit tests — they call
`run_m1_audit` WITHOUT `llm_provider`, so they will now fail with a missing
keyword arg. Update every `audit_service.run_m1_audit(...)` call in
`apps/api/tests/api/test_audit_service.py` to add `llm_provider=None` (4 call
sites). Re-run `uv run pytest tests/api/test_audit_service.py tests/api/test_audits_router.py -q` — all green (the router supplies the provider via the dep; `get_llm_provider()` returns `None` with no GEMINI key, so router tests get the deterministic fallback and still assert metrics fine).

- [ ] **Step 5: Commit**

```bash
git add apps/api/app/services/audit_service.py apps/api/app/routers/audits.py apps/api/tests/api/test_audit_interpretation.py apps/api/tests/api/test_audit_service.py
git -c core.autocrlf=false commit -m "feat(api): wire interpret_m1 into audit_service (fallback-safe)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Dashboard summary (service + router)

**Files:**
- Create: `apps/api/app/schemas/dashboard.py`, `apps/api/app/services/dashboard_service.py`, `apps/api/app/routers/dashboard.py`
- Modify: `apps/api/app/main.py`
- Test: `apps/api/tests/api/test_dashboard_service.py`, `apps/api/tests/api/test_dashboard_router.py`

- [ ] **Step 1: Write the failing test**

Create `apps/api/tests/api/test_dashboard_service.py`:

```python
import uuid

import pytest
from sqlalchemy.ext.asyncio import async_sessionmaker

from app.core.db import Base, make_engine
from app.integrations.storage import MemoryStorage
from app.models import Organization, User
from app.schemas.audit import AuditCreate
from app.services import audit_service, dashboard_service, dataset_service


@pytest.fixture
async def ctx(tmp_path):
    eng = make_engine(f"sqlite+aiosqlite:///{tmp_path / 'd.db'}")
    async with eng.begin() as c:
        await c.run_sync(Base.metadata.create_all)
    sm = async_sessionmaker(eng, expire_on_commit=False)
    async with sm() as s:
        org = Organization(name="acme")
        s.add(org)
        await s.flush()
        u = User(id=uuid.uuid4(), org_id=org.id, email="a@acme.fr")
        s.add(u)
        await s.commit()
        oid, uid = org.id, u.id
    yield sm, oid, uid
    await eng.dispose()


def _csv() -> bytes:
    rows = ["genre,decision"]
    rows += ["H,oui"] * 100 + ["H,non"] * 100 + ["F,oui"] * 72 + ["F,non"] * 128
    return ("\n".join(rows) + "\n").encode()


async def test_summary_aggregates_org_audits(ctx):
    sm, oid, uid = ctx
    store = MemoryStorage()
    async with sm() as s:
        ds = await dataset_service.create_dataset(
            s, store, org_id=oid, user_id=uid, filename="r.csv",
            raw=_csv(), retention_days=30,
        )
        await audit_service.run_m1_audit(
            s, store, org_id=oid, user_id=uid,
            body=AuditCreate(dataset_id=ds.id, title="R1",
                             protected_attribute="genre",
                             decision_column="decision",
                             favorable_value="oui"),
            llm_provider=None,
        )
        summary = await dashboard_service.get_summary(s, org_id=oid)
    assert summary.total_audits == 1
    assert summary.failing_audits == 1
    assert summary.module_usage == {"M1": 1}
    assert 0 <= summary.risk_score <= 100
    assert len(summary.recent_audits) == 1
    assert summary.recent_audits[0].verdict == "fail"


async def test_summary_is_org_scoped(ctx):
    sm, oid, uid = ctx
    async with sm() as s:
        summary = await dashboard_service.get_summary(s, org_id=uuid.uuid4())
    assert summary.total_audits == 0
    assert summary.risk_score == 0
    assert summary.recent_audits == []
```

Create `apps/api/tests/api/test_dashboard_router.py`:

```python
import httpx
import pytest
from sqlalchemy.ext.asyncio import async_sessionmaker

from app.core import deps
from app.core.db import Base, get_session, make_engine
from app.main import create_app


@pytest.fixture
async def client(tmp_path, monkeypatch):
    eng = make_engine(f"sqlite+aiosqlite:///{tmp_path / 'r.db'}")
    async with eng.begin() as c:
        await c.run_sync(Base.metadata.create_all)
    sm = async_sessionmaker(eng, expire_on_commit=False)

    async def _session_override():
        async with sm() as s:
            yield s

    monkeypatch.setattr(deps, "resolve_signing_key", lambda token: "k")
    monkeypatch.setattr(
        deps, "verify_token",
        lambda token, *, key, issuer=None: {
            "sub": "11111111-1111-1111-1111-111111111111",
            "email": "c@acme.fr",
        },
    )
    app = create_app()
    app.dependency_overrides[get_session] = _session_override
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://t") as c:
        yield c
    await eng.dispose()


async def test_dashboard_summary_requires_auth(client):
    r = await client.get("/api/v1/dashboard/summary")
    assert r.status_code == 401


async def test_dashboard_summary_empty_ok(client):
    r = await client.get(
        "/api/v1/dashboard/summary", headers={"Authorization": "Bearer x"}
    )
    assert r.status_code == 200
    body = r.json()
    assert body["total_audits"] == 0
    assert body["risk_score"] == 0
    assert body["recent_audits"] == []
    assert body["module_usage"] == {}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run pytest tests/api/test_dashboard_service.py tests/api/test_dashboard_router.py -q`
Expected: FAIL — `ModuleNotFoundError: No module named 'app.services.dashboard_service'`.

- [ ] **Step 3: Write minimal implementation**

Create `apps/api/app/schemas/dashboard.py`:

```python
from __future__ import annotations

import datetime
import uuid

from pydantic import BaseModel, ConfigDict

from app.schemas.audit import Verdict


class RecentAudit(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: uuid.UUID
    code: str | None
    title: str
    module: str
    verdict: Verdict | None
    risk_score: int | None
    created_at: datetime.datetime


class DashboardSummaryOut(BaseModel):
    model_config = ConfigDict(extra="forbid")

    total_audits: int
    failing_audits: int
    warning_audits: int
    risk_score: int
    module_usage: dict[str, int]
    recent_audits: list[RecentAudit]
```

Create `apps/api/app/services/dashboard_service.py`:

```python
from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Audit, AuditResult
from app.schemas.dashboard import DashboardSummaryOut, RecentAudit

_RECENT_LIMIT = 10


async def get_summary(
    session: AsyncSession, *, org_id: uuid.UUID
) -> DashboardSummaryOut:
    rows = (
        (
            await session.execute(
                select(Audit, AuditResult)
                .join(
                    AuditResult,
                    AuditResult.audit_id == Audit.id,
                    isouter=True,
                )
                .where(Audit.org_id == org_id)
                .order_by(Audit.created_at.desc())
            )
        )
        .all()
    )

    total = len(rows)
    failing = sum(
        1 for _a, r in rows if r is not None and r.verdict == "fail"
    )
    warning = sum(
        1 for _a, r in rows if r is not None and r.verdict == "warn"
    )
    scores = [r.risk_score for _a, r in rows if r is not None]
    risk = round(sum(scores) / len(scores)) if scores else 0

    module_usage: dict[str, int] = {}
    for audit, _r in rows:
        module_usage[audit.module] = module_usage.get(audit.module, 0) + 1

    recent = [
        RecentAudit(
            id=audit.id,
            code=audit.code,
            title=audit.title,
            module=audit.module,
            verdict=result.verdict if result is not None else None,
            risk_score=result.risk_score if result is not None else None,
            created_at=audit.created_at,
        )
        for audit, result in rows[:_RECENT_LIMIT]
    ]

    return DashboardSummaryOut(
        total_audits=total,
        failing_audits=failing,
        warning_audits=warning,
        risk_score=risk,
        module_usage=module_usage,
        recent_audits=recent,
    )
```

Create `apps/api/app/routers/dashboard.py`:

```python
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.core.deps import get_current_user
from app.schemas.auth import CurrentUser
from app.schemas.dashboard import DashboardSummaryOut
from app.services import dashboard_service

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary", response_model=DashboardSummaryOut)
async def summary(
    user: CurrentUser = Depends(get_current_user),  # noqa: B008
    session: AsyncSession = Depends(get_session),  # noqa: B008
) -> DashboardSummaryOut:
    return await dashboard_service.get_summary(session, org_id=user.org_id)
```

In `apps/api/app/main.py`, change `from app.routers import audits, auth, datasets, health`
to:

```python
from app.routers import audits, auth, dashboard, datasets, health
```

and add after `app.include_router(audits.router, prefix=API_PREFIX)`:

```python
    app.include_router(dashboard.router, prefix=API_PREFIX)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run pytest tests/api/test_dashboard_service.py tests/api/test_dashboard_router.py -q`
Expected: PASS (4 passed).

- [ ] **Step 5: Commit**

```bash
git add apps/api/app/schemas/dashboard.py apps/api/app/services/dashboard_service.py apps/api/app/routers/dashboard.py apps/api/app/main.py apps/api/tests/api/test_dashboard_service.py apps/api/tests/api/test_dashboard_router.py
git -c core.autocrlf=false commit -m "feat(api): dashboard summary endpoint (org-scoped)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: Full gate, lint, type-check, docs

**Files:**
- Modify: `apps/api/README.md`

- [ ] **Step 1: Full suite**

Run from `apps/api`: `uv run pytest -q`
Expected: PASS, 0 failed (Plan-1 engine 40 + 2A + 2B + 2C). If any fail, fix the
implementation (never weaken tests).

- [ ] **Step 2: Lint** — `uv run ruff check app tests` → `All checks passed!`
- [ ] **Step 3: Type-check** — `uv run mypy app` → `Success: no issues found`.
  The LLM/`json.loads` boundaries are dynamically typed; if mypy strict flags an
  unavoidable `Any`, add a narrowly-scoped `# type: ignore[<code>]` ONLY on that
  line with a one-line justification — do not change behavior.

- [ ] **Step 4: Update README**

In `apps/api/README.md`, under the `#### Datasets & audits (Plan 2B)` block,
append:

```markdown

#### Interpretation & dashboard (Plan 2C)

Each audit is interpreted by Gemini (`GEMINI_API_KEY`/`GEMINI_MODEL`) into a
French narrative + AI-Act anchors + disclaimers; on any LLM failure a
deterministic fallback is persisted (`provider="fallback"`) and the audit never
fails. `GET /api/v1/dashboard/summary` returns org-scoped aggregates
(total/failing/warning audits, mean risk score, module usage, recent audits).
```

- [ ] **Step 5: Commit**

```bash
git add apps/api/README.md
git -c core.autocrlf=false commit -m "docs(api): document interpretation + dashboard (Plan 2C)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Self-Review

**1. Spec coverage (spec §6 interpretation, §4 step 4, §4.6 dashboard):**
- §6 `LLMProvider` ABC + `GeminiProvider` (google-genai) → Task 2/4; `interpret_m1` builds prompt from versioned FR template, cites AI Act art 10/13/15 + 4/5, no absolute claims, always disclaimers → Task 3/4; resilience: LLM failure/None → deterministic fallback, `provider="fallback"`, never blocks the audit → Task 4 (tests for ok/none/raises) + Task 5 (persisted, fallback-safe). Mistral wireable later (interface ready) — not built (deferred, spec says fallback only).
- §4 step 4 `interpret_m1` between `run_m1` and persistence, stored in `audit_results.interpretation` → Task 5 (replaces the `interpretation={}` seam; `AuditOut.interpretation` exposes it; `get_audit` re-inflates).
- §4.6 `GET /dashboard/summary` aggregates org audits → KPIs, risk score, module usage, recent → Task 6 (org-scoped; cross-org empty).
- §8 no PII: prompt sends only aggregate metrics (rates/counts/labels), never raw rows; fallback text uses only metrics. ✓
- **Deferred (Plan 2D / Plan 3, not gaps):** SlowAPI, Swagger-off, CORS guard, concurrent-provision race; the web dashboard un-mock is Plan 3 (this exposes the API it will consume).

**2. Placeholder scan:** every step has complete code + exact command/expected output. The Task-3 template test goes green at Task-4 (explicitly noted, not a placeholder — TDD ordering for a data file whose loader lands next task).

**3. Type consistency:** `LLMProvider` (`name`/`model`/`complete(prompt,*,as_json=False)->str`), `InterpretationOut` (5 fields), `interpret_m1(result,*,provider)->InterpretationOut`, `get_llm_provider()->LLMProvider|None`, `get_llm_provider_dep`, `run_m1_audit(...,llm_provider:LLMProvider|None)`, `_audit_out(audit,metrics,interpretation=None)`, `dashboard_service.get_summary(session,*,org_id)->DashboardSummaryOut`, `RecentAudit`/`DashboardSummaryOut` fields are used identically across tasks. `AuditResult.interpretation` jsonb stores `InterpretationOut.model_dump()` and is re-read via `model_validate` (symmetric). Existing `test_audit_service.py` call sites updated for the new required `llm_provider` kwarg (Task 5 Step 4). `Verdict` reused from `schemas.audit` in dashboard schema.
