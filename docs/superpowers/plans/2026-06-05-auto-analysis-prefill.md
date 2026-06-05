# Analyse auto fiable (FR/EN) + préremplissage wizard — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Réparer et enrichir la détection automatique des colonnes (décision, valeur favorable, attribut protégé, groupe de référence, vérité-terrain) sur des datasets FR/EN, puis préremplir — de façon modifiable — la phase 3 du wizard d'audit.

**Architecture:** On enrichit le moteur pur `audit_engine/dataset_analysis.py` (détection bilingue normalisée par tokens + nouvelles suggestions), on étend ses dataclasses et les DTO `dataset.py` (rétro-compatibles), puis un `useEffect` dans `Step3Config.tsx` applique les suggestions via `setValue` (anti-clobber). TDD strict, commits fréquents.

**Tech Stack:** Python 3.12 (pandas, scipy, scikit-learn, pydantic v2, pytest, ruff, mypy --strict) ; Next.js + React + react-hook-form + vitest.

**Spec:** `docs/superpowers/specs/2026-06-05-auto-analysis-prefill-design.md`

**Commandes (Windows) :**
- API tests : depuis `apps/api`, `$env:PYTHONUTF8='1'; .\.venv\Scripts\python.exe -m pytest <chemin> -q`
- API gates : `.\.venv\Scripts\python.exe -m ruff check app tests` ; `.\.venv\Scripts\python.exe -m mypy app`
- Web tests : depuis `apps/web`, `pnpm vitest run <chemin>`
- Identité commit : Franck F (config locale déjà posée) ; **ne pas** ajouter de trailer co-auteur.

---

## File Structure

- `apps/api/app/audit_engine/types.py` — MODIFIER : `Suggestion` (+`privileged_value`), `DatasetAnalysis` (+`protected_candidates`, +`suggested_ground_truth`).
- `apps/api/app/audit_engine/dataset_analysis.py` — MODIFIER : helpers de normalisation + vocabulaires, détection décision/protégé par tokens, favorable sémantique, candidats protégés classés, groupe de référence, vérité-terrain.
- `apps/api/app/schemas/dataset.py` — MODIFIER : `SuggestionOut` (+`privileged_value`), `DatasetAnalysisOut` (+`protected_candidates`, +`suggested_ground_truth`) + adaptateurs `from_engine`.
- `apps/api/tests/audit_engine/test_dataset_analysis_fr.py` — CRÉER : détection FR/EN sur les datasets réels + normalisation + favorable + candidats + référence + vérité-terrain.
- `apps/api/tests/api/test_schemas_dataset.py` — MODIFIER (ou créer un test ciblé) : mapping des nouveaux champs DTO.
- `apps/web/lib/api/audits.ts` — MODIFIER : types TS `SuggestionOut`/`DatasetAnalysisOut`.
- `apps/web/components/audits/wizard/unified/Step3Config.tsx` — MODIFIER : `useEffect` de préremplissage (anti-clobber, badges, ouverture avancées).
- `apps/web/components/audits/wizard/unified/Step2Source.tsx` — MODIFIER : résumé d'analyse enrichi.
- `apps/web/components/audits/wizard/unified/__tests__/step3-prefill.test.tsx` — CRÉER : prefill + respect de l'override.

Note cache : `dataset_service.py` met en cache `DatasetAnalysisOut` dans `dataset.analysis_cache`. Les nouveaux champs ont des défauts → les caches existants restent valides ; la détection améliorée s'applique aux nouvelles analyses (cache miss).

---

## Task 1 : Étendre les dataclasses moteur

**Files:**
- Modify: `apps/api/app/audit_engine/types.py` (dataclass `Suggestion` ~lignes 263-269 ; `DatasetAnalysis` ~lignes 271-278)

- [ ] **Step 1 : Écrire le test (échouera)**

Créer `apps/api/tests/audit_engine/test_dataset_analysis_fr.py` :

```python
from app.audit_engine.types import DatasetAnalysis, Suggestion


def test_suggestion_carries_privileged_value():
    s = Suggestion(column="sexe", confidence=0.9, reason="r",
                   favorable_value="oui", privileged_value="H")
    assert s.privileged_value == "H"


def test_dataset_analysis_has_new_optional_fields():
    a = DatasetAnalysis(columns=(), suggested_decision=None,
                        suggested_protected=None)
    assert a.protected_candidates == ()
    assert a.suggested_ground_truth is None
```

- [ ] **Step 2 : Lancer → échec**

Run : `$env:PYTHONUTF8='1'; .\.venv\Scripts\python.exe -m pytest tests/audit_engine/test_dataset_analysis_fr.py -q`
Expected : FAIL (`TypeError: unexpected keyword argument 'privileged_value'` / `'protected_candidates'`).

- [ ] **Step 3 : Implémenter**

Dans `types.py`, modifier `Suggestion` :

```python
@dataclass(frozen=True)
class Suggestion:
    column: str
    confidence: float  # in [0, 1]
    reason: str
    favorable_value: object | None = None
    privileged_value: object | None = None
```

Et `DatasetAnalysis` :

