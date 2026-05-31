# Recommandations d'audit — Design

**Date** : 2026-05-31
**Statut** : Brouillon — en attente de relecture utilisateur
**Auteur** : Franck F (via brainstorming Claude)

## 1. Contexte et motivation

Le rendu actuel des audits expose `InterpretationOut` avec 5 champs :
`narrative`, `ai_act_anchors`, `disclaimers`, `provider`, `model`. L'utilisateur
voit le verdict + les métriques + une explication narrative — mais aucune
action concrète à entreprendre. La feature ajoute une 4ᵉ liste structurée :
**recommandations actionnables prioritisées**, générées par le LLM en même
temps que l'interprétation, et restituées web + Excel + PDF.

**Pas dans le scope** : recommandations rétroactives sur les audits déjà
exécutés (no backfill), édition manuelle des recommandations par
l'utilisateur, suivi du statut « fait / en cours » par reco.

## 2. Décisions cadres (validées en brainstorming)

| Décision | Choix retenu | Alternatives écartées |
|---|---|---|
| Source des recos | LLM (Gemini avec fallback Mistral, comme l'interprétation existante) | Règles déterministes ; hybride |
| Structure | `{title, detail, priority}` objet | Liste de strings ; groupées par catégorie |
| Nombre par audit | 3-5 recos (focus, prioritisées) | 5-8 ; variable selon verdict |
| Restitution | Web + Excel + PDF | Web seul ; PDF seul |
| Backfill audits existants | Non — la section est cachée si `recommendations=[]` | Régénération massive |

## 3. Architecture

```
apps/api/
├── schemas/audit.py
│   RecommendationOut (NEW)
│     title: str
│     detail: str
│     priority: Literal["high", "medium", "low"]
│   InterpretationOut
│     + recommendations: list[RecommendationOut] = Field(default_factory=list)
│
├── interpretation/
│   ├── m1.py, m2.py, m3.py
│   │     fallback adapté : recommendations=[]
│   │     parse JSON LLM : filtre les entrées invalides, garde les valides
│   └── prompts/
│         m1_fr.md, m2_fr.md, m3_fr.md
│         + section consigne « recommandations » (bloc commun + add-on module)
│         + format JSON de sortie étendu
│
└── reporting/
    ├── excel.py    + feuille « Recommandations » (skip si liste vide)
    └── html.py     + section recommandations (skip si liste vide, HTML escape)

apps/web/
├── lib/api/audits.ts
│     RecommendationOut TS type
│     InterpretationOut + recommendations: RecommendationOut[]
│
├── components/audits/
│   └── Recommendations.tsx  [NEW]
│     items: RecommendationOut[] → ul de cards avec priority badge
│     Retourne null si items.length === 0
│
└── app/app/audits/[id]/page.tsx
      Composant Interpretation rend <Recommendations> entre narrative et disclaimers
```

**Principe d'isolation** : `Recommendations.tsx` reçoit `items` en prop, ignore l'audit. Le composant API `RecommendationOut` est typé strict (extra="forbid", priority Literal) côté Pydantic et côté TS.

**Persistance** : aucune migration DB. La colonne `audits.interpretation` est déjà JSONB et accepte le champ supplémentaire transparent.

## 4. Composants détaillés

### 4.1 Schemas — `apps/api/app/schemas/audit.py`

```python
from typing import Literal
from pydantic import Field

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

`Field(default_factory=list)` garantit que les audits déjà persistés (sans le
champ dans le JSONB) chargent avec `recommendations=[]` sans ValidationError.

### 4.2 Prompts LLM — `apps/api/app/interpretation/prompts/m{1,2,3}_fr.md`

Bloc commun ajouté aux consignes de chaque prompt :

```
- Termine en proposant 3 à 5 recommandations actionnables (PAS plus, PAS moins),
  prioritisées par impact réel :
  - chaque reco = un objet {title, detail, priority}
  - title = action courte (5-10 mots), à l'impératif (ex. « Re-collecter
    les données d'entraînement »)
  - detail = explication concrète en 1-2 phrases : pourquoi maintenant,
    quoi faire d'abord, sans jargon
  - priority ∈ {"high", "medium", "low"} :
    - "high" : action nécessaire pour répondre à un échec/risque AI Act
    - "medium" : amélioration recommandée mais pas bloquante
    - "low" : maintenance/veille
  - Si le verdict est PASS (pas d'écart significatif), garde 1-2 recos
    « maintien de la veille » (priority="low") — ne pas inventer de
    problème.
  - Si FAIL/WARN, privilégier les actions concrètes : qualité de données,
    monitoring, documentation, choix de métrique.
- N'invente JAMAIS un défaut qui n'est pas dans les métriques fournies.
```

Format JSON de sortie étendu (ligne finale du prompt) :

```
Réponds UNIQUEMENT par un objet JSON valide, sans texte autour :
{{"narrative": "<texte FR>", "ai_act_anchors": ["..."], "disclaimers": ["..."],
  "recommendations": [{{"title": "...", "detail": "...", "priority": "high"}}]}}
```

Add-on module-spécifique :

- **M1** : « Pour M1, prioriser les recos sur la collecte de données (groupe sous-représenté), le choix de la métrique de fairness (DI vs EO vs EOdds — chaque choix est un choix normatif), et le monitoring post-déploiement. »
- **M2** : « Pour M2, prioriser les recos sur la caractérisation des features qui distinguent les clusters déviants, le contrôle des proxys de variables sensibles, et la mise en place d'alertes sur la déviation par cluster en production. »
- **M3** : « Pour M3, prioriser les recos sur l'élargissement du prompt bank vers d'autres catégories d'attributs protégés, la mise en place d'un monitoring continu (les comportements LLM dérivent dans le temps), et la documentation des refus structurés (AI Act art. 13). »

### 4.3 Parse + fallback — `apps/api/app/interpretation/m{1,2,3}.py`

Pseudo-logique après l'appel LLM :

```python
def _parse_llm_response(raw: str, provider: str, model: str) -> InterpretationOut:
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return _fallback(provider, model)

    raw_recs = data.get("recommendations", [])
    if not isinstance(raw_recs, list):
        raw_recs = []

    valid_recs: list[RecommendationOut] = []
    for entry in raw_recs:
        if not isinstance(entry, dict):
            continue
        try:
            valid_recs.append(RecommendationOut.model_validate(entry))
        except ValidationError:
            continue  # drop invalid entry, keep going

    try:
        return InterpretationOut(
            narrative=str(data.get("narrative", "")),
            ai_act_anchors=list(data.get("ai_act_anchors", [])),
            disclaimers=list(data.get("disclaimers", [])),
            provider=provider,
            model=model,
            recommendations=valid_recs,
        )
    except ValidationError:
        return _fallback(provider, model)


def _fallback(provider: str, model: str) -> InterpretationOut:
    return InterpretationOut(
        narrative="Interprétation indisponible (service LLM injoignable).",
        ai_act_anchors=[],
        disclaimers=["Cet audit est une aide à l'analyse, pas un verdict de conformité."],
        provider=provider,
        model=model,
        recommendations=[],
    )
```

Ce pattern de parse défensif est appliqué à m1.py, m2.py, m3.py. Chaque
module peut avoir sa propre logique d'add-on prompt (lecture du fichier .md
correspondant + injection des métriques) mais le parser final est identique
— extraction commune dans un helper si pertinent.

### 4.4 Reporting Excel — `apps/api/app/reporting/excel.py`

Nouvelle feuille « Recommandations » insérée après la feuille « Interprétation ».

```python
_PRIORITY_LABEL_FR = {
    "high": "Action prioritaire",
    "medium": "À planifier",
    "low": "Maintien / veille",
}

def _write_recommendations_sheet(wb: Workbook, recs: list[RecommendationOut]) -> None:
    if not recs:
        return  # cohérence avec UI : pas de feuille vide
    ws = wb.create_sheet("Recommandations")
    ws.append(["#", "Priorité", "Action", "Détail"])
    _bold_header_row(ws)
    for idx, rec in enumerate(recs, start=1):
        ws.append([idx, _PRIORITY_LABEL_FR[rec.priority], rec.title, rec.detail])
    _autofit_columns(ws)
```

### 4.5 Reporting HTML/PDF — `apps/api/app/reporting/html.py`

Section ajoutée entre la narrative et les disclaimers :

```python
def _render_recommendations(recs: list[RecommendationOut]) -> str:
    if not recs:
        return ""
    items = "".join(
        f'<li class="rec rec-{escape(r.priority)}">'
        f'<div class="rec-head">'
        f'<span class="rec-title">{escape(r.title)}</span>'
        f'<span class="rec-prio">{escape(_PRIORITY_LABEL_FR[r.priority])}</span>'
        f'</div>'
        f'<p class="rec-detail">{escape(r.detail)}</p>'
        f'</li>'
        for r in recs
    )
    return (
        '<section class="recommendations">'
        '<h3>Recommandations</h3>'
        f'<ul>{items}</ul>'
        '</section>'
    )
```

CSS : ajout minimal au template HTML (border + padding par carte, couleurs
priority assorties au reste du rapport, compatible noir-et-blanc / Puppeteer).
Tous les inputs LLM passent par `html.escape` (anti-XSS), même règle qu'existant.

### 4.6 Web UI — `apps/web/components/audits/Recommendations.tsx`

```tsx
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

### 4.7 Types TS — `apps/web/lib/api/audits.ts`

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
  recommendations: RecommendationOut[];   // <-- ajouté
};
```

### 4.8 Intégration audit result page — `apps/web/app/app/audits/[id]/page.tsx`

Mini-diff dans le composant `Interpretation` (ou équivalent qui rend le bloc
d'interprétation) :

```tsx
<p className="…">{interpretation.narrative}</p>
+ <Recommendations items={interpretation.recommendations} />
<ul className="…">{interpretation.disclaimers.map(...)}</ul>
```

Le composant `Recommendations` se charge de cacher la section si la liste est
vide — pas besoin de garde côté page.

## 5. Gestion des erreurs

| Situation | Comportement |
|---|---|
| Gemini retourne JSON valide avec recos bien formées | Affichage normal |
| Gemini retourne JSON sans `recommendations` | `Field(default_factory=list)` → `[]` → section UI cachée |
| Gemini retourne `recommendations` non-liste (ex: string) | Filtrage : `if not isinstance(raw_recs, list): raw_recs = []` |
| Entrée individuelle invalide (priority bizarre, champ manquant) | `ValidationError` → entrée droppée, on garde les valides |
| LLM provider absent | Fallback existant → `recommendations=[]` |
| Audit existant pré-feature | JSONB chargé → champ absent → `default_factory` → `[]` |

**Principe** : la section recommandations est strictement additive et jamais
bloquante. L'audit reste valide, le rapport reste téléchargeable même si le
LLM est complètement défaillant.

## 6. Tests

### Backend (pytest)
Baseline post-SP3-B ≈ 109 vitest + côté API ≈ ?. Cible API : +8-10 tests :

- `tests/api/test_schemas_audit.py` (append) :
  - `test_recommendation_out_priority_literal` — priority hors {high,medium,low} → ValidationError
  - `test_recommendation_out_extra_forbid` — champ inconnu → ValidationError
  - `test_recommendation_out_title_detail_length_bounds` — title vide → erreur ; >200 chars → erreur
  - `test_interpretation_out_default_recommendations_empty` — JSON sans le champ → liste vide

- `tests/api/test_interpret_m1.py` (et m2, m3 — pattern identique) :
  - `test_recommendations_parsed_from_valid_json` — 3 recos valides retournées
  - `test_recommendations_dropped_when_malformed_entry` — 1/3 invalide → 2 retournées, pas d'erreur
  - `test_recommendations_empty_when_field_absent_from_llm` — clé absente → []

- `tests/api/test_excel_report.py` (append) :
  - `test_excel_includes_recommendations_sheet_when_present`
  - `test_excel_omits_recommendations_sheet_when_empty`

- `tests/api/test_report_html.py` (append) :
  - `test_html_includes_recommendations_section_when_present`
  - `test_html_escapes_recommendation_xss` — titre avec `<script>` → `&lt;script&gt;`

### Frontend (vitest)
Baseline post-SP3-B = 109. Cible : ~115 :

- `apps/web/__tests__/recommendations.test.tsx` (NEW) :
  - `renders nothing when items is empty` — `container.firstChild === null`
  - `renders all items with title + detail`
  - `applies high-priority red styling, medium warn, low muted`

- `apps/web/__tests__/audit-result-page.test.tsx` (append) :
  - `M1 result page renders Recommendations section when interpretation has 3 recos`

### E2E (Playwright)
Pas de nouveau test dédié. La suite existante traverse la result page —
toute régression visuelle sera captée par les screenshots existants si jamais
on en ajoute (hors scope).

**Régression** : tous les tests existants doivent rester verts. Backward-compat
critique : un audit pré-feature (interpretation JSONB sans `recommendations`)
DOIT continuer à charger sans erreur de validation.

## 7. Découpage en sous-projets

Une seule unité d'implémentation cohérente — pas de découpage. ~10 tâches
TDD bite-size attendues :

1. `RecommendationOut` schema + `InterpretationOut` + tests schema
2. Parser défensif (commun ou par module) + tests parse
3. Prompt M1 mis à jour + test interpret_m1
4. Prompt M2 mis à jour + test interpret_m2
5. Prompt M3 mis à jour + test interpret_m3
6. Excel sheet + tests
7. HTML section + tests (avec XSS escape)
8. TS types `RecommendationOut` + `InterpretationOut.recommendations`
9. Composant `Recommendations.tsx` + tests vitest
10. Intégration dans `audits/[id]/page.tsx` + test audit-result-page
11. Final gate + PR

## 8. Risques et mitigations

| Risque | Mitigation |
|---|---|
| LLM produit recos hors-cible (« inventer un défaut ») | Consigne explicite « N'invente JAMAIS un défaut qui n'est pas dans les métriques fournies » dans le prompt + add-on module-spécifique |
| LLM omet le champ `recommendations` | `default_factory=list` + parse défensif → audit reste valide |
| LLM produit > 5 recos | Consigne stricte « PAS plus, PAS moins » dans le prompt. Si dérive, on tronque à 5 dans le parser (option à valider en plan) |
| Backward-compat audits existants | `default_factory=list` côté Pydantic. Audits anciens chargent sans erreur, section UI cachée. Pas de migration. |
| XSS via reco LLM dans le PDF | `html.escape()` systématique côté `_render_recommendations` (même règle qu'existant pour `narrative`/`disclaimers`) |
| Coût LLM augmenté | Marginal : on étend le prompt existant, pas un nouvel appel. Le LLM produit ~10-15% de tokens en plus → ordre de magnitude négligeable. |

## 9. Principes produit respectés

1. **Détection ≠ verdict** : les recos sont des « suggestions », pas des actions automatisées.
2. **Pas de promesse réglementaire absolue** : disclaimer existant reste intact ; les recos sont prudentes par consigne LLM.
3. **Minimisation des données** : aucun nouveau stockage (JSONB existant).
4. **Pédagogie d'abord** : les recos sont conçues pour l'utilisateur non-spécialiste (priority avec label FR, detail concret).
5. **Souveraineté** : aucun appel externe ajouté. Calcul = LLM existant (Gemini Frankfurt).

## 10. Hors scope explicite

- Backfill des audits existants (régénération massive)
- Édition manuelle des recos par l'utilisateur
- Suivi du statut « fait / en cours / abandonnée » par reco
- Notifications / rappels (« vous avez 3 actions prioritaires non traitées »)
- A/B testing de variantes de prompt
