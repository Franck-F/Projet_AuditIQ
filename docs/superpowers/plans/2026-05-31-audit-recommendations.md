# Audit Recommendations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter un champ `recommendations: list[RecommendationOut]` à `InterpretationOut`, alimenté par les prompts LLM (Gemini/Mistral) avec 3-5 recos actionnables par audit `{title, detail, priority}`, restitué dans le rendu web + Excel + PDF.

**Architecture:** Extension additive de `InterpretationOut` (existant). Nouveau schema `RecommendationOut` Pydantic strict (Literal priority). Parser défensif partagé `_parse_recommendations()` qui filtre les entrées LLM malformées sans casser l'audit. Les 3 prompts M1/M2/M3 reçoivent une consigne « 3-5 recos prioritisées » + un add-on module-specific. Excel feuille « Recommandations » conditionnelle, HTML section conditionnelle (escape XSS). Composant React `<Recommendations>` qui retourne null sur liste vide.

**Tech Stack:** Python 3.12, FastAPI, Pydantic 2 (Literal/ConfigDict extra="forbid"), pytest. React 19, TypeScript strict, Tailwind v4, vitest + @testing-library/react.

**Spec source:** `docs/superpowers/specs/2026-05-31-audit-recommendations-design.md`.

**Pré-requis exécution :** main propre. Aucune dépendance bloquante avec les PRs wizard (zéro fichier en commun avec SP3-B PR #31). Worktree branchera depuis origin/main courant.

---

## File Structure

```
apps/api/
├── app/schemas/audit.py                       [MOD]   +RecommendationOut, +InterpretationOut.recommendations
├── app/interpretation/
│   ├── _recommendations.py                    [NEW]   parse_recommendations() helper partagé
│   ├── m1.py                                  [MOD]   appel parser + injection dans InterpretationOut
│   ├── m2.py                                  [MOD]   idem
│   ├── m3.py                                  [MOD]   idem
│   └── prompts/
│       ├── m1_fr.md                           [MOD]   +consigne recos + JSON étendu + add-on M1
│       ├── m2_fr.md                           [MOD]   idem M2
│       └── m3_fr.md                           [MOD]   idem M3
└── app/reporting/
    ├── excel.py                               [MOD]   _write_recommendations_sheet()
    └── html.py                                [MOD]   _render_recommendations() + CSS

apps/web/
├── lib/api/audits.ts                          [MOD]   +RecommendationOut type, +recommendations field
├── components/audits/
│   └── Recommendations.tsx                    [NEW]
└── app/app/audits/[id]/page.tsx               [MOD]   <Recommendations> entre narrative et grid disclaimers

tests/
├── apps/api/tests/api/
│   ├── test_schemas_audit.py                  [MOD]   +4 tests RecommendationOut/InterpretationOut
│   ├── test_recommendations_parse.py          [NEW]   3 tests parser défensif
│   ├── test_interpret_m1.py                   [MOD]   +3 tests recos M1
│   ├── test_interpret_m2.py                   [MOD]   +3 tests recos M2
│   ├── test_interpret_m3.py                   [MOD]   +3 tests recos M3
│   ├── test_excel_report.py                   [MOD]   +2 tests feuille Recommandations
│   └── test_report_html.py                    [MOD]   +2 tests section + XSS escape
└── apps/web/__tests__/
    ├── recommendations.test.tsx               [NEW]   3 tests component
    └── audit-result-page.test.tsx             [MOD]   +1 test integration
```

---

## Conventions répétées

- **Worktree** : `worktree-audit-recommendations`, créé via `git worktree add .claude/worktrees/audit-recommendations -b worktree-audit-recommendations origin/main`.
- **Identité git** : `Franck F <franck-dilane1.fambou@epitech.digital>`, **aucun trailer Claude**.
- **Commit** : Conventional Commits (`feat(api):`, `feat(web):`, `test(api):`). Plain `git commit`.
- **Subagent gate** (Step 0 obligatoire) : `git rev-parse --show-toplevel` doit se terminer par `audit-recommendations`. Repeat IMMEDIATELY before each `git commit`.
- **Scope restriction** : chaque tâche modifie strictement ses fichiers listés. `git status --short` doit montrer EXACTEMENT ces fichiers avant commit. ABORT BLOCKED si scope creep.
- **Controller verification** : après chaque DONE, le controller vérifie HEAD du worktree + sweep main checkout.
- **Test runners** : depuis `apps/api/` → `uv run pytest -q`, `uv run ruff check`, `uv run mypy --strict app`. Depuis `apps/web/` → `pnpm test`, `pnpm typecheck`, `pnpm lint`.

---

## Task 1: Schemas `RecommendationOut` + `InterpretationOut.recommendations`

**Files:**
- Modify: `apps/api/app/schemas/audit.py`
- Modify: `apps/api/tests/api/test_schemas_audit.py`

- [ ] **Step 1: Write the failing test**

Append to `apps/api/tests/api/test_schemas_audit.py`:

```python
def test_recommendation_out_priority_literal() -> None:
    from app.schemas.audit import RecommendationOut

    RecommendationOut(title="Action", detail="Détail.", priority="high")
    RecommendationOut(title="Action", detail="Détail.", priority="medium")
    RecommendationOut(title="Action", detail="Détail.", priority="low")
    with pytest.raises(ValidationError):
        RecommendationOut(title="Action", detail="Détail.", priority="weird")  # type: ignore[arg-type]


def test_recommendation_out_extra_forbid() -> None:
    from app.schemas.audit import RecommendationOut

    with pytest.raises(ValidationError):
        RecommendationOut.model_validate({
            "title": "Action",
            "detail": "Détail.",
            "priority": "high",
            "extra_field": "boom",
        })


def test_recommendation_out_title_detail_length_bounds() -> None:
    from app.schemas.audit import RecommendationOut

    with pytest.raises(ValidationError):
        RecommendationOut(title="", detail="Détail.", priority="high")
    with pytest.raises(ValidationError):
        RecommendationOut(title="Action", detail="", priority="high")
    with pytest.raises(ValidationError):
        RecommendationOut(title="A" * 201, detail="Détail.", priority="high")
    with pytest.raises(ValidationError):
        RecommendationOut(title="Action", detail="D" * 1001, priority="high")


def test_interpretation_out_default_recommendations_empty() -> None:
    from app.schemas.audit import InterpretationOut

    interp = InterpretationOut(
        narrative="x",
        ai_act_anchors=["a"],
        disclaimers=["d"],
        provider="fallback",
        model="deterministic",
    )
    assert interp.recommendations == []
```

`pytest` and `ValidationError` are already imported in this test file from the existing tests. Verify the imports at the top of the file include both.

- [ ] **Step 2: Run test, verify FAIL**

```
cd apps/api && uv run pytest tests/api/test_schemas_audit.py -v -k "recommendation_out or default_recommendations"
```

Expected: 4 tests FAIL — `RecommendationOut` not importable.

- [ ] **Step 3: Add `RecommendationOut` to schemas**

In `apps/api/app/schemas/audit.py`, find the `InterpretationOut` class definition. Add a new class `RecommendationOut` ABOVE it, then extend `InterpretationOut` with the new field.

```python
# Add near the top imports (if not already present)
from typing import Literal
from pydantic import Field

# Add ABOVE InterpretationOut (use existing BaseModel + ConfigDict imports)
class RecommendationOut(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str = Field(min_length=1, max_length=200)
    detail: str = Field(min_length=1, max_length=1000)
    priority: Literal["high", "medium", "low"]


class InterpretationOut(BaseModel):
    model_config = ConfigDict(extra="forbid")

    narrative: str
    ai_act_anchors: list[str]
    disclaimers: list[str]
    provider: str
    model: str
    recommendations: list[RecommendationOut] = Field(default_factory=list)
```

If `Field` and `Literal` are already imported at the top of `schemas/audit.py`, do not duplicate the imports.

- [ ] **Step 4: Run tests, verify PASS**

```
cd apps/api && uv run pytest tests/api/test_schemas_audit.py -v -k "recommendation_out or default_recommendations"
```

Expected: 4 tests pass.

- [ ] **Step 5: Run gates**

```
cd apps/api
uv run pytest -q
uv run ruff check
uv run mypy --strict app/schemas/audit.py
```

Expected: pytest full suite +4, ruff clean, mypy success.

- [ ] **Step 6: Worktree gate + commit**

```
cd C:/Users/Franck/Documents/projet/auditiq/.claude/worktrees/audit-recommendations
git rev-parse --show-toplevel  # MUST end with audit-recommendations
git add apps/api/app/schemas/audit.py apps/api/tests/api/test_schemas_audit.py
git commit -m "feat(api): RecommendationOut schema + InterpretationOut.recommendations field"
git log --oneline -2
```

---

## Task 2: Parser défensif `_parse_recommendations()`

**Files:**
- Create: `apps/api/app/interpretation/_recommendations.py`
- Create: `apps/api/tests/api/test_recommendations_parse.py`

- [ ] **Step 1: Write the failing test**

Create `apps/api/tests/api/test_recommendations_parse.py`:

```python
from app.interpretation._recommendations import parse_recommendations
from app.schemas.audit import RecommendationOut


def test_parse_recommendations_keeps_valid_entries() -> None:
    raw = [
        {"title": "Action 1", "detail": "Détail 1.", "priority": "high"},
        {"title": "Action 2", "detail": "Détail 2.", "priority": "medium"},
    ]
    result = parse_recommendations(raw)
    assert len(result) == 2
    assert all(isinstance(r, RecommendationOut) for r in result)
    assert result[0].title == "Action 1"
    assert result[1].priority == "medium"


def test_parse_recommendations_drops_malformed_entries_keeps_valid() -> None:
    raw = [
        {"title": "Valid", "detail": "OK.", "priority": "high"},
        {"title": "Missing priority", "detail": "OK."},  # invalid: no priority
        {"title": "Bad priority", "detail": "OK.", "priority": "URGENT"},  # invalid Literal
        "not even a dict",  # invalid: not a dict
        {"title": "Valid 2", "detail": "OK.", "priority": "low"},
    ]
    result = parse_recommendations(raw)
    assert len(result) == 2
    assert result[0].title == "Valid"
    assert result[1].title == "Valid 2"


def test_parse_recommendations_returns_empty_on_non_list() -> None:
    assert parse_recommendations(None) == []
    assert parse_recommendations("a string") == []
    assert parse_recommendations({"not": "a list"}) == []
    assert parse_recommendations(42) == []
```

- [ ] **Step 2: Run test, verify FAIL**

```
cd apps/api && uv run pytest tests/api/test_recommendations_parse.py -v
```

Expected: FAIL — module `app.interpretation._recommendations` introuvable.

- [ ] **Step 3: Create the parser module**

Create `apps/api/app/interpretation/_recommendations.py`:

```python
"""Defensive parser for the LLM-generated recommendations field.

The LLM may produce malformed entries (missing fields, wrong priority literal,
non-dict elements). We filter them silently — the audit must remain valid even
if the LLM is erratic.
"""
from __future__ import annotations

from pydantic import ValidationError

from app.schemas.audit import RecommendationOut


def parse_recommendations(raw: object) -> list[RecommendationOut]:
    """Filter LLM output to a list of valid RecommendationOut.

    Always returns a list (possibly empty). Never raises.
    """
    if not isinstance(raw, list):
        return []
    out: list[RecommendationOut] = []
    for entry in raw:
        if not isinstance(entry, dict):
            continue
        try:
            out.append(RecommendationOut.model_validate(entry))
        except ValidationError:
            continue
    return out
```

- [ ] **Step 4: Run test, verify PASS**

```
cd apps/api && uv run pytest tests/api/test_recommendations_parse.py -v
```

Expected: 3 tests pass.

- [ ] **Step 5: Gates**

```
cd apps/api
uv run ruff check app/interpretation/_recommendations.py tests/api/test_recommendations_parse.py
uv run mypy --strict app/interpretation/_recommendations.py
```

Expected: clean.

- [ ] **Step 6: Commit**

```
cd C:/Users/Franck/Documents/projet/auditiq/.claude/worktrees/audit-recommendations
git rev-parse --show-toplevel
git add apps/api/app/interpretation/_recommendations.py apps/api/tests/api/test_recommendations_parse.py
git commit -m "feat(api): defensive parser for LLM recommendations (drops invalid entries)"
```

---

## Task 3: Prompt M1 + interpret_m1.py

**Files:**
- Modify: `apps/api/app/interpretation/prompts/m1_fr.md`
- Modify: `apps/api/app/interpretation/m1.py`
- Modify: `apps/api/tests/api/test_interpret_m1.py`

- [ ] **Step 1: Write the failing tests**

Append to `apps/api/tests/api/test_interpret_m1.py` (preserve existing tests):

```python
@pytest.mark.asyncio
async def test_interpret_m1_recommendations_parsed_from_valid_json(
    m1_result_pass: M1Result,
) -> None:
    """LLM returns 3 valid recos → all 3 surface in InterpretationOut."""
    llm_json = json.dumps(
        {
            "narrative": "n",
            "ai_act_anchors": ["a"],
            "disclaimers": ["d"],
            "recommendations": [
                {"title": "R1", "detail": "D1.", "priority": "high"},
                {"title": "R2", "detail": "D2.", "priority": "medium"},
                {"title": "R3", "detail": "D3.", "priority": "low"},
            ],
        },
        ensure_ascii=False,
    )
    provider = _StubLLM(llm_json)
    out = await interpret_m1(m1_result_pass, provider=provider)
    assert len(out.recommendations) == 3
    assert out.recommendations[0].title == "R1"
    assert out.recommendations[0].priority == "high"


@pytest.mark.asyncio
async def test_interpret_m1_recommendations_dropped_when_malformed(
    m1_result_pass: M1Result,
) -> None:
    """LLM returns 1 valid + 1 invalid → only the valid one surfaces."""
    llm_json = json.dumps(
        {
            "narrative": "n",
            "ai_act_anchors": ["a"],
            "disclaimers": ["d"],
            "recommendations": [
                {"title": "Valid", "detail": "OK.", "priority": "high"},
                {"title": "No priority", "detail": "OK."},
            ],
        },
        ensure_ascii=False,
    )
    provider = _StubLLM(llm_json)
    out = await interpret_m1(m1_result_pass, provider=provider)
    assert len(out.recommendations) == 1
    assert out.recommendations[0].title == "Valid"


@pytest.mark.asyncio
async def test_interpret_m1_recommendations_empty_when_field_absent(
    m1_result_pass: M1Result,
) -> None:
    """LLM omits recommendations field → empty list (audit still valid)."""
    llm_json = json.dumps(
        {"narrative": "n", "ai_act_anchors": ["a"], "disclaimers": ["d"]},
        ensure_ascii=False,
    )
    provider = _StubLLM(llm_json)
    out = await interpret_m1(m1_result_pass, provider=provider)
    assert out.recommendations == []
```

If `_StubLLM` and `m1_result_pass` fixture don't exist in this file, READ the file first to find the existing test pattern and use the actual fixture/stub names. The 3 tests above must use whatever the file already uses for LLM stubbing + M1Result fixtures.

If `json` is not imported at the top of the test file, add `import json`.

- [ ] **Step 2: Run tests, verify FAIL**

```
cd apps/api && uv run pytest tests/api/test_interpret_m1.py -v -k recommendations
```

Expected: 3 tests FAIL (current `interpret_m1` doesn't populate `recommendations`).

- [ ] **Step 3: Update the M1 prompt template**

Edit `apps/api/app/interpretation/prompts/m1_fr.md`. Find the closing JSON line:

```
Réponds UNIQUEMENT par un objet JSON valide, sans texte autour :
{{"narrative": "<texte FR>", "ai_act_anchors": ["..."], "disclaimers": ["..."]}}
```

Replace with this expanded block (inserted BEFORE the closing JSON line) :

```
- Termine en proposant 3 à 5 recommandations actionnables (PAS plus, PAS moins),
  prioritisées par impact réel :
  - chaque reco = un objet {{"title": "...", "detail": "...", "priority": "..."}}
  - title = action courte (5-10 mots), à l'impératif (ex. « Re-collecter
    les données d'entraînement »)
  - detail = explication concrète en 1-2 phrases : pourquoi maintenant,
    quoi faire d'abord, sans jargon
  - priority ∈ {{"high", "medium", "low"}} :
    - "high" : action nécessaire pour répondre à un échec/risque AI Act
    - "medium" : amélioration recommandée mais pas bloquante
    - "low" : maintenance/veille
  - Si le verdict est PASS (pas d'écart significatif), garde 1-2 recos
    « maintien de la veille » (priority="low") — ne pas inventer de
    problème.
  - Si FAIL/WARN, privilégier les actions concrètes : qualité de données,
    monitoring, documentation, choix de métrique.
- Pour M1, prioriser les recos sur la collecte de données (groupe sous-représenté),
  le choix de la métrique de fairness (DI vs EO vs EOdds — chaque choix est un
  choix normatif), et le monitoring post-déploiement.
- N'invente JAMAIS un défaut qui n'est pas dans les métriques fournies.
```

Then REPLACE the closing JSON line with:

```
Réponds UNIQUEMENT par un objet JSON valide, sans texte autour :
{{"narrative": "<texte FR>", "ai_act_anchors": ["..."], "disclaimers": ["..."], "recommendations": [{{"title": "...", "detail": "...", "priority": "high"}}]}}
```

The `{{ }}` doubled braces are required because Python's `str.format()` is used on this template (the existing template already uses `{metrics_json}` as a placeholder — single braces in template = `.format()` placeholders, doubled braces escape to literal `{`/`}`).

- [ ] **Step 4: Update `interpret_m1.py` to parse + inject recommendations**

In `apps/api/app/interpretation/m1.py`, find the `interpret_m1` function. The current shape:

```python
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

Add an import at top:

```python
from app.interpretation._recommendations import parse_recommendations
```

Modify the `InterpretationOut(...)` construction to pass the parsed recos:

```python
        return InterpretationOut(
            narrative=str(data["narrative"]),
            ai_act_anchors=[str(a) for a in data.get("ai_act_anchors", [])]
            or list(_AI_ACT_ANCHORS),
            disclaimers=[str(d) for d in data.get("disclaimers", [])]
            or list(_DISCLAIMERS),
            provider=provider.name,
            model=provider.model,
            recommendations=parse_recommendations(data.get("recommendations")),
        )
```

The `_fallback(result)` function doesn't need a change — `InterpretationOut.recommendations` defaults to `[]` via `Field(default_factory=list)`.

- [ ] **Step 5: Run tests, verify PASS**

```
cd apps/api && uv run pytest tests/api/test_interpret_m1.py -v
```

Expected: all M1 interp tests pass (3 new + existing).

- [ ] **Step 6: Gates**

```
cd apps/api && uv run ruff check && uv run mypy --strict app/interpretation/m1.py
```

Expected: clean.

- [ ] **Step 7: Commit**

```
cd C:/Users/Franck/Documents/projet/auditiq/.claude/worktrees/audit-recommendations
git rev-parse --show-toplevel
git add apps/api/app/interpretation/prompts/m1_fr.md apps/api/app/interpretation/m1.py apps/api/tests/api/test_interpret_m1.py
git commit -m "feat(api): M1 interpretation produces recommendations (prompt + parser)"
```

---

## Task 4: Prompt M2 + interpret_m2.py

**Files:**
- Modify: `apps/api/app/interpretation/prompts/m2_fr.md`
- Modify: `apps/api/app/interpretation/m2.py`
- Modify: `apps/api/tests/api/test_interpret_m2.py`

- [ ] **Step 1: Write the failing tests**

Append to `apps/api/tests/api/test_interpret_m2.py` (preserve existing). Same shape as Task 3 — 3 tests. Read the file first to identify the M2 fixture name and LLM stub pattern, then write:

```python
@pytest.mark.asyncio
async def test_interpret_m2_recommendations_parsed_from_valid_json(
    m2_result_pass: M2Result,  # adapt fixture name to what's in the file
) -> None:
    llm_json = json.dumps(
        {
            "narrative": "n", "ai_act_anchors": ["a"], "disclaimers": ["d"],
            "recommendations": [
                {"title": "R1", "detail": "D1.", "priority": "high"},
                {"title": "R2", "detail": "D2.", "priority": "medium"},
            ],
        },
        ensure_ascii=False,
    )
    provider = _StubLLM(llm_json)  # adapt to actual stub name
    out = await interpret_m2(m2_result_pass, provider=provider)
    assert len(out.recommendations) == 2


@pytest.mark.asyncio
async def test_interpret_m2_recommendations_dropped_when_malformed(
    m2_result_pass: M2Result,
) -> None:
    llm_json = json.dumps(
        {
            "narrative": "n", "ai_act_anchors": ["a"], "disclaimers": ["d"],
            "recommendations": [
                {"title": "Valid", "detail": "OK.", "priority": "high"},
                "not a dict",
            ],
        },
        ensure_ascii=False,
    )
    provider = _StubLLM(llm_json)
    out = await interpret_m2(m2_result_pass, provider=provider)
    assert len(out.recommendations) == 1
    assert out.recommendations[0].title == "Valid"


@pytest.mark.asyncio
async def test_interpret_m2_recommendations_empty_when_field_absent(
    m2_result_pass: M2Result,
) -> None:
    llm_json = json.dumps(
        {"narrative": "n", "ai_act_anchors": ["a"], "disclaimers": ["d"]},
        ensure_ascii=False,
    )
    provider = _StubLLM(llm_json)
    out = await interpret_m2(m2_result_pass, provider=provider)
    assert out.recommendations == []
```

- [ ] **Step 2: Run tests, verify FAIL**

```
cd apps/api && uv run pytest tests/api/test_interpret_m2.py -v -k recommendations
```

- [ ] **Step 3: Update the M2 prompt template**

Edit `apps/api/app/interpretation/prompts/m2_fr.md`. Apply the same pattern as Task 3 Step 3, but with this **M2-specific add-on** instead of the M1 one:

```
- Pour M2, prioriser les recos sur la caractérisation des features qui distinguent
  les clusters déviants, le contrôle des proxys de variables sensibles, et la
  mise en place d'alertes sur la déviation par cluster en production.
```

Update the closing JSON line with the recommendations field (identical to M1).

The common block (3-5 recos with title/detail/priority) is IDENTICAL to M1 — copy it verbatim from the M1 prompt update.

- [ ] **Step 4: Update `interpret_m2.py`**

In `apps/api/app/interpretation/m2.py`, apply the same diff as `m1.py` :
- Add `from app.interpretation._recommendations import parse_recommendations`
- Add `recommendations=parse_recommendations(data.get("recommendations"))` to the `InterpretationOut(...)` construction.

- [ ] **Step 5: PASS**

```
cd apps/api && uv run pytest tests/api/test_interpret_m2.py -v
```

- [ ] **Step 6: Gates + commit**

```
cd apps/api && uv run ruff check && uv run mypy --strict app/interpretation/m2.py
cd C:/Users/Franck/Documents/projet/auditiq/.claude/worktrees/audit-recommendations
git rev-parse --show-toplevel
git add apps/api/app/interpretation/prompts/m2_fr.md apps/api/app/interpretation/m2.py apps/api/tests/api/test_interpret_m2.py
git commit -m "feat(api): M2 interpretation produces recommendations (prompt + parser)"
```

---

## Task 5: Prompt M3 + interpret_m3.py

**Files:**
- Modify: `apps/api/app/interpretation/prompts/m3_fr.md`
- Modify: `apps/api/app/interpretation/m3.py`
- Modify: `apps/api/tests/api/test_interpret_m3.py`

- [ ] **Step 1: Write the failing tests**

Same shape as Task 4. Append to `apps/api/tests/api/test_interpret_m3.py` 3 tests adapted to the M3 fixture (likely `m3_result_pass: M3Result`). Read the file first.

```python
@pytest.mark.asyncio
async def test_interpret_m3_recommendations_parsed_from_valid_json(
    m3_result_pass,  # adapt fixture
) -> None:
    llm_json = json.dumps(
        {
            "narrative": "n", "ai_act_anchors": ["a"], "disclaimers": ["d"],
            "recommendations": [
                {"title": "R1", "detail": "D1.", "priority": "high"},
                {"title": "R2", "detail": "D2.", "priority": "low"},
            ],
        },
        ensure_ascii=False,
    )
    provider = _StubLLM(llm_json)
    out = await interpret_m3(m3_result_pass, provider=provider)
    assert len(out.recommendations) == 2


@pytest.mark.asyncio
async def test_interpret_m3_recommendations_dropped_when_malformed(
    m3_result_pass,
) -> None:
    llm_json = json.dumps(
        {
            "narrative": "n", "ai_act_anchors": ["a"], "disclaimers": ["d"],
            "recommendations": [
                {"title": "Valid", "detail": "OK.", "priority": "high"},
                {"title": "Bad", "detail": "OK.", "priority": "urgent"},  # bad Literal
            ],
        },
        ensure_ascii=False,
    )
    provider = _StubLLM(llm_json)
    out = await interpret_m3(m3_result_pass, provider=provider)
    assert len(out.recommendations) == 1


@pytest.mark.asyncio
async def test_interpret_m3_recommendations_empty_when_field_absent(
    m3_result_pass,
) -> None:
    llm_json = json.dumps(
        {"narrative": "n", "ai_act_anchors": ["a"], "disclaimers": ["d"]},
        ensure_ascii=False,
    )
    provider = _StubLLM(llm_json)
    out = await interpret_m3(m3_result_pass, provider=provider)
    assert out.recommendations == []
```

- [ ] **Step 2: Verify FAIL**

```
cd apps/api && uv run pytest tests/api/test_interpret_m3.py -v -k recommendations
```

- [ ] **Step 3: Update the M3 prompt template**

Edit `apps/api/app/interpretation/prompts/m3_fr.md`. Same pattern as Tasks 3/4 — common 3-5 recos block + closing JSON line — with this **M3-specific add-on**:

```
- Pour M3, prioriser les recos sur l'élargissement du prompt bank vers d'autres
  catégories d'attributs protégés, la mise en place d'un monitoring continu (les
  comportements LLM dérivent dans le temps), et la documentation des refus
  structurés (AI Act art. 13).
```

- [ ] **Step 4: Update `interpret_m3.py`** — identical diff as `m1.py`/`m2.py`.

- [ ] **Step 5: PASS**

```
cd apps/api && uv run pytest tests/api/test_interpret_m3.py -v
```

- [ ] **Step 6: Gates + commit**

```
cd apps/api && uv run ruff check && uv run mypy --strict app/interpretation/m3.py
cd C:/Users/Franck/Documents/projet/auditiq/.claude/worktrees/audit-recommendations
git rev-parse --show-toplevel
git add apps/api/app/interpretation/prompts/m3_fr.md apps/api/app/interpretation/m3.py apps/api/tests/api/test_interpret_m3.py
git commit -m "feat(api): M3 interpretation produces recommendations (prompt + parser)"
```

---

## Task 6: Excel — feuille « Recommandations »

**Files:**
- Modify: `apps/api/app/reporting/excel.py`
- Modify: `apps/api/tests/api/test_excel_report.py`

- [ ] **Step 1: Write the failing tests**

Read `apps/api/tests/api/test_excel_report.py` first to understand how the test workbook is built (likely a helper function `build_excel_report(audit)` or similar). Append 2 tests using the existing pattern:

```python
def test_excel_includes_recommendations_sheet_when_present() -> None:
    """Excel workbook gains a 'Recommandations' sheet when interpretation has recos."""
    audit = _sample_audit_with_recommendations([  # build helper — adapt to file
        RecommendationOut(title="Re-collecter données", detail="Détail 1.", priority="high"),
        RecommendationOut(title="Audit features", detail="Détail 2.", priority="medium"),
    ])
    data = build_excel_report(audit)  # adapt to actual function name
    wb = load_workbook(io.BytesIO(data))
    assert "Recommandations" in wb.sheetnames
    ws = wb["Recommandations"]
    rows = list(ws.iter_rows(values_only=True))
    assert rows[0] == ("#", "Priorité", "Action", "Détail")
    assert rows[1] == (1, "Action prioritaire", "Re-collecter données", "Détail 1.")
    assert rows[2] == (2, "À planifier", "Audit features", "Détail 2.")


def test_excel_omits_recommendations_sheet_when_empty() -> None:
    """No recos → no sheet."""
    audit = _sample_audit_with_recommendations([])
    data = build_excel_report(audit)
    wb = load_workbook(io.BytesIO(data))
    assert "Recommandations" not in wb.sheetnames
```

If the existing test file doesn't have a `_sample_audit_with_recommendations` helper, either add one or adapt the existing audit fixture to inject recommendations into its `interpretation` field.

- [ ] **Step 2: Verify FAIL**

```
cd apps/api && uv run pytest tests/api/test_excel_report.py -v -k recommendations
```

- [ ] **Step 3: Update `excel.py`**

In `apps/api/app/reporting/excel.py`, add the helper + integrate it. Locate where `build_excel_report` (or equivalent main function) builds the workbook and creates sheets. Add a call to `_write_recommendations_sheet(wb, audit.interpretation.recommendations if audit.interpretation else [])` AFTER the existing interpretation sheet creation.

Add the helper and label dict (at module top with other constants):

```python
_PRIORITY_LABEL_FR = {
    "high": "Action prioritaire",
    "medium": "À planifier",
    "low": "Maintien / veille",
}


def _write_recommendations_sheet(
    wb: Workbook, recs: list[RecommendationOut]
) -> None:
    if not recs:
        return
    ws = wb.create_sheet("Recommandations")
    ws.append(["#", "Priorité", "Action", "Détail"])
    # bold header (use the file's existing bold-header helper if any; otherwise this minimal block):
    for cell in ws[1]:
        cell.font = Font(bold=True)
    for idx, rec in enumerate(recs, start=1):
        ws.append([idx, _PRIORITY_LABEL_FR[rec.priority], rec.title, rec.detail])
```

Import `Font` from `openpyxl.styles` if not already imported, and `RecommendationOut` from `app.schemas.audit`. Wire the call into the main builder.

- [ ] **Step 4: PASS**

```
cd apps/api && uv run pytest tests/api/test_excel_report.py -v
```

- [ ] **Step 5: Gates + commit**

```
cd apps/api && uv run ruff check && uv run mypy --strict app/reporting/excel.py
cd C:/Users/Franck/Documents/projet/auditiq/.claude/worktrees/audit-recommendations
git rev-parse --show-toplevel
git add apps/api/app/reporting/excel.py apps/api/tests/api/test_excel_report.py
git commit -m "feat(api): Excel report — Recommandations sheet (skipped if empty)"
```

---

## Task 7: HTML/PDF — section recommandations

**Files:**
- Modify: `apps/api/app/reporting/html.py`
- Modify: `apps/api/tests/api/test_report_html.py`

- [ ] **Step 1: Write the failing tests**

Append to `apps/api/tests/api/test_report_html.py`:

```python
def test_html_includes_recommendations_section_when_present() -> None:
    audit = _sample_audit_with_recommendations([  # adapt to existing pattern
        RecommendationOut(title="Re-collecter", detail="Détail.", priority="high"),
    ])
    html = build_report_html(audit)  # adapt to actual function name
    assert '<section class="recommendations">' in html
    assert "Recommandations" in html
    assert "Re-collecter" in html
    assert "Action prioritaire" in html


def test_html_omits_recommendations_section_when_empty() -> None:
    audit = _sample_audit_with_recommendations([])
    html = build_report_html(audit)
    assert '<section class="recommendations">' not in html


def test_html_escapes_recommendation_xss() -> None:
    """A <script> tag in title/detail must be escaped — no raw injection."""
    audit = _sample_audit_with_recommendations([
        RecommendationOut(
            title="<script>alert(1)</script>",
            detail="Détail.",
            priority="high",
        ),
    ])
    html = build_report_html(audit)
    assert "<script>alert(1)</script>" not in html
    assert "&lt;script&gt;alert(1)&lt;/script&gt;" in html
```

- [ ] **Step 2: Verify FAIL**

```
cd apps/api && uv run pytest tests/api/test_report_html.py -v -k recommendations
```

- [ ] **Step 3: Update `html.py`**

In `apps/api/app/reporting/html.py`, add the helper + integrate it. The pattern mirrors Excel:

```python
from html import escape

from app.schemas.audit import RecommendationOut

_PRIORITY_LABEL_FR = {
    "high": "Action prioritaire",
    "medium": "À planifier",
    "low": "Maintien / veille",
}


def _render_recommendations(recs: list[RecommendationOut]) -> str:
    if not recs:
        return ""
    items = "".join(
        '<li class="rec rec-' + escape(r.priority) + '">'
        '<div class="rec-head">'
        '<span class="rec-title">' + escape(r.title) + '</span>'
        '<span class="rec-prio">' + escape(_PRIORITY_LABEL_FR[r.priority]) + '</span>'
        '</div>'
        '<p class="rec-detail">' + escape(r.detail) + '</p>'
        '</li>'
        for r in recs
    )
    return (
        '<section class="recommendations">'
        '<h3>Recommandations</h3>'
        '<ul>' + items + '</ul>'
        '</section>'
    )
```

Wire the call into the main HTML builder, positioned AFTER the narrative section and BEFORE the disclaimers section.

Also add minimal CSS to the existing `<style>` block in the template:

```css
.recommendations { margin-top: 24px; }
.recommendations h3 { font-size: 14px; font-weight: 600; margin-bottom: 8px; }
.recommendations ul { list-style: none; padding: 0; }
.recommendations .rec { border: 1px solid #d4d4d8; border-radius: 6px; padding: 12px; margin-bottom: 8px; }
.recommendations .rec-head { display: flex; justify-content: space-between; gap: 12px; margin-bottom: 6px; }
.recommendations .rec-title { font-weight: 500; font-size: 13px; }
.recommendations .rec-prio { font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: #71717a; }
.recommendations .rec-high .rec-prio { color: #dc2626; }
.recommendations .rec-medium .rec-prio { color: #d97706; }
.recommendations .rec-detail { font-size: 12px; color: #52525b; margin: 0; }
```

- [ ] **Step 4: PASS**

```
cd apps/api && uv run pytest tests/api/test_report_html.py -v
```

- [ ] **Step 5: Gates + commit**

```
cd apps/api && uv run ruff check && uv run mypy --strict app/reporting/html.py
cd C:/Users/Franck/Documents/projet/auditiq/.claude/worktrees/audit-recommendations
git rev-parse --show-toplevel
git add apps/api/app/reporting/html.py apps/api/tests/api/test_report_html.py
git commit -m "feat(api): HTML/PDF report — Recommandations section (XSS-escaped, skipped if empty)"
```

---

## Task 8: TS types — `RecommendationOut` + `InterpretationOut.recommendations`

**Files:**
- Modify: `apps/web/lib/api/audits.ts`
- Modify: `apps/web/__tests__/audits-api.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `apps/web/__tests__/audits-api.test.ts`:

```typescript
describe('RecommendationOut type', () => {
  it('InterpretationOut includes a recommendations array', () => {
    const interp: import('@/lib/api/audits').InterpretationOut = {
      narrative: 'n',
      ai_act_anchors: ['a'],
      disclaimers: ['d'],
      provider: 'fallback',
      model: 'deterministic',
      recommendations: [
        { title: 'R1', detail: 'D1.', priority: 'high' },
        { title: 'R2', detail: 'D2.', priority: 'medium' },
        { title: 'R3', detail: 'D3.', priority: 'low' },
      ],
    };
    expect(interp.recommendations).toHaveLength(3);
    expect(interp.recommendations[0]?.priority).toBe('high');
  });
});
```

- [ ] **Step 2: Verify it FAILS at typecheck stage**

```
cd apps/web && pnpm typecheck
```

Expected: error — `InterpretationOut` has no `recommendations` field; `Property 'recommendations' does not exist on type 'InterpretationOut'`.

- [ ] **Step 3: Add the types**

In `apps/web/lib/api/audits.ts`, find the existing `InterpretationOut` type definition. Add a new type `RecommendationOut` ABOVE it and extend `InterpretationOut`:

```typescript
export type RecommendationOut = {
  title: string;
  detail: string;
  priority: 'high' | 'medium' | 'low';
};

export type InterpretationOut = {
  narrative: string;
  ai_act_anchors: string[];
  disclaimers: string[];
  provider: string;
  model: string;
  recommendations: RecommendationOut[];
};
```

- [ ] **Step 4: PASS**

```
cd apps/web && pnpm typecheck && pnpm test audits-api
```

Expected: typecheck clean, test passes.

- [ ] **Step 5: Lint + commit**

```
cd apps/web && pnpm lint
cd C:/Users/Franck/Documents/projet/auditiq/.claude/worktrees/audit-recommendations
git rev-parse --show-toplevel
git add apps/web/lib/api/audits.ts apps/web/__tests__/audits-api.test.ts
git commit -m "feat(web): RecommendationOut TS type + InterpretationOut.recommendations"
```

---

## Task 9: Composant `<Recommendations>`

**Files:**
- Create: `apps/web/components/audits/Recommendations.tsx`
- Create: `apps/web/__tests__/recommendations.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `apps/web/__tests__/recommendations.test.tsx`:

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import { Recommendations } from '@/components/audits/Recommendations';
import type { RecommendationOut } from '@/lib/api/audits';

const items: RecommendationOut[] = [
  { title: 'Re-collecter données', detail: 'Détail haute prio.', priority: 'high' },
  { title: 'Auditer features', detail: 'Détail moyenne prio.', priority: 'medium' },
  { title: 'Maintenir veille', detail: 'Détail basse prio.', priority: 'low' },
];

describe('Recommendations', () => {
  it('returns null when items is empty', () => {
    const { container } = render(<Recommendations items={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders all items with title + detail', () => {
    render(<Recommendations items={items} />);
    expect(screen.getByText('Re-collecter données')).toBeInTheDocument();
    expect(screen.getByText('Détail haute prio.')).toBeInTheDocument();
    expect(screen.getByText('Auditer features')).toBeInTheDocument();
    expect(screen.getByText('Maintenir veille')).toBeInTheDocument();
  });

  it('renders priority badge label for each priority level', () => {
    render(<Recommendations items={items} />);
    expect(screen.getByText('Action prioritaire')).toBeInTheDocument();
    expect(screen.getByText('À planifier')).toBeInTheDocument();
    expect(screen.getByText('Maintien / veille')).toBeInTheDocument();
  });

  it('applies different CSS classes per priority', () => {
    render(<Recommendations items={items} />);
    const high = screen.getByText('Action prioritaire');
    const medium = screen.getByText('À planifier');
    const low = screen.getByText('Maintien / veille');
    // each priority maps to a different class — the exact class names don't
    // matter here, just that they differ (priority is visually distinguished)
    expect(high.className).not.toBe(medium.className);
    expect(medium.className).not.toBe(low.className);
  });
});
```

- [ ] **Step 2: Verify FAIL**

```
cd apps/web && pnpm test recommendations
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create the component**

Create `apps/web/components/audits/Recommendations.tsx`:

```typescript
'use client';

import type { RecommendationOut } from '@/lib/api/audits';
import { cn } from '@/lib/utils';

interface RecommendationsProps {
  items: RecommendationOut[];
}

const PRIORITY_LABEL: Record<RecommendationOut['priority'], string> = {
  high: 'Action prioritaire',
  medium: 'À planifier',
  low: 'Maintien / veille',
};

const PRIORITY_CLASS: Record<RecommendationOut['priority'], string> = {
  high: 'border-status-fail-border bg-status-fail-bg text-status-fail',
  medium: 'border-status-warn-border bg-status-warn-bg text-status-warn',
  low: 'border-border-default bg-surface text-fg-muted',
};

export function Recommendations({ items }: RecommendationsProps): React.ReactElement | null {
  if (items.length === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-lg font-semibold text-fg">Recommandations</h3>
      <ul className="flex flex-col gap-3">
        {items.map((rec, idx) => (
          <li
            key={`${idx}-${rec.title}`}
            className="flex flex-col gap-2 rounded-md border border-border-default bg-surface p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-medium text-fg">{rec.title}</p>
              <span
                className={cn(
                  'inline-block whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide',
                  PRIORITY_CLASS[rec.priority],
                )}
              >
                {PRIORITY_LABEL[rec.priority]}
              </span>
            </div>
            <p className="text-sm text-fg-secondary">{rec.detail}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
```

- [ ] **Step 4: PASS**

```
cd apps/web && pnpm test recommendations
```

Expected: 4 tests pass.

- [ ] **Step 5: Gates + commit**

```
cd apps/web && pnpm typecheck && pnpm lint
cd C:/Users/Franck/Documents/projet/auditiq/.claude/worktrees/audit-recommendations
git rev-parse --show-toplevel
git add apps/web/components/audits/Recommendations.tsx apps/web/__tests__/recommendations.test.tsx
git commit -m "feat(web): Recommendations component (null on empty, priority badges)"
```

---

## Task 10: Intégration audits/[id]/page.tsx

**Files:**
- Modify: `apps/web/app/app/audits/[id]/page.tsx`
- Modify: `apps/web/__tests__/audit-result-page.test.tsx`

- [ ] **Step 1: Update the integration test**

Read `apps/web/__tests__/audit-result-page.test.tsx` to understand the existing pattern (likely mocks `useAudit` to return a fake audit with interpretation). Append:

```typescript
it('renders Recommendations section when interpretation has recos', async () => {
  // build a mock audit whose interpretation has recommendations.
  // adapt to the existing mock pattern in this file:
  const mockAudit = {
    /* ...existing fields... */
    interpretation: {
      narrative: 'n',
      ai_act_anchors: ['a'],
      disclaimers: ['d'],
      provider: 'fallback',
      model: 'deterministic',
      recommendations: [
        { title: 'Re-collecter', detail: 'Détail.', priority: 'high' as const },
      ],
    },
  };
  // adapt how the audit is injected via useAudit mock — follow the file's pattern
  // ...
  expect(screen.getByText('Recommandations')).toBeInTheDocument();
  expect(screen.getByText('Re-collecter')).toBeInTheDocument();
  expect(screen.getByText('Action prioritaire')).toBeInTheDocument();
});
```

If the existing test file uses a shared `mockAudit` fixture, extend it with a `recommendations` field instead of duplicating.

- [ ] **Step 2: Verify FAIL**

```
cd apps/web && pnpm test audit-result-page
```

Expected: 1 test fails (the new one), existing tests still pass.

- [ ] **Step 3: Add Recommendations to the page**

In `apps/web/app/app/audits/[id]/page.tsx`, find the local `Interpretation` component (around line 24-58). Add the import at top:

```typescript
import { Recommendations } from '@/components/audits/Recommendations';
```

Insert the component inside `<section>` of `Interpretation`, BETWEEN the `<p>` rendering narrative and the `<div className="mt-4 grid gap-4 sm:grid-cols-2">` that renders ai_act_anchors/disclaimers:

```tsx
      <p className="text-sm leading-relaxed text-fg-secondary">
        {interpretation.narrative}
      </p>
+     <div className="mt-4">
+       <Recommendations items={interpretation.recommendations} />
+     </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-fg-muted">
            Ancrages AI Act
          </div>
```

- [ ] **Step 4: PASS**

```
cd apps/web && pnpm test audit-result-page
```

Expected: all tests pass.

- [ ] **Step 5: Full vitest + gates**

```
cd apps/web && pnpm test && pnpm typecheck && pnpm lint
```

Expected: full suite passes, no errors.

- [ ] **Step 6: Worktree gate + commit**

```
cd C:/Users/Franck/Documents/projet/auditiq/.claude/worktrees/audit-recommendations
git rev-parse --show-toplevel
git add apps/web/app/app/audits/[id]/page.tsx apps/web/__tests__/audit-result-page.test.tsx
git commit -m "feat(web): render Recommendations section in audit result page"
```

---

## Task 11: Final gate + push + PR

- [ ] **Step 1: Full backend gates**

```
cd apps/api
uv run pytest -q
uv run ruff check
uv run mypy --strict app
```

Expected: pytest +10-15 tests vs baseline (target ~287-292), ruff clean, mypy clean.

- [ ] **Step 2: Full frontend gates**

```
cd apps/web
pnpm test
pnpm typecheck
pnpm lint
```

Expected: vitest +5 (target ~114), tsc clean, eslint 0 errors.

- [ ] **Step 3: Verify all commit identities**

```
cd C:/Users/Franck/Documents/projet/auditiq/.claude/worktrees/audit-recommendations
git log --format="%h %an <%ae> %s" origin/main..HEAD
```

Expected: every commit `Franck F <franck-dilane1.fambou@epitech.digital>`, zero `Co-Authored-By: Claude`. ~10 commits.

- [ ] **Step 4: Push branch + open PR**

```
git push -u origin worktree-audit-recommendations
gh pr create --title "feat: audit recommendations — LLM-generated, prioritized, web+Excel+PDF" --body "$(cat <<'EOF'
## Summary

Ajoute des **recommandations actionnables** à chaque audit, à côté de l'interprétation narrative (spec `docs/superpowers/specs/2026-05-31-audit-recommendations-design.md`).

- **Schema** : `RecommendationOut { title, detail, priority: 'high'|'medium'|'low' }`, `InterpretationOut.recommendations: list[RecommendationOut]` (default vide → audits existants chargent sans erreur).
- **LLM** : 3 prompts M1/M2/M3 étendus pour générer 3-5 recos prioritisées par audit, avec add-on module-specific (data collection / cluster characterization / prompt bank coverage).
- **Parser défensif** : `parse_recommendations()` filtre les entrées LLM malformées sans casser l'audit.
- **Restitution** : composant `<Recommendations>` (web), feuille Excel « Recommandations » (skip si vide), section HTML/PDF (XSS-escaped, skip si vide).

## Test plan

- [x] pytest +10-15 (schema 4, parser 3, interp m1/m2/m3 9, excel 2, html 3)
- [x] vitest +5 (TS type 1, component 4, integration 1)
- [x] ruff clean
- [x] mypy --strict clean
- [x] tsc strict clean
- [x] eslint 0 errors
- [x] 10 commits Franck F, zéro trailer Claude

## Backward compatibility

Audits existants pré-feature : leur `interpretation` JSONB n'a pas le champ → `Field(default_factory=list)` retourne `[]` → section UI cachée. Aucune migration nécessaire.

## Hors scope

- Édition manuelle des recos par l'utilisateur
- Backfill des audits existants
- Suivi du statut (fait / en cours)
EOF
)"
```

- [ ] **Step 5: Plan-sync commit if needed**

If any task required deviation from the plan (e.g. fixture name differed), append a final commit:

```
git add docs/superpowers/plans/2026-05-31-audit-recommendations.md
git commit -m "chore(plan): sync recommendations plan with discoveries during execution"
```

---

## Spec coverage check

| Spec section / item | Covered by |
|---|---|
| §4.1 — `RecommendationOut` schema | Task 1 |
| §4.1 — `InterpretationOut.recommendations` default empty | Task 1 |
| §4.2 — Prompt M1/M2/M3 extended | Tasks 3, 4, 5 |
| §4.2 — Module-specific add-on | Tasks 3, 4, 5 |
| §4.3 — Defensive parser (drops invalid) | Task 2 |
| §4.3 — Fallback returns empty recos | Tasks 3, 4, 5 (no `_fallback` change needed — default_factory handles it) |
| §4.4 — Excel sheet « Recommandations » | Task 6 |
| §4.4 — Excel: skip when empty | Task 6 |
| §4.5 — HTML section + CSS | Task 7 |
| §4.5 — XSS escape | Task 7 (test_html_escapes_recommendation_xss) |
| §4.5 — HTML: skip when empty | Task 7 |
| §4.6 — `<Recommendations>` component | Task 9 |
| §4.6 — null on empty | Task 9 |
| §4.6 — Priority badges with labels FR | Task 9 |
| §4.7 — TS `RecommendationOut` + `InterpretationOut.recommendations` | Task 8 |
| §4.8 — Integration in audits/[id]/page.tsx | Task 10 |
| §5 — Error handling (all 6 cases) | Task 2 (parser) + Task 1 (default_factory) |
| §6 — Tests backend + frontend | Tasks 1, 2, 3, 4, 5, 6, 7, 9, 10 |