```python
@dataclass(frozen=True)
class DatasetAnalysis:
    columns: tuple[ColumnProfile, ...]
    suggested_decision: Suggestion | None
    suggested_protected: Suggestion | None
    protected_candidates: tuple[Suggestion, ...] = ()
    suggested_ground_truth: Suggestion | None = None

    def __post_init__(self) -> None:
        object.__setattr__(self, "columns", tuple(self.columns))
        object.__setattr__(
            self, "protected_candidates", tuple(self.protected_candidates)
        )
```

(Conserver tout `__post_init__` existant ; ajouter la normalisation de `protected_candidates`.)

- [ ] **Step 4 : Lancer → succès**

Run : `$env:PYTHONUTF8='1'; .\.venv\Scripts\python.exe -m pytest tests/audit_engine/test_dataset_analysis_fr.py -q`
Expected : PASS (2 tests).

- [ ] **Step 5 : Commit**

```bash
git add apps/api/app/audit_engine/types.py apps/api/tests/audit_engine/test_dataset_analysis_fr.py
git commit -m "feat(engine): Suggestion.privileged_value + DatasetAnalysis candidates/ground_truth"
```

---

## Task 2 : Normalisation + détection bilingue par tokens

**Files:**
- Modify: `apps/api/app/audit_engine/dataset_analysis.py` (entête + `_infer_role_hint` ~48-63 ; `_suggest_decision` ~119-157 ; `_suggest_protected` ~177-211)
- Test: `apps/api/tests/audit_engine/test_dataset_analysis_fr.py`

- [ ] **Step 1 : Écrire les tests (échoueront)**

Ajouter à `test_dataset_analysis_fr.py` :

```python
import pandas as pd

from app.audit_engine.dataset_analysis import (
    _name_is_decision,
    _name_is_protected,
    _normalize,
    _tokens,
    run_dataset_analysis,
)

DATA = r"C:\Users\Franck\Documents\projet\auditiq\Data_test"


def test_normalize_strips_accents_and_case():
    assert _normalize("ÂGE") == "age"
    assert _normalize("Accordé") == "accorde"


def test_tokens_split_on_non_alnum():
    assert _tokens("experience_ans") == {"experience", "ans"}
    # 'experience_ans' must NOT be treated as the protected attribute 'age'
    assert _name_is_protected("experience_ans") is False


def test_name_detection_french():
    assert _name_is_decision("embauche") is True
    assert _name_is_decision("accorde") is True
    assert _name_is_protected("sexe") is True   # 'sexe' != 'sex' regression
    assert _name_is_protected("origine") is True


def test_recruitment_dataset_detects_decision_and_protected():
    df = pd.read_csv(rf"{DATA}\m1-recrutement-biais.csv")
    a = run_dataset_analysis(df)
    assert a.suggested_decision is not None
    assert a.suggested_decision.column == "embauche"
    assert a.suggested_protected is not None
    assert a.suggested_protected.column == "sexe"
```

- [ ] **Step 2 : Lancer → échec**

Run : `$env:PYTHONUTF8='1'; .\.venv\Scripts\python.exe -m pytest tests/audit_engine/test_dataset_analysis_fr.py -q`
Expected : FAIL (`ImportError: cannot import name '_normalize'` ; et `suggested_decision is None`).

- [ ] **Step 3 : Implémenter**

En tête de `dataset_analysis.py`, remplacer les imports `re` et les regex `_DECISION_RE`/`_PROTECTED_RE` par :

```python
import re
import unicodedata

# … (imports existants conservés)

def _normalize(text: object) -> str:
    nfkd = unicodedata.normalize("NFKD", str(text))
    return "".join(c for c in nfkd if not unicodedata.combining(c)).lower()


def _tokens(name: object) -> set[str]:
    return {t for t in re.split(r"[^a-z0-9]+", _normalize(name)) if t}


_DECISION_TOKENS = frozenset({
    "decision", "embauche", "embauché", "recrute", "recrutement", "accorde",
    "accord", "accepte", "admis", "admission", "retenu", "octroi", "refuse",
    "approved", "approuve", "outcome", "class", "target", "label", "result",
    "status", "hired", "selected", "granted", "predicted", "prediction", "y",
})
_PROTECTED_TOKENS = frozenset({
    "sexe", "sex", "genre", "gender", "age", "race", "origine", "origin",
    "nationalite", "nationality", "ethnie", "ethnic", "ethnicity", "religion",
    "handicap", "disability", "orientation", "situation", "familiale",
    "civilite",
})


def _name_is_decision(name: object) -> bool:
    return bool(_tokens(name) & _DECISION_TOKENS)


def _name_is_protected(name: object) -> bool:
    return bool(_tokens(name) & _PROTECTED_TOKENS)
```

Note : `_DECISION_TOKENS` est normalisé via comparaison sur tokens normalisés ; les formes accentuées (`embauché`) y figurent mais `_tokens()` renvoie déjà des tokens désaccentués (`embauche`), donc inclure aussi les formes désaccentuées suffit — garder les deux ne nuit pas.

