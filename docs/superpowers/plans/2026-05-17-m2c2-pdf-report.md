# M2-C2 — PDF Compliance Report (Puppeteer microservice) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a PDF compliance report (`GET /audits/{id}/report.pdf`): a server-rendered HTML report turned into PDF by a new `apps/pdf` Puppeteer microservice, with non-silent 502 on microservice failure and Storage caching — transversal M1+M2.

**Architecture:** Mirror the merged Excel path. New `reporting/html.py` (pure `AuditOut → HTML`), `reporting/pdf_client.py` (httpx → `apps/pdf` `POST /render`, secret header, failure → RFC 7807 502), `report_service.get_or_build_pdf` (cache-or-build, `format="pdf"`), one router endpoint. New standalone Node ESM microservice `apps/pdf` (zero-config `node:http` + Puppeteer, secret-guarded, dependency-injected renderer so unit tests need no Chromium).

**Tech Stack:** FastAPI, httpx, respx (Python tests); Node 25 ESM, Puppeteer, built-in `node:test` (microservice). Reuses M2-C1 `Report`/`report_service`/`get_report_storage`/`get_audit`.

---

## Scope

Plan **M2-C2** of M2-C. M2-C1 (Excel) merged. **In:** `Settings.pdf_service_url`/`pdf_service_secret`; `reporting/html.py`; `reporting/pdf_client.py`; `report_service.get_or_build_pdf`; `GET /audits/{id}/report.pdf`; new `apps/pdf` microservice + workspace wiring. **Out:** web download buttons (M2-C3). M2-C2 ships a working PDF report; Python tests mock the microservice over HTTP (respx) so they need no Node/Chromium; the microservice has its own `node:test` (secret guard + render contract via an injected stub renderer — no Chromium in CI).

