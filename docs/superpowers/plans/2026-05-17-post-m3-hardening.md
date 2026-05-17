# Post-M3 Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clear the four adjudicated non-blocking debt items from the M3 reviews — no new product scope, just hardening and a repo-wide ESLint repair.

**Architecture:** Small, independent fixes to already-merged code. (1) M3 `_per_module` validator also forbids `privileged_value` (symmetry); (2) `run_m3_audit` awaits cancelled deadline tasks (no asyncio warning) + behavioral tests for the deadline & per-call-failure paths; (3) migrate `apps/web/eslint.config.mjs` off the broken `FlatCompat` to `eslint-config-next`'s flat exports and fix the `lint` script (Next 16 removed `next lint`), making web lint a functional gate again. Each task is independently committable.

**Tech Stack:** FastAPI/Pydantic v2/pytest/respx (api), ESLint 9 flat config + eslint-config-next 16 (web), pnpm workspace `@auditiq/web`, uv (api).

---

## Scope

A single bounded hardening increment (sources: the opus M3-B review Minors — `privileged_value` guard, await-cancelled-tasks, deadline/per-call-failure paths tested only indirectly — and the M1/M3-C finding that `apps/web` ESLint is broken repo-wide). **In:** `apps/api/app/schemas/audit.py`, `apps/api/app/services/audit_service.py`, `apps/api/tests/api/test_schemas_m3.py`, `apps/api/tests/api/test_audit_service_m3.py`, `apps/web/eslint.config.mjs`, `apps/web/package.json` (lint script). **Out:** any product/behaviour change beyond the validator symmetry; the deferred modules (async, intersectional, true-label).

Commands — api from `apps/api`: `uv run python -m pytest`, `uv run python -m ruff check`, `uv run python -m mypy app`. web from repo root: `pnpm --filter @auditiq/web exec eslint .`, `pnpm --filter @auditiq/web test`, `pnpm --filter @auditiq/web typecheck`. **Commit RULE (verified):** plain `git add` + `git commit -m "..."` — do NOT pass `-c core.autocrlf=false`. Identity `Franck F <franck-dilane1.fambou@epitech.digital>`; **at execution start, in the worktree run `git config user.name "Franck F"; git config user.email "franck-dilane1.fambou@epitech.digital"`**. NEVER add a Co-Authored-By/Claude trailer.

## File Structure

- Modify `apps/api/app/schemas/audit.py` — add `privileged_value` to the M3 forbidden-field check + message.
- Modify `apps/api/tests/api/test_schemas_m3.py` — assert M3 + `privileged_value` raises.
- Modify `apps/api/app/services/audit_service.py` — `await asyncio.gather(*pending, return_exceptions=True)` after cancelling.
- Modify `apps/api/tests/api/test_audit_service_m3.py` — behavioral tests: all-calls-fail (non-fatal) and deadline=0 (partial → all failed).
- Modify `apps/web/eslint.config.mjs` — flat `eslint-config-next` exports, drop `FlatCompat`.
- Modify `apps/web/package.json` — `"lint": "eslint ."` (Next 16 removed `next lint`).

Read first: the real `_per_module` in `apps/api/app/schemas/audit.py` (M1/M2/M3 branches), the deadline/`asyncio.wait` block in `run_m3_audit` (`apps/api/app/services/audit_service.py`), the `ctx`/respx idiom in `apps/api/tests/api/test_audit_service_m3.py`, and `apps/web/eslint.config.mjs`.

---

### Task 1: M3 validator also forbids `privileged_value`

**Files:**
- Modify: `apps/api/app/schemas/audit.py`
- Test: `apps/api/tests/api/test_schemas_m3.py`

- [ ] **Step 1: Write the failing test**

Append to `apps/api/tests/api/test_schemas_m3.py` (reuse its existing imports/`AuditCreate`/`pytest`/`ValidationError`):