Dans `_infer_role_hint`, remplacer :
```python
    if _DECISION_RE.match(name) and 2 <= unique_count <= 10:
        return "decision"
    if _PROTECTED_RE.match(name) and 2 <= unique_count <= 20:
        return "protected"
```
par :
```python
    if _name_is_decision(name) and 2 <= unique_count <= 10:
        return "decision"
    if _name_is_protected(name) and 2 <= unique_count <= 20:
        return "protected"
```

Dans `_suggest_decision`, remplacer `name_score = 1.0 if _DECISION_RE.match(p.name) else 0.0`
par `name_score = 1.0 if _name_is_decision(p.name) else 0.0`.

Dans `_suggest_protected`, remplacer `name_score = 1.0 if _PROTECTED_RE.match(p.name) else 0.0`
par `name_score = 1.0 if _name_is_protected(p.name) else 0.0`.

- [ ] **Step 4 : Lancer → succès**

Run : `$env:PYTHONUTF8='1'; .\.venv\Scripts\python.exe -m pytest tests/audit_engine/test_dataset_analysis_fr.py -q`
Expected : PASS (tous les tests de la tâche 2).

- [ ] **Step 5 : Commit**

```bash
git add apps/api/app/audit_engine/dataset_analysis.py apps/api/tests/audit_engine/test_dataset_analysis_fr.py
git commit -m "fix(engine): bilingual FR/EN token-based column detection (sexe, embauche, accordé)"
```

---

## Task 3 : Valeur favorable sémantique

**Files:**
- Modify: `apps/api/app/audit_engine/dataset_analysis.py` (`_suggest_decision`, calcul `favorable`)
- Test: `apps/api/tests/audit_engine/test_dataset_analysis_fr.py`

- [ ] **Step 1 : Écrire les tests (échoueront)**

Ajouter :

```python
from app.audit_engine.dataset_analysis import _favorable_value


def test_favorable_value_semantic_majority_positive():
    # majority is 'accepté' (favorable) — must NOT pick the minority class
    df = pd.DataFrame({"embauche": ["accepté"] * 7 + ["refusé"] * 3})
    assert _favorable_value(df, "embauche") == "accepté"


def test_favorable_value_fallback_minority_when_no_positive_token():
    df = pd.DataFrame({"d": ["X"] * 8 + ["Y"] * 2})
    assert _favorable_value(df, "d") == "Y"  # minority fallback


def test_recruitment_favorable_is_oui():
    df = pd.read_csv(rf"{DATA}\m1-recrutement-biais.csv")
    a = run_dataset_analysis(df)
    assert a.suggested_decision.favorable_value == "oui"
```

- [ ] **Step 2 : Lancer → échec**

Run : `$env:PYTHONUTF8='1'; .\.venv\Scripts\python.exe -m pytest tests/audit_engine/test_dataset_analysis_fr.py -q`
Expected : FAIL (`ImportError: _favorable_value` ; le calcul actuel utilise `idxmin`).

- [ ] **Step 3 : Implémenter**

Ajouter le vocabulaire et le helper dans `dataset_analysis.py` :

```python
_FAVORABLE_TOKENS = frozenset({
    "oui", "accepte", "admis", "embauche", "accorde", "approuve", "retenu",
    "octroye", "favorable", "positif", "yes", "approved", "granted", "hired",
    "selected", "accepted", "eligible", "true", "1",
})


def _favorable_value(df: pd.DataFrame, col: str) -> object | None:
    """Pick the favourable decision value by FR/EN positive vocabulary;
    fall back to the minority class when no positive label is recognised."""
    values = list(df[col].dropna().unique())
    for v in values:
        if _normalize(v) in _FAVORABLE_TOKENS:
            return v
    counts = df[col].value_counts(dropna=True)
    return counts.idxmin() if len(counts) >= 2 else None
```

Dans `_suggest_decision`, remplacer :
```python
        counts = df[p.name].value_counts(dropna=True)
        favorable = counts.idxmin() if len(counts) >= 2 else None
        candidates.append((final, p.name, reason, favorable))
```
par :
```python
        favorable = _favorable_value(df, p.name)
        candidates.append((final, p.name, reason, favorable))
```

- [ ] **Step 4 : Lancer → succès**

Run : `$env:PYTHONUTF8='1'; .\.venv\Scripts\python.exe -m pytest tests/audit_engine/test_dataset_analysis_fr.py -q`
Expected : PASS.

- [ ] **Step 5 : Commit**

```bash
git add apps/api/app/audit_engine/dataset_analysis.py apps/api/tests/audit_engine/test_dataset_analysis_fr.py
git commit -m "feat(engine): semantic FR/EN favorable-value detection with minority fallback"
```

---

## Task 4 : Candidats protégés classés (liste)

**Files:**
- Modify: `apps/api/app/audit_engine/dataset_analysis.py` (`_suggest_protected` → liste ; `run_dataset_analysis`)
- Test: `apps/api/tests/audit_engine/test_dataset_analysis_fr.py`

- [ ] **Step 1 : Écrire le test (échouera)**