Python: run from `apps/api/`, `uv run python -m pytest`. Microservice: from `apps/pdf/`, `node --test`. Commit `git -c core.autocrlf=false commit` (author Franck F preconfigured; **never** Co-Authored-By/Claude trailer). **At execution start, in the worktree run `git config user.name "Franck F"; git config user.email "franck-dilane1.fambou@epitech.digital"`** (fresh worktrees don't inherit it — known recurring leak).

## File Structure

- Modify `apps/api/app/core/config.py` — `pdf_service_url: str = ""`, `pdf_service_secret: SecretStr = SecretStr("")`.
- Create `apps/api/app/reporting/html.py` — `build_report_html(audit: AuditOut) -> str`. Pure.
- Create `apps/api/app/reporting/pdf_client.py` — `async render_pdf(html: str) -> bytes`. httpx → microservice; failure → `APIError(status=502)`.
- Modify `apps/api/app/services/report_service.py` — add `get_or_build_pdf(...)` mirroring `get_or_build_excel`.
- Modify `apps/api/app/routers/audits.py` — `GET /audits/{audit_id}/report.pdf`.
- Modify `pnpm-workspace.yaml` — add `- "apps/pdf"`.
- Create `apps/pdf/package.json`, `apps/pdf/server.mjs`, `apps/pdf/render.mjs`, `apps/pdf/test/server.test.mjs`, `apps/pdf/README.md`.
- Tests (Python): `tests/api/test_report_html.py`, `tests/api/test_pdf_client.py`, extend `tests/api/test_report_service.py`, extend `tests/api/test_audits_router.py`.

Patterns to follow (read first): `app/reporting/excel.py`, `app/services/report_service.py` (`get_or_build_excel`), `app/routers/audits.py` (`get_audit_report_xlsx`, `get_report_storage_dep`), `app/core/config.py`, `app/core/errors.py` (`APIError`), `tests/api/test_excel_report.py`, `tests/api/test_report_service.py`, `tests/api/test_audits_router.py`. Conventions: pure builders (`AuditOut → bytes/str`); `APIError(detail, *, title=, status=)` → RFC 7807; respx for httpx tests; `@lru_cache` settings; org-scoping via `get_audit`.

---

### Task 1: Settings — PDF microservice config

**Files:**
- Modify: `app/core/config.py`
- Test: `tests/api/test_config_pdf.py`

- [ ] **Step 1: Write the failing test**

Create `tests/api/test_config_pdf.py`:

```python
from app.core.config import Settings


def test_pdf_service_defaults_empty():
    s = Settings(_env_file=None)
    assert s.pdf_service_url == ""
    assert s.pdf_service_secret.get_secret_value() == ""


def test_pdf_service_env_override(monkeypatch):
    monkeypatch.setenv("PDF_SERVICE_URL", "http://pdf:8080")
    monkeypatch.setenv("PDF_SERVICE_SECRET", "shh")
    s = Settings(_env_file=None)
    assert s.pdf_service_url == "http://pdf:8080"
    assert s.pdf_service_secret.get_secret_value() == "shh"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run python -m pytest tests/api/test_config_pdf.py -v`
Expected: FAIL — `Settings` has no `pdf_service_url`/`pdf_service_secret`.

- [ ] **Step 3: Write minimal implementation**

In `app/core/config.py`, add two fields directly below the `storage_bucket_reports` line in `Settings` (`SecretStr` is already imported — it is used by `supabase_service_role_key`):

```python
    pdf_service_url: str = ""
    pdf_service_secret: SecretStr = SecretStr("")
```

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run python -m pytest tests/api/test_config_pdf.py tests/api/test_config.py -v`
Expected: PASS (new + existing config tests).

- [ ] **Step 5: Commit**

```bash
git add app/core/config.py tests/api/test_config_pdf.py
git -c core.autocrlf=false commit -m "feat(api): PDF microservice settings"
```

---

### Task 2: `reporting/html.py` — build_report_html

**Files:**
- Create: `app/reporting/html.py`
- Test: `tests/api/test_report_html.py`

- [ ] **Step 1: Write the failing test**

Create `tests/api/test_report_html.py`:

```python
import datetime
import uuid

from app.reporting.html import build_report_html
from app.schemas.audit import (
    AuditOut,
    ClusterStatOut,
    GroupStatOut,
    InterpretationOut,
    M1MetricsOut,
    M2MetricsOut,
)

_NOW = datetime.datetime(2026, 5, 17, tzinfo=datetime.timezone.utc)


def _interp() -> InterpretationOut:
    return InterpretationOut(
        narrative="Texte.", ai_act_anchors=["AI Act, article 10"],
        disclaimers=["Aide à l'analyse."], provider="fallback",
        model="deterministic",
    )


def _m1() -> AuditOut:
    return AuditOut(
        id=uuid.uuid4(), code="AUD-2026-001", title="Recrutement", status="done",
        module="M1", dataset_id=uuid.uuid4(), protected_attribute="genre",
        decision_column="embauche", favorable_value="oui", privileged_value=None,
        created_at=_NOW, completed_at=_NOW,
        metrics=M1MetricsOut(
            groups=[GroupStatOut(value="F", n=100, favorable=30,
                                 selection_rate=0.3, disparate_impact=0.6)],
            reference_value="H", disparate_impact=0.6,
            demographic_parity_diff=0.2, worst_group="F", verdict="fail",
            risk_score=80, warnings=[]),
        interpretation=_interp(), pre_check=["Déséquilibre groupe F."],
        config=None,
    )


def _m2() -> AuditOut:
    return AuditOut(
        id=uuid.uuid4(), code="AUD-2026-002", title="Détection", status="done",
        module="M2", dataset_id=uuid.uuid4(), protected_attribute=None,
        decision_column="embauche", favorable_value="oui", privileged_value=None,
        created_at=_NOW, completed_at=_NOW,
        metrics=M2MetricsOut(
            n=240, k=2, global_positive_rate=0.5, chi2=88.1, p_value=0.0001,
            dof=1,
            clusters=[ClusterStatOut(id=0, n=120, positive_rate=0.1,
                                     deviation_pp=-40, is_deviant=True,
                                     top_features=[])],
            deviant_cluster_ids=[0], verdict="fail", risk_score=88,
            warnings=[]),
        interpretation=_interp(), pre_check=[], config={"k": 2},
    )


def test_html_m1_is_wellformed_and_not_a_certificate():
    h = build_report_html(_m1())
    assert h.lstrip().startswith("<!DOCTYPE html>")
    assert "<html" in h and "</html>" in h
    assert "AUD-2026-001" in h
    assert "Disparate Impact" in h
    assert "n'est pas un certificat" in h
    # present on first page AND footer (>= 2 occurrences)
    assert h.count("n'est pas un certificat") >= 2
    assert "AI Act" in h and "L.1132-1" in h


def test_html_m2_renders_clusters():
    h = build_report_html(_m2())
    assert "AUD-2026-002" in h
    assert "Khi-deux" in h or "p-value" in h
    assert "n'est pas un certificat" in h
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run python -m pytest tests/api/test_report_html.py -v`
Expected: FAIL — `ModuleNotFoundError: app.reporting.html`.

- [ ] **Step 3: Write minimal implementation**

Create `app/reporting/html.py`:

```python
"""Pure HTML compliance report: build_report_html(AuditOut) -> str.

No I/O. The HTML is rendered to PDF by the apps/pdf microservice.
"""
from __future__ import annotations

from html import escape

from app.schemas.audit import AuditOut, M2MetricsOut

_VERDICT_FR = {
    "fail": ("Critique", "#b42318"),
    "warn": ("Vigilance", "#b54708"),
    "pass": ("Conforme", "#067647"),
}
_NOT_A_CERTIFICATE = (
    "Ce rapport est une aide à l'analyse documentée : il n'est pas un "
    "certificat de conformité ni un avis juridique."
)
_FR_LAW = (
    "Références droit français : Code du travail L.1132-1 ; Défenseur des "
    "droits ; CNIL ; ACPR (selon le contexte d'usage)."
)
_AI_ACT = [
    ("Article 9 — gestion des risques", "Risque agrégé / verdict"),
    ("Article 10 — qualité des données", "Pré-vérifications / groupes"),
    ("Article 11 — documentation technique", "Ce rapport (trace documentée)"),
]


def _e(v: object) -> str:
    return escape(str(v))


def _rows(pairs: list[tuple[str, object]]) -> str:
    return "".join(
        f"<tr><th>{_e(k)}</th><td>{_e(v)}</td></tr>" for k, v in pairs
    )


def _detail(audit: AuditOut) -> str:
    m = audit.metrics
    if m is None:
        return "<p>Résultats indisponibles pour cet audit.</p>"
    if isinstance(m, M2MetricsOut):
        head = _rows(
            [
                ("Test du Khi-deux (p-value)", m.p_value),
                ("χ² / ddl", f"{m.chi2} / {m.dof}"),
                ("Taux favorable global", m.global_positive_rate),
                ("Clusters déviants", f"{len(m.deviant_cluster_ids)} / {m.k}"),
            ]
        )
        body = "".join(
            f"<tr><td>{c.id}</td><td>{c.n}</td><td>{c.positive_rate}</td>"
            f"<td>{c.deviation_pp}</td>"
            f"<td>{'oui' if c.is_deviant else 'non'}</td></tr>"
            for c in m.clusters
        )
        return (
            f"<h2>Module 2 — détection non supervisée</h2>"
            f"<table class='kv'>{head}</table>"
            f"<table class='grid'><thead><tr><th>Cluster</th><th>Effectif"
            f"</th><th>Taux fav.</th><th>Écart (pts)</th><th>Déviant</th>"
            f"</tr></thead><tbody>{body}</tbody></table>"
        )
    head = _rows(
        [
            ("Disparate Impact", m.disparate_impact),
            ("Demographic Parity (écart)", m.demographic_parity_diff),
            ("Groupe le plus défavorisé", m.worst_group),
            ("Référence", m.reference_value),
        ]
    )
    body = "".join(
        f"<tr><td>{_e(g.value)}</td><td>{g.n}</td><td>{g.favorable}</td>"
        f"<td>{g.selection_rate}</td><td>{g.disparate_impact}</td></tr>"
        for g in m.groups
    )
    return (
        f"<h2>Module 1 — audit supervisé</h2>"
        f"<table class='kv'>{head}</table>"
        f"<table class='grid'><thead><tr><th>Groupe</th><th>Effectif</th>"
        f"<th>Favorables</th><th>Taux</th><th>DI</th></tr></thead>"
        f"<tbody>{body}</tbody></table>"
    )


def build_report_html(audit: AuditOut) -> str:
    m = audit.metrics
    verdict = m.verdict if m is not None else "pass"
    label, color = _VERDICT_FR.get(verdict, ("—", "#475467"))
    risk = m.risk_score if m is not None else "—"
    pre = "".join(f"<li>{_e(w)}</li>" for w in audit.pre_check) or "<li>Aucune.</li>"
    disc = (
        "".join(f"<li>{_e(d)}</li>" for d in audit.interpretation.disclaimers)
        if audit.interpretation is not None
        else "<li>—</li>"
    )
    anchors = "".join(
        f"<tr><th>{_e(a)}</th><td>{_e(b)}</td></tr>" for a, b in _AI_ACT
    )
    narrative = (
        _e(audit.interpretation.narrative)
        if audit.interpretation is not None
        else ""
    )
    return f"""<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8">
<style>
body{{font-family:Arial,Helvetica,sans-serif;color:#101828;margin:32px}}
h1{{font-size:22px}} h2{{font-size:16px;margin-top:24px}}
table{{border-collapse:collapse;width:100%;margin:8px 0;font-size:12px}}
.kv th{{text-align:left;width:240px;color:#475467}}
.grid th,.grid td,.kv th,.kv td{{border:1px solid #eaecf0;padding:6px 8px}}
.badge{{display:inline-block;padding:4px 10px;border-radius:6px;color:#fff;
background:{color};font-weight:bold}}
.note{{color:#475467;font-size:11px;margin-top:6px}}
footer{{margin-top:32px;border-top:1px solid #eaecf0;padding-top:8px;
color:#475467;font-size:10px}}
</style></head><body>
<h1>Rapport de conformité AuditIQ</h1>
<p class="note">{_e(_NOT_A_CERTIFICATE)}</p>
<table class="kv">
<tr><th>Audit</th><td>{_e(audit.code or audit.id)}</td></tr>
<tr><th>Titre</th><td>{_e(audit.title)}</td></tr>
<tr><th>Module</th><td>{_e(audit.module)}</td></tr>
<tr><th>Statut</th><td>{_e(audit.status)}</td></tr>
<tr><th>Verdict</th><td><span class="badge">{_e(label)}</span></td></tr>
<tr><th>Score de risque</th><td>{_e(risk)}/100</td></tr>
</table>
{_detail(audit)}
<h2>Interprétation</h2><p>{narrative}</p>
<h2>Mise en regard AI Act</h2><table class="kv">{anchors}</table>
<p class="note">{_e(_FR_LAW)}</p>
<h2>Pré-vérifications</h2><ul>{pre}</ul>
<h2>Limites</h2><ul>{disc}</ul>
<footer>{_e(_NOT_A_CERTIFICATE)}</footer>
</body></html>"""
```

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run python -m pytest tests/api/test_report_html.py -v`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add app/reporting/html.py tests/api/test_report_html.py
git -c core.autocrlf=false commit -m "feat(api): HTML compliance report builder (M1+M2)"
```

---

### Task 3: `reporting/pdf_client.py` — render_pdf

**Files:**
- Create: `app/reporting/pdf_client.py`
- Test: `tests/api/test_pdf_client.py`

- [ ] **Step 1: Write the failing test**

Create `tests/api/test_pdf_client.py`:

```python
import httpx
import pytest
import respx

from app.core.errors import APIError
from app.reporting.pdf_client import render_pdf


@respx.mock
async def test_render_pdf_success(monkeypatch):
    monkeypatch.setenv("PDF_SERVICE_URL", "http://pdf:8080")
    monkeypatch.setenv("PDF_SERVICE_SECRET", "shh")
    from app.core.config import get_settings

    get_settings.cache_clear()
    try:
        route = respx.post("http://pdf:8080/render").mock(
            return_value=httpx.Response(
                200, content=b"%PDF-1.7 fake",
                headers={"content-type": "application/pdf"},
            )
        )
        out = await render_pdf("<html></html>")
        assert out == b"%PDF-1.7 fake"
        sent = route.calls[0].request
        assert sent.headers["x-pdf-secret"] == "shh"
    finally:
        get_settings.cache_clear()


@respx.mock
async def test_render_pdf_5xx_raises_502(monkeypatch):
    monkeypatch.setenv("PDF_SERVICE_URL", "http://pdf:8080")
    monkeypatch.setenv("PDF_SERVICE_SECRET", "shh")
    from app.core.config import get_settings

    get_settings.cache_clear()
    try:
        respx.post("http://pdf:8080/render").mock(
            return_value=httpx.Response(503)
        )
        with pytest.raises(APIError) as e:
            await render_pdf("<html></html>")
        assert e.value.status == 502
    finally:
        get_settings.cache_clear()


@respx.mock
async def test_render_pdf_timeout_raises_502(monkeypatch):
    monkeypatch.setenv("PDF_SERVICE_URL", "http://pdf:8080")
    monkeypatch.setenv("PDF_SERVICE_SECRET", "shh")
    from app.core.config import get_settings

    get_settings.cache_clear()
    try:
        respx.post("http://pdf:8080/render").mock(
            side_effect=httpx.ConnectTimeout("boom")
        )
        with pytest.raises(APIError) as e:
            await render_pdf("<html></html>")
        assert e.value.status == 502
    finally:
        get_settings.cache_clear()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run python -m pytest tests/api/test_pdf_client.py -v`
Expected: FAIL — `ModuleNotFoundError: app.reporting.pdf_client`.

- [ ] **Step 3: Write minimal implementation**

Create `app/reporting/pdf_client.py`:

```python
"""Thin client to the apps/pdf Puppeteer microservice. Non-silent on failure."""
from __future__ import annotations

import httpx

from app.core.config import get_settings
from app.core.errors import APIError

_TIMEOUT = httpx.Timeout(30.0)


async def render_pdf(html: str) -> bytes:
    """POST the HTML to the PDF microservice; return PDF bytes.

    Any transport error or non-2xx response raises APIError(502) — the PDF
    is never silently swallowed; the Excel report stays independently usable.
    """
    s = get_settings()
    url = f"{s.pdf_service_url.rstrip('/')}/render"
    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            resp = await client.post(
                url,
                json={"html": html},
                headers={
                    "X-PDF-Secret": s.pdf_service_secret.get_secret_value()
                },
            )
        resp.raise_for_status()
    except (httpx.HTTPError, httpx.HTTPStatusError) as exc:
        raise APIError(
            "Le rapport PDF est momentanément indisponible. "
            "Le rapport Excel reste disponible.",
            title="Bad Gateway",
            status=502,
        ) from exc
    return resp.content
```

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run python -m pytest tests/api/test_pdf_client.py -v`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add app/reporting/pdf_client.py tests/api/test_pdf_client.py
git -c core.autocrlf=false commit -m "feat(api): PDF microservice client (502 non-silent)"
```

---

### Task 4: `report_service.get_or_build_pdf`

**Files:**
- Modify: `app/services/report_service.py`
- Test: `tests/api/test_report_service.py`

- [ ] **Step 1: Write the failing test**

Append to `tests/api/test_report_service.py` (reuse its existing `ctx` fixture — read the file; it yields `(sm, org_id, audit_id)` for a done audit; reuse exactly):

```python
import respx as _respx
import httpx as _httpx


async def test_get_or_build_pdf_builds_then_caches(ctx, monkeypatch):
    sm, org_id, audit_id = ctx
    monkeypatch.setenv("PDF_SERVICE_URL", "http://pdf:8080")
    monkeypatch.setenv("PDF_SERVICE_SECRET", "shh")
    from app.core.config import get_settings

    get_settings.cache_clear()
    store = MemoryStorage()
    try:
        with _respx.mock:
            r = _respx.post("http://pdf:8080/render").mock(
                return_value=_httpx.Response(200, content=b"%PDF-1.7 x")
            )
            async with sm() as session:
                b1, name = await report_service.get_or_build_pdf(
                    session, store, audit_id, org_id=org_id
                )
                assert name.endswith(".pdf")
                assert b1 == b"%PDF-1.7 x"
                rows = (
                    await session.execute(
                        select(Report).where(Report.audit_id == audit_id)
                    )
                ).scalars().all()
                assert any(x.format == "pdf" for x in rows)
            async with sm() as session:
                b2, _n = await report_service.get_or_build_pdf(
                    session, store, audit_id, org_id=org_id
                )
            assert b2 == b1
            assert r.call_count == 1  # second call served from cache
    finally:
        get_settings.cache_clear()
```

(`MemoryStorage`, `Report`, `report_service`, `select` are already imported at the top of the file from the Excel tests — do not duplicate imports; add only `import respx as _respx` / `import httpx as _httpx` if not already present.)

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run python -m pytest tests/api/test_report_service.py -k pdf -v`
Expected: FAIL — `report_service` has no `get_or_build_pdf`.

- [ ] **Step 3: Write minimal implementation**

In `app/services/report_service.py` add (keep `get_or_build_excel` and `_XLSX` unchanged; add a `_PDF` constant next to `_XLSX`):

```python
_PDF = "pdf"
```

```python
from app.reporting.html import build_report_html
from app.reporting.pdf_client import render_pdf
```

```python
async def get_or_build_pdf(
    session: AsyncSession,
    storage: Storage,
    audit_id: uuid.UUID,
    *,
    org_id: uuid.UUID,
) -> tuple[bytes, str]:
    """Return (pdf_bytes, filename). Builds once via the PDF microservice,
    then serves from cache. Org-scoped via get_audit. A microservice failure
    propagates as APIError(502) (raised by render_pdf) — never silent."""
    audit = await get_audit(session, audit_id, org_id=org_id)
    existing = (
        await session.execute(
            select(Report).where(
                Report.audit_id == audit_id, Report.format == _PDF
            )
        )
    ).scalar_one_or_none()
    filename = f"{audit.code or audit.id}.pdf"
    if existing is not None:
        return await storage.download(existing.storage_path), filename

    data = await render_pdf(build_report_html(audit))
    path = f"{org_id}/{audit_id}.pdf"
    await storage.upload(path, data, "application/pdf")
    session.add(Report(audit_id=audit_id, format=_PDF, storage_path=path))
    await session.commit()
    return data, filename
```

Add the two new imports to the existing import block at the top (alongside `from app.reporting.excel import build_excel_report`).

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run python -m pytest tests/api/test_report_service.py -v`
Expected: PASS (existing Excel + new PDF).

- [ ] **Step 5: Commit**

```bash
git add app/services/report_service.py tests/api/test_report_service.py
git -c core.autocrlf=false commit -m "feat(api): report service get_or_build_pdf"
```

---

### Task 5: Router — GET /audits/{id}/report.pdf

**Files:**
- Modify: `app/routers/audits.py`
- Test: `tests/api/test_audits_router.py`

- [ ] **Step 1: Write the failing test**

Append to `tests/api/test_audits_router.py` (reuse the existing `client` + `m1_done_audit_id` fixtures and the `get_report_storage_dep` override pattern added in M2-C1; add `respx`/`httpx` imports at top only if missing):

```python
async def test_get_audit_report_pdf(client, m1_done_audit_id, monkeypatch):
    import httpx as _hx
    import respx as _rx

    monkeypatch.setenv("PDF_SERVICE_URL", "http://pdf:8080")
    monkeypatch.setenv("PDF_SERVICE_SECRET", "shh")
    from app.core.config import get_settings

    get_settings.cache_clear()
    try:
        with _rx.mock:
            _rx.post("http://pdf:8080/render").mock(
                return_value=_hx.Response(200, content=b"%PDF-1.7 ok")
            )
            r = await client.get(
                f"/api/v1/audits/{m1_done_audit_id}/report.pdf"
            )
        assert r.status_code == 200, r.text
        assert r.headers["content-type"] == "application/pdf"
        assert "attachment" in r.headers["content-disposition"]
        assert r.content[:4] == b"%PDF"
    finally:
        get_settings.cache_clear()


async def test_get_audit_report_pdf_unknown_is_404(client):
    import uuid as _u

    r = await client.get(f"/api/v1/audits/{_u.uuid4()}/report.pdf")
    assert r.status_code == 404
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run python -m pytest tests/api/test_audits_router.py -k report_pdf -v`
Expected: FAIL — route absent.

- [ ] **Step 3: Write minimal implementation**

In `app/routers/audits.py` add the endpoint after `get_audit_report_xlsx` (reuse the exact same `Depends` identifiers as that route — `user`/`session`/`storage` via `get_current_user`/`get_session`/`get_report_storage_dep`; `Response`, `report_service`, `Storage`, `uuid` already imported from M2-C1):

```python
@router.get("/{audit_id}/report.pdf")
async def get_audit_report_pdf(
    audit_id: uuid.UUID,
    user: CurrentUser = Depends(get_current_user),  # noqa: B008
    session: AsyncSession = Depends(get_session),  # noqa: B008
    storage: Storage = Depends(get_report_storage_dep),  # noqa: B008
) -> Response:
    data, filename = await report_service.get_or_build_pdf(
        session, storage, audit_id, org_id=user.org_id
    )
    return Response(
        content=data,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
```

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run python -m pytest tests/api/test_audits_router.py -v`
Expected: PASS (existing routes + 2 new report.pdf tests).

- [ ] **Step 5: Commit**

```bash
git add app/routers/audits.py tests/api/test_audits_router.py
git -c core.autocrlf=false commit -m "feat(api): GET /audits/{id}/report.pdf"
```

---

### Task 6: `apps/pdf` Puppeteer microservice

**Files:**
- Modify: `pnpm-workspace.yaml`
- Create: `apps/pdf/package.json`, `apps/pdf/render.mjs`, `apps/pdf/server.mjs`, `apps/pdf/test/server.test.mjs`, `apps/pdf/README.md`

- [ ] **Step 1: Write the failing test**

Create `apps/pdf/test/server.test.mjs`:

```javascript
import assert from 'node:assert/strict';
import test from 'node:test';
import { createServer } from '../server.mjs';

const SECRET = 'shh';

function listen(app) {
  return new Promise((res) => {
    const s = app.listen(0, () => res(s));
  });
}

test('403 when secret header missing or wrong', async () => {
  const app = createServer({ secret: SECRET, render: async () => Buffer.from('%PDF') });
  const s = await listen(app);
  const port = s.address().port;
  try {
    const r1 = await fetch(`http://127.0.0.1:${port}/render`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ html: '<p>x</p>' }),
    });
    assert.equal(r1.status, 403);
    const r2 = await fetch(`http://127.0.0.1:${port}/render`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-pdf-secret': 'nope' },
      body: JSON.stringify({ html: '<p>x</p>' }),
    });
    assert.equal(r2.status, 403);
  } finally {
    s.close();
  }
});