```python
def test_m3_rejects_privileged_value():
    with pytest.raises(ValidationError):
        AuditCreate(
            title="t", module="M3",
            privileged_value="homme",  # not applicable to M3
            target={"url": "https://x/y", "method": "POST", "headers": {},
                    "body_template": "{prompt}", "response_path": "a"},
        )
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run python -m pytest tests/api/test_schemas_m3.py::test_m3_rejects_privileged_value -v`
Expected: FAIL — the M3 branch does not yet reject `privileged_value` (no error raised).

- [ ] **Step 3: Write minimal implementation**

In `apps/api/app/schemas/audit.py`, in the `_per_module` `elif self.module == "M3":` branch, extend the forbidden-field condition and message. Change:

```python
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
to:
```python
            if (
                self.protected_attribute is not None
                or self.decision_column is not None
                or self.favorable_value is not None
                or self.privileged_value is not None
                or self.config is not None
            ):
                raise ValueError(
                    "module M3 : 'protected_attribute'/'decision_column'/"
                    "'favorable_value'/'privileged_value'/'config' ne "
                    "s'appliquent pas."
                )
```
(Match the real file's exact current text — read it first; only add the `privileged_value` clause + the word in the message. Do NOT touch the M1/M2 branches or the `target is None` check.)

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run python -m pytest tests/api/test_schemas_m3.py tests/api/test_schemas_m2.py -v`
Expected: PASS (new test + all existing M2/M3 schema tests; M1/M2 unaffected).

- [ ] **Step 5: Commit**

```bash
git add apps/api/app/schemas/audit.py apps/api/tests/api/test_schemas_m3.py
git commit -m "fix(api): M3 validator also forbids privileged_value"
```

---

### Task 2: `run_m3_audit` awaits cancelled tasks + deadline/failure tests

**Files:**
- Modify: `apps/api/app/services/audit_service.py`
- Test: `apps/api/tests/api/test_audit_service_m3.py`

- [ ] **Step 1: Write the failing tests**