```python
def test_protected_candidates_ranked_and_top_matches_suggested():
    df = pd.read_csv(rf"{DATA}\m1-recrutement-biais.csv")
    a = run_dataset_analysis(df)
    assert len(a.protected_candidates) >= 1
    # 'sexe' (name-evocative) is present and ranked first
    assert a.protected_candidates[0].column == "sexe"
    assert a.suggested_protected.column == a.protected_candidates[0].column
    # ranked by descending confidence
    confs = [c.confidence for c in a.protected_candidates]
    assert confs == sorted(confs, reverse=True)
```

- [ ] **Step 2 : Lancer → échec**

Run : `$env:PYTHONUTF8='1'; .\.venv\Scripts\python.exe -m pytest tests/audit_engine/test_dataset_analysis_fr.py::test_protected_candidates_ranked_and_top_matches_suggested -q`
Expected : FAIL (`protected_candidates` vide).

- [ ] **Step 3 : Implémenter**

Renommer/adapter `_suggest_protected` pour renvoyer une **liste triée** (inclusion si nom évocateur OU score ≥ seuil) :

```python
def _protected_candidates(
    df: pd.DataFrame,
    profiles: tuple[ColumnProfile, ...],
    *,
    decision_col: str | None,
) -> list[Suggestion]:
    if decision_col is None or decision_col not in df.columns:
        return []
    scored: list[tuple[float, str, str]] = []
    for p in profiles:
        if p.name == decision_col:
            continue
        if not (2 <= p.unique_count <= 20):
            continue
        name_hit = _name_is_protected(p.name)
        name_score = 1.0 if name_hit else 0.0
        stats_score = _chi2_score(df, p.name, decision_col)
        final = 0.6 * name_score + 0.4 * stats_score
        if not name_hit and final < _CONFIDENCE_THRESHOLD:
            continue  # keep name-evocative columns regardless of threshold
        reasons: list[str] = []
        if name_hit:
            reasons.append("nom évocateur d'attribut sensible")
        if stats_score > 0.3:
            reasons.append("lien fort avec la décision (χ²)")
        reason = (
            "Colonne candidate : " + ", ".join(reasons) + "."
            if reasons
            else "Cardinalité compatible mais aucun signal fort détecté."
        )
        scored.append((final, p.name, reason))
    scored.sort(key=lambda t: (-t[0], t[1]))
    return [
        Suggestion(column=col, confidence=round(score, 3), reason=reason)
        for score, col, reason in scored
    ]
```

Dans `run_dataset_analysis`, remplacer l'appel `sug_protected = _suggest_protected(...)` par :
```python
    candidates = _protected_candidates(df, profiles, decision_col=decision_col)
    sug_protected = candidates[0] if candidates else None
```
et passer `protected_candidates=tuple(candidates)` au `DatasetAnalysis(...)` retourné.

(Supprimer l'ancienne fonction `_suggest_protected` si elle n'est plus référencée ailleurs ; vérifier via `grep -rn "_suggest_protected" app tests`.)

- [ ] **Step 4 : Lancer → succès**

Run : `$env:PYTHONUTF8='1'; .\.venv\Scripts\python.exe -m pytest tests/audit_engine/test_dataset_analysis_fr.py -q`
Expected : PASS.

- [ ] **Step 5 : Commit**

```bash
git add apps/api/app/audit_engine/dataset_analysis.py apps/api/tests/audit_engine/test_dataset_analysis_fr.py
git commit -m "feat(engine): rank all protected-attribute candidates"
```

---

## Task 5 : Groupe de référence suggéré

**Files:**
- Modify: `apps/api/app/audit_engine/dataset_analysis.py` (`run_dataset_analysis`)
- Test: `apps/api/tests/audit_engine/test_dataset_analysis_fr.py`

- [ ] **Step 1 : Écrire le test (échouera)**

```python
def test_reference_group_is_highest_favorable_rate():
    df = pd.read_csv(rf"{DATA}\m1-recrutement-biais.csv")
    a = run_dataset_analysis(df)
    # H is hired ~80% vs F ~28% -> reference (privileged) = H
    assert a.suggested_protected.privileged_value == "H"
```

- [ ] **Step 2 : Lancer → échec**

Run : `$env:PYTHONUTF8='1'; .\.venv\Scripts\python.exe -m pytest tests/audit_engine/test_dataset_analysis_fr.py::test_reference_group_is_highest_favorable_rate -q`
Expected : FAIL (`privileged_value is None`).

- [ ] **Step 3 : Implémenter**

Ajouter le helper et l'appliquer au top candidat dans `run_dataset_analysis` :

```python
import dataclasses


def _reference_group(
    df: pd.DataFrame, protected_col: str, decision_col: str, favorable: object
) -> object | None:
    clean = df[[protected_col, decision_col]].dropna()
    if clean.empty:
        return None
    fav_mask = clean[decision_col].astype(str) == str(favorable)
    rates = clean.assign(_fav=fav_mask).groupby(protected_col)["_fav"].mean()
    if rates.empty:
        return None
    return rates.idxmax()
```

Dans `run_dataset_analysis`, après avoir calculé `sug_decision`, `candidates`, `sug_protected` :
```python
    if (
        sug_protected is not None
        and sug_decision is not None
        and sug_decision.favorable_value is not None
    ):
        ref = _reference_group(
            df, sug_protected.column, sug_decision.column,
            sug_decision.favorable_value,
        )
        if ref is not None:
            sug_protected = dataclasses.replace(sug_protected, privileged_value=ref)
            candidates = [sug_protected, *candidates[1:]]
```