test('200 application/pdf with valid secret (injected renderer)', async () => {
  const app = createServer({
    secret: SECRET,
    render: async (html) => Buffer.from('%PDF-1.7 ' + html),
  });
  const s = await listen(app);
  const port = s.address().port;
  try {
    const r = await fetch(`http://127.0.0.1:${port}/render`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-pdf-secret': SECRET },
      body: JSON.stringify({ html: '<p>hi</p>' }),
    });
    assert.equal(r.status, 200);
    assert.equal(r.headers.get('content-type'), 'application/pdf');
    const buf = Buffer.from(await r.arrayBuffer());
    assert.ok(buf.toString().startsWith('%PDF'));
  } finally {
    s.close();
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

From `apps/pdf/`: `node --test`
Expected: FAIL — `Cannot find module '../server.mjs'`.

(If `node --test` cannot resolve because the package isn't installed yet, that is the expected failing state — proceed to Step 3.)

- [ ] **Step 3: Write minimal implementation**

Add to `pnpm-workspace.yaml` under `packages:` (keep existing entries):

```yaml
  - "apps/pdf"
```

Create `apps/pdf/package.json`:

```json
{
  "name": "@auditiq/pdf",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "start": "node server.mjs",
    "test": "node --test",
    "lint": "true",
    "typecheck": "true"
  },
  "dependencies": {
    "puppeteer": "^23.0.0"
  }
}
```

Create `apps/pdf/render.mjs`:

```javascript
// Real Puppeteer HTML->PDF renderer. Isolated so the server can be unit
// tested with an injected stub (no Chromium needed in CI).
import puppeteer from 'puppeteer';

export async function renderPdf(html) {
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    return await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '16mm', bottom: '16mm', left: '14mm', right: '14mm' },
    });
  } finally {
    await browser.close();
  }
}
```

Create `apps/pdf/server.mjs`:

```javascript
import { createServer as httpCreateServer } from 'node:http';

import { renderPdf } from './render.mjs';

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (c) => {
      body += c;
      if (body.length > 5_000_000) reject(new Error('payload too large'));
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body || '{}'));
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

// `opts.render` defaults to the real Puppeteer renderer; tests inject a stub.
export function createServer(opts = {}) {
  const secret = opts.secret ?? process.env.PDF_SERVICE_SECRET ?? '';
  const render = opts.render ?? renderPdf;
  return httpCreateServer(async (req, res) => {
    if (req.method !== 'POST' || req.url !== '/render') {
      res.writeHead(404).end('not found');
      return;
    }
    if (!secret || req.headers['x-pdf-secret'] !== secret) {
      res.writeHead(403).end('forbidden');
      return;
    }
    try {
      const { html } = await readJson(req);
      if (typeof html !== 'string' || html.length === 0) {
        res.writeHead(400).end('html required');
        return;
      }
      const pdf = await render(html);
      res.writeHead(200, { 'content-type': 'application/pdf' }).end(pdf);
    } catch {
      res.writeHead(500).end('render failed');
    }
  });
}

// Entry point (ignored by tests, which import createServer directly).
if (process.argv[1] && process.argv[1].endsWith('server.mjs')) {
  const port = Number(process.env.PORT) || 8080;
  createServer().listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`auditiq-pdf listening on :${port}`);
  });
}
```

Create `apps/pdf/README.md`:

```markdown
# @auditiq/pdf

Stateless HTML→PDF microservice (Puppeteer) for AuditIQ compliance reports.

`POST /render` — header `X-PDF-Secret: $PDF_SERVICE_SECRET`, body
`{"html": "<!DOCTYPE html>…"}` → `application/pdf`. 403 without the secret.

- `PDF_SERVICE_SECRET` — shared secret (must match the API's setting).
- `PORT` — default 8080.

`pnpm --filter @auditiq/pdf test` runs the server contract tests (secret
guard + render contract via an injected stub; no Chromium needed). The real
Puppeteer path (`render.mjs`) is exercised in deployment, not in CI.
```

Then install the new workspace package: from repo root run `pnpm install` (registers `@auditiq/pdf`; Puppeteer's postinstall downloads Chromium — that is expected and only needed at runtime, not for `node --test`).

- [ ] **Step 4: Run test to verify it passes**

From `apps/pdf/`: `node --test`
Expected: PASS (2 tests: secret guard, injected-renderer 200/application-pdf).

- [ ] **Step 5: Commit**

```bash
git add pnpm-workspace.yaml apps/pdf/package.json apps/pdf/render.mjs apps/pdf/server.mjs apps/pdf/test/server.test.mjs apps/pdf/README.md
git -c core.autocrlf=false commit -m "feat(pdf): apps/pdf Puppeteer microservice"
```

(If `pnpm-lock.yaml` changed from `pnpm install`, add it too in this commit.)

---

### Task 7: Full gate (Python + microservice)

**Files:** None (verification + minimal fixups)

- [ ] **Step 1: Python API suite**

From `apps/api/`: `uv run python -m pytest -q`
Expected: PASS, 0 failed (prior + all M2-C2 Python tests; no M1/M2/M2-C1 regression).

- [ ] **Step 2: Python lint + types**

From `apps/api/`: `uv run python -m ruff check app tests` → `All checks passed!`
From `apps/api/`: `uv run python -m mypy app` → `Success: no issues found`.
Fix any reported issue minimally (never blanket `Any`); for the union in `html.py` use the same `isinstance(m, M2MetricsOut)` / `m is None` narrowing as `excel.py`.

- [ ] **Step 3: Microservice tests**

From `apps/pdf/`: `node --test`
Expected: PASS (2 tests).

- [ ] **Step 4: Scope sanity**

`git --no-pager diff --stat origin/main..HEAD` — confirm changes only under `apps/api/**`, `apps/pdf/**`, `pnpm-workspace.yaml`, `pnpm-lock.yaml` (no `apps/web`, no docs, no M1/M2 engine source). Report the file list.

- [ ] **Step 5: Commit any gate fixes**

```bash
git add -A
git -c core.autocrlf=false commit -m "chore: gate fixups for M2-C2"
```
(Skip if Steps 1–3 already clean.)

---

## Self-Review

**1. Spec coverage (§7 reporting, §9 errors):**
- §7 PDF via Puppeteer microservice (ADR 0001) → Task 6 (`apps/pdf`, secret-guarded, stateless). Server-rendered HTML trame reusing the same data as Excel (verdict feu+risk, M1 DI/DP/groups OR M2 clusters/χ², AI Act 9/10/11 + FR law, pré-vérifs, limites, "n'est pas un certificat" first page **and** footer) → Task 2 (`build_report_html`, asserted ≥2 occurrences).
- §7 `pdf_client` → microservice with secret; cache-or-build (`reports` table + report bucket) `format="pdf"`; `GET /audits/{id}/report.pdf` org-scoped → Tasks 3, 4, 5. Reuses M2-C1 `Report`/`get_report_storage`/`get_audit`.
- §9 microservice failure/timeout → **502 non-silent** RFC 7807, Excel stays usable (separate endpoint, `render_pdf` raises `APIError(502)`, never swallowed) → Task 3 (two failure tests) + Task 5 (independent route). Unknown/foreign-org → 404 via `get_audit` → Task 5.
- §13 mémoire ReportLab→Puppeteer: the implementation IS Puppeteer (ADR 0001); the spec already carries the reconciliation note; no code action — not a gap.

**2. Placeholder scan:** No TBD/"handle errors". The microservice deliberately splits `render.mjs` (real Puppeteer) from `server.mjs` (DI seam) so the `node:test` is real and Chromium-free — documented, not a placeholder. Tasks 4/5 instruct reusing the real existing fixtures verbatim (concrete instruction; names must be honored).

**3. Type consistency:** `build_report_html(AuditOut) -> str` (Task 2) consumed by `report_service.get_or_build_pdf` (Task 4) via `render_pdf(html: str) -> bytes` (Task 3); router (Task 5) calls `get_or_build_pdf` → `(bytes, str)`. `_PDF="pdf"` mirrors `_XLSX`. `Settings.pdf_service_url:str`/`pdf_service_secret:SecretStr` (Task 1) used by `render_pdf` (Task 3). Microservice header `X-PDF-Secret` is identical in `pdf_client.py` (sends) and `server.mjs` (checks, lowercased by Node as `x-pdf-secret` — the test asserts the lowercased form, correct for Node's header map). `AuditOut`/`M1MetricsOut`/`M2MetricsOut`/`ClusterStatOut`/`GroupStatOut`/`InterpretationOut` consumed in Task 2 match the merged schemas. Reuses proven `APIError`, `get_audit`, `Report`, `get_report_storage_dep`.