Append to `apps/api/tests/api/test_audit_service_m3.py` (reuse the file's existing `ctx` fixture + `_target()` helper + respx + the `app.integrations.llm_target._resolve_ips` monkeypatch idiom already used by the passing M3 test — read them and mirror exactly):

```python
async def test_run_m3_audit_all_calls_fail_is_non_fatal(ctx, monkeypatch):
    sm, org_id, user_id = ctx
    import app.integrations.llm_target as lt

    monkeypatch.setattr(lt, "_resolve_ips", lambda host: ["93.184.216.34"])
    with respx.mock:
        respx.post("https://api.example.com/v1").mock(
            return_value=httpx.Response(503)
        )
        async with sm() as session:
            out = await audit_service.run_m3_audit(
                session, org_id=org_id, user_id=user_id,
                body=AuditCreate(title="M3 fail", module="M3",
                                 target=_target(), lang="fr"),
                llm_provider=None,
            )
    assert out.status == "done"
    assert isinstance(out.metrics, M3MetricsOut)
    assert out.metrics.n_calls_failed == out.metrics.n_pairs * 2 \
        or out.metrics.n_calls_failed > 0
    assert out.metrics.verdict in ("pass", "warn", "fail")


async def test_run_m3_audit_deadline_zero_partial(ctx, monkeypatch):
    sm, org_id, user_id = ctx
    import app.integrations.llm_target as lt
    from app.core.config import get_settings

    monkeypatch.setattr(lt, "_resolve_ips", lambda host: ["93.184.216.34"])
    monkeypatch.setenv("LLM_AUDIT_DEADLINE_S", "0")
    get_settings.cache_clear()
    try:
        with respx.mock:
            respx.post("https://api.example.com/v1").mock(
                return_value=httpx.Response(
                    200,
                    json={"choices": [{"message": {"content": "ok"}}]},
                )
            )
            async with sm() as session:
                out = await audit_service.run_m3_audit(
                    session, org_id=org_id, user_id=user_id,
                    body=AuditCreate(title="M3 deadline", module="M3",
                                     target=_target(), lang="fr"),
                    llm_provider=None,
                )
        assert out.status == "done"
        assert isinstance(out.metrics, M3MetricsOut)
        assert out.metrics.n_calls_failed >= 1  # deadline cancelled calls
    finally:
        get_settings.cache_clear()
```

(If the real `ctx` yields a different tuple/shape or `_target()`/imports differ, mirror the EXACT idiom of the existing passing test in this file — do not invent a new fixture.)

- [ ] **Step 2: Run tests to verify they fail/are flaky**

Run: `uv run python -m pytest tests/api/test_audit_service_m3.py -v`
Expected: the all-fail test should already pass behaviorally (non-fatal is implemented) but may emit an asyncio "Task was destroyed but it is pending" warning under the deadline path; the deadline-zero test exercises the cancellation branch. Run to observe baseline; the implementation step makes the cancellation deterministic/clean.

- [ ] **Step 3: Write minimal implementation**

In `apps/api/app/services/audit_service.py`, in `run_m3_audit`, locate the deadline block (reads like):

```python
    done, pending = await asyncio.wait(
        tasks, timeout=float(s.llm_audit_deadline_s)
    )
    for t in pending:
        t.cancel()
```
Add a settle-await immediately after the cancel loop (keep everything else identical):

```python
    done, pending = await asyncio.wait(
        tasks, timeout=float(s.llm_audit_deadline_s)
    )
    for t in pending:
        t.cancel()
    if pending:
        await asyncio.gather(*pending, return_exceptions=True)
```
(Match the real variable names/`if tasks:` guard structure — read the actual block. Behaviour is unchanged: unfinished slots already default to `failed=True` via `results.get(i, ("", True))`; this only lets cancellation settle so no "Task was destroyed but it is pending" warning is emitted. `asyncio` is already imported in this module.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `uv run python -m pytest tests/api/test_audit_service_m3.py tests/api/test_audit_service_m2.py -v`
Expected: PASS — both new tests green, existing M3/M2 service tests unaffected, no asyncio Task-destroyed warning in output.

- [ ] **Step 5: Commit**

```bash
git add apps/api/app/services/audit_service.py apps/api/tests/api/test_audit_service_m3.py
git commit -m "fix(api): await cancelled M3 deadline tasks + deadline/failure tests"
```

---

### Task 3: Repair web ESLint (flat eslint-config-next, drop FlatCompat)

**Files:**
- Modify: `apps/web/eslint.config.mjs`
- Modify: `apps/web/package.json`

- [ ] **Step 1: Confirm the failure (baseline)**

Run: `pnpm --filter @auditiq/web exec eslint . 2>&1 | tail -5`
Expected: it crashes inside `@eslint/eslintrc` config-validator (`FlatCompat.extends('next/core-web-vitals','next/typescript')` produces a circular/invalid legacy config). This is the documented breakage.

- [ ] **Step 2: Write the new flat config**

`eslint-config-next@16.2.6` exports flat configs (verified): subpaths `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`. Replace the entire content of `apps/web/eslint.config.mjs` with:

```js
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

const asArray = (c) => (Array.isArray(c) ? c : [c]);

const config = [
  ...asArray(nextCoreWebVitals),
  ...asArray(nextTypescript),
  {
    rules: {
      '@typescript-eslint/consistent-type-imports': [
        'warn',
        { prefer: 'type-imports' },
      ],
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'react/no-unescaped-entities': 'off',
    },
  },
  { ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts'] },
];

export default config;
```
(The `asArray` helper makes this robust whether each export is a flat-config array or a single object. Keep the three project rule overrides byte-identical to the old file. No `FlatCompat`, no `@eslint/eslintrc` import.)

- [ ] **Step 3: Fix the `lint` script**

In `apps/web/package.json`, change the `lint` script from `"next lint"` (the `lint` subcommand was removed in Next 16 → "Invalid project directory … \lint") to:

```json
    "lint": "eslint .",
```
(Only the `lint` script value changes; leave every other script untouched.)

- [ ] **Step 4: Run lint and resolve genuine errors minimally**

Run: `pnpm --filter @auditiq/web lint 2>&1 | tail -40`
Expected: ESLint now loads (no FlatCompat crash). Goal = exit 0 with **zero errors** (warnings are acceptable — the project's two custom rules are intentionally `warn`).
- If ESLint reports **errors** in existing M1/M2/M3 web code: fix each minimally and correctly (e.g. genuine `react/...` / `@next/...` violations). Do NOT mass-disable rules to force green. If a specific rule is inappropriate for this codebase and fixing every occurrence is out of proportion for a hardening task, you may set that one rule to `'warn'` (not `'off'`) in the overrides block with a one-line comment justifying it — prefer fixing.
- Re-run until `pnpm --filter @auditiq/web lint` exits 0 (errors = 0).

- [ ] **Step 5: Ensure no regression + commit**

Run: `pnpm --filter @auditiq/web typecheck` (clean) and `pnpm --filter @auditiq/web test` (full suite still green — report counts).
Then:
```bash
git add apps/web/eslint.config.mjs apps/web/package.json
# plus any source files you minimally fixed for real lint errors:
git add -A apps/web
git commit -m "fix(web): flat eslint-config-next config + working lint script"
```
(If you had to touch source files for genuine lint errors, list them in the commit; keep those changes minimal and behaviour-preserving — vitest + typecheck must stay green.)

---

### Task 4: Full gate

**Files:** None (verification + minimal fixups)

- [ ] **Step 1: API suite**

Run (from `apps/api`): `uv run python -m pytest -q`
Expected: PASS, 0 failed (all prior + the new schema/service tests; no M1/M2/M3 regression).

- [ ] **Step 2: API lint + types**

Run: `uv run python -m ruff check app tests` (clean) and `uv run python -m mypy app` (`Success`). Fix minimally.

- [ ] **Step 3: Web gate**

Run: `pnpm --filter @auditiq/web test` (full, 0 fail), `pnpm --filter @auditiq/web typecheck` (clean), `pnpm --filter @auditiq/web lint` (exit 0, 0 errors).

- [ ] **Step 4: Scope + identity sanity**

Run: `git --no-pager diff --name-only origin/main..HEAD` — only the 6 in-scope files (+ this plan doc + any minimal web source fix from Task 3). Run `git --no-pager log --format='%ae' origin/main..HEAD | sort -u` — must be ONLY `franck-dilane1.fambou@epitech.digital`; if any other, report the offending commits (controller normalizes via filter-branch before PR). Spot-check no commit is a 142/142 whole-file CRLF churn.

- [ ] **Step 5: Commit any gate fixes**

```bash
git add -A
git commit -m "chore: gate fixups for post-M3 hardening"
```
(Skip if Steps 1–3 already clean.)

---

## Self-Review

**1. Scope coverage:** the four adjudicated debt items each map to a task — `privileged_value` symmetry (T1), await-cancelled-tasks + the two previously-only-indirect behavioral paths deadline/per-call-failure (T2), repo-wide ESLint repair + `lint` script (T3), full gate (T4). No new product scope; deferred modules explicitly excluded.

**2. Placeholder scan:** No TBD/"handle errors". T2's test snippets are complete; the `if tasks:`/variable-name reconciliation is a concrete "match the real block" instruction. T3 step 4 is a bounded, decision-ruled remediation (fix errors; `warn` only as a justified last resort, never `off`), not a placeholder. The ESLint flat shape is pinned to the verified `eslint-config-next@16.2.6` exports with an `asArray` guard for array-vs-object robustness.

**3. Consistency:** T1 edits only the M3 `_per_module` branch (M1/M2 untouched); the new message lists exactly the fields the condition checks (incl. `privileged_value`). T2's `await asyncio.gather(*pending, …)` is purely additive after the existing cancel loop — unfinished slots still resolve via the existing `results.get(i, ("", True))`, so `n_calls_failed`/verdict semantics are unchanged; the deadline-zero test asserts the cancellation→failed path deterministically. T3 preserves the three project rule overrides verbatim and only swaps the config mechanism + the broken `next lint` script; vitest + typecheck remain the behavioural gates and must stay green. All commits via plain `git` (LF-normalized, no CRLF churn).