- [ ] **Step 4 : Lancer → succès**

Run : `$env:PYTHONUTF8='1'; .\.venv\Scripts\python.exe -m pytest tests/audit_engine/test_dataset_analysis_fr.py -q`
Expected : PASS.

- [ ] **Step 5 : Commit**

```bash
git add apps/api/app/audit_engine/dataset_analysis.py apps/api/tests/audit_engine/test_dataset_analysis_fr.py
git commit -m "feat(engine): suggest reference (privileged) group = highest favorable rate"
```

---

## Task 6 : Colonne vérité-terrain suggérée

**Files:**
- Modify: `apps/api/app/audit_engine/dataset_analysis.py` (`run_dataset_analysis`)
- Test: `apps/api/tests/audit_engine/test_dataset_analysis_fr.py`

- [ ] **Step 1 : Écrire le test (échouera)**

```python
def test_ground_truth_detected_on_truelabel_dataset():
    df = pd.read_csv(rf"{DATA}\m1-truelabel-eo.csv")
    a = run_dataset_analysis(df)
    assert a.suggested_ground_truth is not None
    assert a.suggested_ground_truth.column == "actually_qualified"


def test_no_ground_truth_when_absent():
    df = pd.read_csv(rf"{DATA}\m1-recrutement-biais.csv")
    a = run_dataset_analysis(df)
    assert a.suggested_ground_truth is None
```

- [ ] **Step 2 : Lancer → échec**

Run : `$env:PYTHONUTF8='1'; .\.venv\Scripts\python.exe -m pytest tests/audit_engine/test_dataset_analysis_fr.py -q -k ground_truth`
Expected : FAIL (`suggested_ground_truth is None` pour truelabel).

- [ ] **Step 3 : Implémenter**

Ajouter le vocabulaire + helper, et l'appeler dans `run_dataset_analysis` :

```python
_GROUND_TRUTH_TOKENS = frozenset({
    "reel", "vrai", "vraie", "qualifie", "qualified", "actually", "ground",
    "truth", "true", "ytrue", "reelle", "effective",
})


def _suggest_ground_truth(
    df: pd.DataFrame,
    profiles: tuple[ColumnProfile, ...],
    *,
    decision_col: str | None,
    protected_col: str | None,
) -> Suggestion | None:
    if decision_col is None or decision_col not in df.columns:
        return None
    dec_vals = set(df[decision_col].dropna().astype(str).unique())
    for p in profiles:
        if p.name in {decision_col, protected_col}:
            continue
        if not (_tokens(p.name) & _GROUND_TRUTH_TOKENS):
            continue
        if p.unique_count != 2:
            continue
        col_vals = set(df[p.name].dropna().astype(str).unique())
        if col_vals != dec_vals:
            continue
        return Suggestion(
            column=p.name,
            confidence=0.9,
            reason="Colonne binaire évoquant la vérité-terrain, mêmes "
            "valeurs que la décision (active Equal Opportunity / Equalized "
            "Odds).",
        )
    return None
```

Dans `run_dataset_analysis`, calculer et inclure dans le retour :
```python
    sug_gt = _suggest_ground_truth(
        df, profiles,
        decision_col=decision_col,
        protected_col=sug_protected.column if sug_protected else None,
    )
    return DatasetAnalysis(
        columns=profiles,
        suggested_decision=sug_decision,
        suggested_protected=sug_protected,
        protected_candidates=tuple(candidates),
        suggested_ground_truth=sug_gt,
    )
```

- [ ] **Step 4 : Lancer → succès (toute la suite moteur)**

Run : `$env:PYTHONUTF8='1'; .\.venv\Scripts\python.exe -m pytest tests/audit_engine/ -q`
Expected : PASS (suite moteur entière, dont l'existant non régressé).

- [ ] **Step 5 : Gates moteur + commit**

Run : `.\.venv\Scripts\python.exe -m ruff check app tests` (Expected : All checks passed!) puis `.\.venv\Scripts\python.exe -m mypy app` (Expected : Success).
```bash
git add apps/api/app/audit_engine/dataset_analysis.py apps/api/tests/audit_engine/test_dataset_analysis_fr.py
git commit -m "feat(engine): suggest ground-truth column (binary, decision value-set match)"
```

---

## Task 7 : DTO `SuggestionOut` / `DatasetAnalysisOut`

**Files:**
- Modify: `apps/api/app/schemas/dataset.py` (`SuggestionOut` 62-77 ; `DatasetAnalysisOut` 80-101)
- Test: `apps/api/tests/api/test_schemas_dataset.py` (ajouter un test ; le fichier existe)

- [ ] **Step 1 : Écrire le test (échouera)**

Ajouter dans `apps/api/tests/api/test_schemas_dataset.py` :

```python
def test_dataset_analysis_out_maps_new_fields():
    from app.audit_engine.types import DatasetAnalysis, Suggestion
    from app.schemas.dataset import DatasetAnalysisOut

    a = DatasetAnalysis(
        columns=(),
        suggested_decision=Suggestion("embauche", 0.8, "r", favorable_value="oui"),
        suggested_protected=Suggestion("sexe", 0.7, "r", privileged_value="H"),
        protected_candidates=(
            Suggestion("sexe", 0.7, "r", privileged_value="H"),
            Suggestion("age", 0.4, "r"),
        ),
        suggested_ground_truth=Suggestion("reel", 0.9, "r"),
    )
    out = DatasetAnalysisOut.from_engine(a)
    assert out.suggested_protected.privileged_value == "H"
    assert [c.column for c in out.protected_candidates] == ["sexe", "age"]
    assert out.suggested_ground_truth.column == "reel"
```

- [ ] **Step 2 : Lancer → échec**

Run : `$env:PYTHONUTF8='1'; .\.venv\Scripts\python.exe -m pytest tests/api/test_schemas_dataset.py::test_dataset_analysis_out_maps_new_fields -q`
Expected : FAIL (`AttributeError: 'SuggestionOut' object has no attribute 'privileged_value'`).

- [ ] **Step 3 : Implémenter**

Dans `dataset.py`, `SuggestionOut` :
```python
class SuggestionOut(BaseModel):
    model_config = ConfigDict(extra="forbid")

    column: str
    confidence: float
    reason: str
    favorable_value: Any | None = None
    privileged_value: Any | None = None

    @classmethod
    def from_engine(cls, s: Suggestion) -> SuggestionOut:
        return cls(
            column=s.column,
            confidence=float(s.confidence),
            reason=s.reason,
            favorable_value=_to_json_scalar(s.favorable_value),
            privileged_value=_to_json_scalar(s.privileged_value),
        )
```

Et `DatasetAnalysisOut` :
```python
class DatasetAnalysisOut(BaseModel):
    model_config = ConfigDict(extra="forbid")

    columns: list[ColumnProfileOut]
    suggested_decision: SuggestionOut | None = None
    suggested_protected: SuggestionOut | None = None
    protected_candidates: list[SuggestionOut] = []
    suggested_ground_truth: SuggestionOut | None = None

    @classmethod
    def from_engine(cls, a: DatasetAnalysis) -> DatasetAnalysisOut:
        return cls(
            columns=[ColumnProfileOut.from_engine(c) for c in a.columns],
            suggested_decision=(
                SuggestionOut.from_engine(a.suggested_decision)
                if a.suggested_decision else None
            ),
            suggested_protected=(
                SuggestionOut.from_engine(a.suggested_protected)
                if a.suggested_protected else None
            ),
            protected_candidates=[
                SuggestionOut.from_engine(c) for c in a.protected_candidates
            ],
            suggested_ground_truth=(
                SuggestionOut.from_engine(a.suggested_ground_truth)
                if a.suggested_ground_truth else None
            ),
        )
```

- [ ] **Step 4 : Lancer → succès + suite API**

Run : `$env:PYTHONUTF8='1'; .\.venv\Scripts\python.exe -m pytest tests/api/test_schemas_dataset.py -q` (Expected : PASS) puis `... -m pytest -q` (suite complète, Expected : tout vert).

- [ ] **Step 5 : Gates + commit**

Run : `.\.venv\Scripts\python.exe -m ruff check app tests` ; `.\.venv\Scripts\python.exe -m mypy app` (Expected : clean).
```bash
git add apps/api/app/schemas/dataset.py apps/api/tests/api/test_schemas_dataset.py
git commit -m "feat(api): expose privileged_value, protected_candidates, ground_truth in DatasetAnalysisOut"
```

---

## Task 8 : Types client TS

**Files:**
- Modify: `apps/web/lib/api/audits.ts` (types `SuggestionOut` ~283-288, `DatasetAnalysisOut` ~290-294)

- [ ] **Step 1 : Modifier les types**

Étendre `SuggestionOut` :
```ts
export type SuggestionOut = {
  column: string;
  confidence: number;
  reason: string;
  favorable_value?: string | number | boolean | null;
  privileged_value?: string | number | boolean | null;
};
```
Étendre `DatasetAnalysisOut` :
```ts
export type DatasetAnalysisOut = {
  columns: ColumnProfileOut[];
  suggested_decision?: SuggestionOut | null;
  suggested_protected?: SuggestionOut | null;
  protected_candidates?: SuggestionOut[];
  suggested_ground_truth?: SuggestionOut | null;
};
```
(Adapter aux noms réels présents dans le fichier ; conserver `ColumnProfileOut`.)

- [ ] **Step 2 : Typecheck**

Run : depuis `apps/web`, `pnpm tsc --noEmit`
Expected : 0 erreur.

- [ ] **Step 3 : Commit**

```bash
git add apps/web/lib/api/audits.ts
git commit -m "feat(web): extend DatasetAnalysisOut TS types (privileged, candidates, ground_truth)"
```

---

## Task 9 : Préremplissage Step3 (anti-clobber + badges + ouverture avancées)

**Files:**
- Modify: `apps/web/components/audits/wizard/unified/Step3Config.tsx` (`Step3ConfigM1`, 17-250)
- Test: `apps/web/components/audits/wizard/unified/__tests__/step3-prefill.test.tsx` (CRÉER)

- [ ] **Step 1 : Écrire le test (échouera)**

Créer `__tests__/step3-prefill.test.tsx`. Rendre `Step3ConfigM1` à l'intérieur d'un `FormProvider` (react-hook-form) avec une analyse fournissant les suggestions, et vérifier que les champs sont préremplis ; puis vérifier qu'une valeur saisie n'est pas écrasée.

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormProvider, useForm } from 'react-hook-form';
import { describe, expect, it } from 'vitest';

import { Step3Config } from '@/components/audits/wizard/unified/Step3Config';
import type { DatasetAnalysisOut, DatasetOut } from '@/lib/api/audits';

const dataset = {
  id: 'd1', columns: ['sexe', 'embauche', 'reel'],
} as unknown as DatasetOut;

const analysis: DatasetAnalysisOut = {
  columns: [
    { name: 'embauche', dtype: 'categorical', unique_count: 2, null_ratio: 0,
      top_values: [['oui', 5], ['non', 5]], role_hint: 'decision' },
    { name: 'sexe', dtype: 'categorical', unique_count: 2, null_ratio: 0,
      top_values: [['H', 5], ['F', 5]], role_hint: 'protected' },
  ] as DatasetAnalysisOut['columns'],
  suggested_decision: { column: 'embauche', confidence: 0.8, reason: 'r',
    favorable_value: 'oui' },
  suggested_protected: { column: 'sexe', confidence: 0.7, reason: 'r',
    privileged_value: 'H' },
  protected_candidates: [],
  suggested_ground_truth: { column: 'reel', confidence: 0.9, reason: 'r' },
};

function Harness({ audit_type = 'tabular-known' as const }) {
  const methods = useForm({ defaultValues: { audit_type } as never });
  return (
    <FormProvider {...methods}>
      <Step3Config dataset={dataset} analysis={analysis} />
    </FormProvider>
  );
}

describe('Step3 prefill', () => {
  it('prefills decision, favorable, protected and reference from analysis', async () => {
    render(<Harness />);
    expect((screen.getByLabelText('Colonne de décision') as HTMLSelectElement).value)
      .toBe('embauche');
    expect((screen.getByLabelText('Attribut protégé') as HTMLSelectElement).value)
      .toBe('sexe');
    expect((screen.getByLabelText('Valeur favorable') as HTMLSelectElement).value)
      .toBe('oui');
  });

  it('does not clobber a user edit', async () => {
    render(<Harness />);
    const dec = screen.getByLabelText('Colonne de décision') as HTMLSelectElement;
    await userEvent.selectOptions(dec, 'reel');
    expect(dec.value).toBe('reel'); // user choice survives re-render
  });
});
```

(Si `Step3Config` n'est pas exporté, l'exporter en `export` nommé en plus du default ; sinon importer le default.)

- [ ] **Step 2 : Lancer → échec**

Run : depuis `apps/web`, `pnpm vitest run components/audits/wizard/unified/__tests__/step3-prefill.test.tsx`
Expected : FAIL (les valeurs sont `''`, pas de prefill).

- [ ] **Step 3 : Implémenter le prefill**

Dans `Step3ConfigM1`, ajouter `setValue`/`getValues` au hook et un `useEffect` :

```tsx
  const { register, control, setValue, getValues } = useFormContext<UnifiedValues>();
  const { setHelpKey, clearHelpKey } = useWizard();
  const [advancedOpen, setAdvancedOpen] = React.useState(false);

  React.useEffect(() => {
    if (!analysis) return;
    const setIfEmpty = (name: keyof UnifiedValues, value: unknown) => {
      if (value == null || value === '') return;
      if (getValues(name)) return; // anti-clobber: only fill empty fields
      setValue(name, String(value) as never, { shouldDirty: false });
    };
    setIfEmpty('decision_column', analysis.suggested_decision?.column);
    setIfEmpty('favorable_value', analysis.suggested_decision?.favorable_value);
    setIfEmpty('protected_attribute', analysis.suggested_protected?.column);
    setIfEmpty('privileged_value', analysis.suggested_protected?.privileged_value);
    setIfEmpty('ground_truth_column', analysis.suggested_ground_truth?.column);
    if (
      analysis.suggested_protected?.privileged_value != null ||
      analysis.suggested_ground_truth?.column != null
    ) {
      setAdvancedOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysis]);
```

Ajouter un badge « suggéré » à côté des libellés préremplis. Exemple pour la décision (réutiliser le même motif pour favorable/protégé) — placer après le `<label>` :
```tsx
        {analysis?.suggested_decision && (
          <span className="text-xs text-fg-muted">
            suggéré · conf. {Math.round(analysis.suggested_decision.confidence * 100)}%
          </span>
        )}
```

Important : retirer `defaultValue=""` des `<select>` préremplis (`decision_column`, `favorable_value`, `protected_attribute`, `ground_truth_column`) — laisser react-hook-form piloter la valeur via `setValue`. Garder l'option `<option value="" disabled>—</option>` comme placeholder. (RHF + `register` gère la valeur ; `defaultValue` entrerait en conflit avec `setValue`.)

- [ ] **Step 4 : Lancer → succès**

Run : `pnpm vitest run components/audits/wizard/unified/__tests__/step3-prefill.test.tsx`
Expected : PASS (2 tests).

- [ ] **Step 5 : Gates web + commit**

Run : `pnpm tsc --noEmit` ; `pnpm eslint components/audits/wizard/unified/Step3Config.tsx` (Expected : clean).
```bash
git add apps/web/components/audits/wizard/unified/Step3Config.tsx apps/web/components/audits/wizard/unified/__tests__/step3-prefill.test.tsx
git commit -m "feat(web): prefill audit config step from dataset analysis (editable, anti-clobber)"
```

---

## Task 10 : Résumé d'analyse enrichi (phase 2)

**Files:**
- Modify: `apps/web/components/audits/wizard/unified/Step2Source.tsx` (bloc résultat ~165-185)

- [ ] **Step 1 : Écrire le test (échouera)**

Ajouter `apps/web/components/audits/wizard/unified/__tests__/step2-summary.test.tsx` :

```tsx
import { render, screen } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import { describe, expect, it } from 'vitest';

import { Step2Source } from '@/components/audits/wizard/unified/Step2Source';
import type { DatasetAnalysisOut, DatasetOut } from '@/lib/api/audits';

const dataset = { id: 'd', columns: ['sexe', 'embauche'] } as unknown as DatasetOut;
const analysis = {
  columns: [],
  suggested_decision: { column: 'embauche', confidence: 0.8, reason: 'r', favorable_value: 'oui' },
  suggested_protected: { column: 'sexe', confidence: 0.7, reason: 'r' },
  protected_candidates: [
    { column: 'sexe', confidence: 0.7, reason: 'r' },
    { column: 'age', confidence: 0.4, reason: 'r' },
  ],
  suggested_ground_truth: null,
} as DatasetAnalysisOut;

function Harness() {
  const methods = useForm({ defaultValues: {} as never });
  return (
    <FormProvider {...methods}>
      <Step2Source dataset={dataset} analysis={analysis} onUpload={async () => {}} busy={false} analysisError={null} />
    </FormProvider>
  );
}

describe('Step2 analysis summary', () => {
  it('shows favorable value and other-candidates count', () => {
    render(<Harness />);
    expect(screen.getByText(/oui/)).toBeInTheDocument();
    expect(screen.getByText(/1 autre/)).toBeInTheDocument(); // 2 candidates -> "+1 autre"
  });
});
```

(Adapter les props de `Step2Source` à sa vraie signature, visible en tête du composant.)

- [ ] **Step 2 : Lancer → échec**

Run : `pnpm vitest run components/audits/wizard/unified/__tests__/step2-summary.test.tsx`
Expected : FAIL (texte absent).

- [ ] **Step 3 : Implémenter**

Dans le bloc résultat de `Step2Source.tsx`, après les deux lignes existantes (décision/protégé), ajouter :
```tsx
        {analysis.suggested_decision?.favorable_value != null && (
          <p className="text-sm text-fg-secondary">
            Valeur favorable : <strong>{String(analysis.suggested_decision.favorable_value)}</strong>
          </p>
        )}
        {(analysis.protected_candidates?.length ?? 0) > 1 && (
          <p className="text-xs text-fg-muted">
            +{(analysis.protected_candidates!.length - 1)} autre(s) attribut(s) candidat(s)
          </p>
        )}
        {analysis.suggested_ground_truth && (
          <p className="text-sm text-fg-secondary">
            Vérité-terrain détectée : <strong>{analysis.suggested_ground_truth.column}</strong>
          </p>
        )}
```

- [ ] **Step 4 : Lancer → succès + suite web**

Run : `pnpm vitest run components/audits/wizard/unified/` (Expected : PASS) ; `pnpm tsc --noEmit` ; `pnpm eslint components/audits/wizard/unified/Step2Source.tsx`.

- [ ] **Step 5 : Commit**

```bash
git add apps/web/components/audits/wizard/unified/Step2Source.tsx apps/web/components/audits/wizard/unified/__tests__/step2-summary.test.tsx
git commit -m "feat(web): richer phase-2 analysis summary (favorable value, other candidates, ground truth)"
```

---

## Vérification finale (avant PR)

- [ ] API : `$env:PYTHONUTF8='1'; .\.venv\Scripts\python.exe -m pytest -q` → tout vert
- [ ] API : `.\.venv\Scripts\python.exe -m ruff check app tests` + `.\.venv\Scripts\python.exe -m mypy app` → clean
- [ ] Web : `pnpm vitest run` + `pnpm tsc --noEmit` + `pnpm eslint .` → clean
- [ ] Smoke manuel (optionnel) : uploader `Data_test/m1-recrutement-biais.csv` dans le wizard → phase 2 montre décision=embauche/favorable=oui/protégé=sexe ; phase 3 préremplie et modifiable.
- [ ] Ouvrir la PR (base `main`, head `feat-auto-analysis-prefill`).
