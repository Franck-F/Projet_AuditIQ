from __future__ import annotations

import datetime
import uuid
from typing import Any, Literal

from pydantic import AnyHttpUrl, BaseModel, ConfigDict, Field, model_validator

Verdict = Literal["pass", "warn", "fail"]
# Secteur d'usage déclaré dans le wizard (contexte AI Act du déployeur).
Sector = Literal[
    "hr", "credit", "insurance", "health", "education", "public_services",
    "justice", "housing", "marketing", "content_moderation", "other",
]


class M2ConfigIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    features: list[str] | None = None
    k: int = 5
    deviation_pp: float = 20.0
    chi2_alpha: float = 0.05
    random_state: int = 42


class TargetIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    url: str
    method: str = "POST"
    headers: dict[str, str] = {}
    body_template: str
    response_path: str


class AuditCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    dataset_id: uuid.UUID | None = None
    title: str
    module: Literal["M1", "M2", "M3"] = "M1"
    protected_attribute: str | None = None
    decision_column: str | None = None
    favorable_value: str | None = None
    privileged_value: str | None = None
    ground_truth_column: str | None = None
    secondary_protected_attribute: str | None = None
    secondary_privileged_value: str | None = None
    protected_attributes: list[str] | None = None
    config: M2ConfigIn | None = None
    target: TargetIn | None = None
    lang: str = "fr"
    # Secteur d'usage (contexte AI Act du déployeur) — additif, optionnel.
    # Contextualise les recommandations et les références légales. Absent →
    # secteur générique « other ». Accepté pour les trois modules.
    sector: Sector | None = None

    @model_validator(mode="after")
    def _per_module(self) -> AuditCreate:
        if self.module == "M1":
            if self.dataset_id is None:
                raise ValueError("module M1 : 'dataset_id' est requis.")
            # At least one of protected_attribute or protected_attributes required
            if not self.protected_attribute and not self.protected_attributes:
                raise ValueError(
                    "module M1 : 'protected_attribute' est requis."
                )
            if not self.decision_column:
                raise ValueError(
                    "module M1 : 'decision_column' est requis."
                )
            if not self.favorable_value:
                raise ValueError(
                    "module M1 : 'favorable_value' est requis."
                )
            if self.config is not None:
                raise ValueError("module M1 : 'config' n'est pas accepté.")
            if self.ground_truth_column is not None and (
                self.ground_truth_column == self.decision_column
                or self.ground_truth_column == self.protected_attribute
            ):
                raise ValueError(
                    "module M1 : 'ground_truth_column' doit différer des "
                    "colonnes décision et attribut protégé."
                )
            if self.secondary_protected_attribute is not None and (
                self.secondary_protected_attribute == self.protected_attribute
                or self.secondary_protected_attribute == self.decision_column
                or self.secondary_protected_attribute == self.ground_truth_column
            ):
                raise ValueError(
                    "module M1 : 'secondary_protected_attribute' doit différer "
                    "de l'attribut protégé, de la colonne décision et de la "
                    "colonne vérité-terrain."
                )
            if (
                self.protected_attributes
                and self.secondary_protected_attribute is not None
                and self.secondary_protected_attribute not in self.protected_attributes
            ):
                raise ValueError(
                    "module M1 : ne combinez pas 'secondary_protected_attribute' "
                    "avec 'protected_attributes'."
                )
            if self.protected_attributes is not None:
                attrs = self.protected_attributes
                if not (1 <= len(attrs) <= 4):
                    raise ValueError(
                        "module M1 : 'protected_attributes' doit contenir "
                        "entre 1 et 4 attributs."
                    )
                if len(set(attrs)) != len(attrs):
                    raise ValueError(
                        "module M1 : 'protected_attributes' doit contenir "
                        "des attributs distincts."
                    )
                dec = self.decision_column
                gt = self.ground_truth_column
                for a in attrs:
                    if a == dec or (gt is not None and a == gt):
                        raise ValueError(
                            f"module M1 : l'attribut protégé « {a} » doit "
                            f"différer des colonnes décision et vérité-terrain."
                        )
        elif self.module == "M2":
            if self.dataset_id is None:
                raise ValueError("module M2 : 'dataset_id' est requis.")
            if not self.decision_column:
                raise ValueError(
                    "module M2 : 'decision_column' est requis."
                )
            if not self.favorable_value:
                raise ValueError(
                    "module M2 : 'favorable_value' est requis."
                )
            if self.protected_attribute is not None:
                raise ValueError(
                    "module M2 : 'protected_attribute' ne s'applique pas "
                    "(détection non supervisée)."
                )
            if self.privileged_value is not None:
                raise ValueError(
                    "module M2 : 'privileged_value' ne s'applique pas."
                )
            if self.ground_truth_column is not None:
                raise ValueError(
                    "module M2 : 'ground_truth_column' ne s'applique pas "
                    "(M1 uniquement)."
                )
            if self.secondary_protected_attribute is not None:
                raise ValueError(
                    "module M2 : 'secondary_protected_attribute' ne "
                    "s'applique pas (M1 uniquement)."
                )
            if self.secondary_privileged_value is not None:
                raise ValueError(
                    "module M2 : 'secondary_privileged_value' ne "
                    "s'applique pas (M1 uniquement)."
                )
            if self.protected_attributes is not None:
                raise ValueError(
                    "module M2 : 'protected_attributes' ne "
                    "s'applique pas (M1 uniquement)."
                )
        elif self.module == "M3":
            if self.target is None:
                raise ValueError("module M3 : 'target' est requis.")
            if (
                self.protected_attribute is not None
                or self.decision_column is not None
                or self.favorable_value is not None
                or self.privileged_value is not None
                or self.ground_truth_column is not None
                or self.secondary_protected_attribute is not None
                or self.secondary_privileged_value is not None
                or self.protected_attributes is not None
                or self.config is not None
            ):
                raise ValueError(
                    "module M3 : 'protected_attribute'/'decision_column'/"
                    "'favorable_value'/'privileged_value'/'ground_truth_column'/"
                    "'secondary_protected_attribute'/'secondary_privileged_value'/"
                    "'protected_attributes'/'config' ne s'appliquent pas."
                )
        return self


class GroupStatOut(BaseModel):
    model_config = ConfigDict(extra="forbid")

    value: str
    n: int
    favorable: int
    selection_rate: float
    disparate_impact: float
    tpr: float | None = None
    fpr: float | None = None
    fnr: float | None = None
    accuracy: float | None = None
    precision: float | None = None


class IntersectionalCellOut(BaseModel):
    model_config = ConfigDict(extra="forbid")

    primary_value: str
    secondary_value: str
    n: int
    favorable: int
    selection_rate: float
    disparate_impact: float
    verdict: Verdict
    tpr: float | None = None
    fpr: float | None = None


class IntersectionalOut(BaseModel):
    model_config = ConfigDict(extra="forbid")

    cells: list[IntersectionalCellOut]
    reference_primary: str
    reference_secondary: str
    worst_primary: str
    worst_secondary: str
    disparate_impact: float
    demographic_parity_diff: float
    verdict: Verdict
    risk_score: int
    marginal_di: list[float]
    equal_opportunity_diff: float | None = None
    equalized_odds_diff: float | None = None
    demographic_parity_verdict: Verdict | None = None
    equal_opportunity_verdict: Verdict | None = None
    equalized_odds_verdict: Verdict | None = None
    warnings: list[str] = []
    reason: str | None = None
    primary_attribute: str = ""
    secondary_attribute: str = ""
    demographic_parity_ratio: float = 1.0
    equal_opportunity_ratio: float | None = None
    equalized_odds_ratio: float | None = None


class MarginalOut(BaseModel):
    model_config = ConfigDict(extra="forbid")

    attribute: str
    groups: list[GroupStatOut]
    reference_value: str
    disparate_impact: float
    demographic_parity_diff: float
    worst_group: str
    verdict: Verdict
    risk_score: int
    equal_opportunity_diff: float | None = None
    equalized_odds_diff: float | None = None
    demographic_parity_verdict: Verdict | None = None
    equal_opportunity_verdict: Verdict | None = None
    equalized_odds_verdict: Verdict | None = None
    truelabel_reason: str | None = None
    warnings: list[str] = []
    demographic_parity_ratio: float = 1.0
    equal_opportunity_ratio: float | None = None
    equalized_odds_ratio: float | None = None


class M1MetricsOut(BaseModel):
    model_config = ConfigDict(extra="forbid")

    groups: list[GroupStatOut]
    reference_value: str
    disparate_impact: float
    demographic_parity_diff: float
    worst_group: str
    verdict: Verdict
    risk_score: int
    warnings: list[str]
    equal_opportunity_diff: float | None = None
    equalized_odds_diff: float | None = None
    demographic_parity_verdict: Verdict | None = None
    equal_opportunity_verdict: Verdict | None = None
    equalized_odds_verdict: Verdict | None = None
    truelabel_reason: str | None = None
    marginals: list[MarginalOut] = []
    pairwise: list[IntersectionalOut] = []


class FeatureContributionOut(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str
    std_diff: float
    direction: str


class ClusterStatOut(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: int
    n: int
    positive_rate: float
    deviation_pp: float
    is_deviant: bool
    top_features: list[FeatureContributionOut]


class M2MetricsOut(BaseModel):
    model_config = ConfigDict(extra="forbid")

    n: int
    k: int
    global_positive_rate: float
    chi2: float
    p_value: float
    dof: int
    clusters: list[ClusterStatOut]
    deviant_cluster_ids: list[int]
    verdict: Verdict
    risk_score: int
    warnings: list[str]


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


# Persona « déployeur » (AI Act) : l'utilisateur d'AuditIQ n'est pas le
# fournisseur du modèle ; il UTILISE un outil tiers. Les recommandations sont
# donc des actions de déployeur (documenter, superviser, escalader, dialoguer
# avec l'éditeur…), jamais des actions de fournisseur (réentraîner, recalibrer).
RecommendationCategory = Literal[
    "documentation",
    "supervision_humaine",
    "relation_fournisseur",
    "usage_outil",
    "correction_aval",
    "conformite",
    "surveillance",
    "escalade",
]
RecommendationOwner = Literal[
    "RH", "DPO", "Juridique", "Achats", "Direction"
]
RecommendationHorizon = Literal["immediat", "court_terme", "continu"]

# Libellés FR des catégories — contrat partagé avec le web et les rapports.
RECOMMENDATION_CATEGORY_LABELS: dict[str, str] = {
    "documentation": "Documenter & tracer",
    "supervision_humaine": "Supervision humaine",
    "relation_fournisseur": "Relation fournisseur",
    "usage_outil": "Usage de l'outil",
    "correction_aval": "Correction en aval",
    "conformite": "Conformité réglementaire",
    "surveillance": "Surveillance & re-test",
    "escalade": "Escalade",
}

# Mapping back-compat priorité entière (1=haute) ↔ littéral historique.
_PRIORITY_INT_TO_LITERAL: dict[int, Literal["high", "medium", "low"]] = {
    1: "high", 2: "medium", 3: "low",
}
_PRIORITY_LITERAL_TO_INT: dict[str, int] = {
    "high": 1, "medium": 2, "low": 3,
}


class RecommendationOut(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str = Field(min_length=1, max_length=200)
    # `detail` reste le « pourquoi » destiné au lecteur (= rationale). Conservé
    # pour la rétro-compatibilité du web et des rapports existants.
    detail: str = Field(min_length=1, max_length=1000)
    # `priority` littéral historique (high/medium/low) — dérivé de la gradation
    # entière ci-dessous. Conservé pour la rétro-compatibilité du web. La valeur
    # par défaut est resynchronisée depuis `priority_level` par le validateur.
    priority: Literal["high", "medium", "low"] = "medium"

    # --- Champs structurés du moteur déployeur (additifs) ---
    id: str = ""
    rationale: str = ""
    """Le « pourquoi », rattaché au constat précis (attribut, groupe lésé,
    écart chiffré). Égal à `detail` ; champ nommé pour le nouveau contrat."""
    category: RecommendationCategory = "documentation"
    priority_level: int = Field(default=2, ge=1, le=3)
    """1 = haute, 2 = moyenne, 3 = basse. Vraie gradation par sévérité."""
    owner: RecommendationOwner = "Direction"
    horizon: RecommendationHorizon = "court_terme"
    legal_ref: str | None = None
    steps: list[str] = Field(default_factory=list)

    @model_validator(mode="before")
    @classmethod
    def _normalize_legacy_inbound(cls, data: object) -> object:
        # Entrées legacy (LLM historique) ne fournissent que `priority` littéral
        # sans `priority_level`. On dérive l'entier depuis le littéral.
        if isinstance(data, dict) and "priority_level" not in data:
            prio = data.get("priority")
            if isinstance(prio, str) and prio in _PRIORITY_LITERAL_TO_INT:
                data = {**data, "priority_level": _PRIORITY_LITERAL_TO_INT[prio]}
        return data

    @model_validator(mode="after")
    def _sync_back_compat(self) -> RecommendationOut:
        # `rationale` et `detail` sont deux noms du même texte : si l'un manque,
        # on le dérive de l'autre (entrées LLM legacy ne fournissent que detail).
        if not self.rationale and self.detail:
            object.__setattr__(self, "rationale", self.detail)
        elif self.rationale and not self.detail:
            object.__setattr__(self, "detail", self.rationale)
        # `priority` littéral dérivé de `priority_level` entier (source de vérité).
        object.__setattr__(
            self, "priority", _PRIORITY_INT_TO_LITERAL[self.priority_level]
        )
        return self


class InterpretationOut(BaseModel):
    model_config = ConfigDict(extra="forbid")

    narrative: str
    ai_act_anchors: list[str]
    disclaimers: list[str]
    provider: str
    model: str
    recommendations: list[RecommendationOut] = Field(default_factory=list)
    degraded: bool = False
    """True when the LLM path was attempted but failed (auth, network, quota,
    or unparseable output) and we fell back to the deterministic narrative.
    False on the LLM success path and on the expected no-provider fallback."""


class AuditOut(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="forbid")

    id: uuid.UUID
    code: str | None = None
    title: str
    status: str
    module: str
    dataset_id: uuid.UUID | None = None
    protected_attribute: str | None = None
    decision_column: str | None = None
    favorable_value: str | None = None
    privileged_value: str | None = None
    created_at: datetime.datetime
    completed_at: datetime.datetime | None = None
    archived_at: datetime.datetime | None = None
    error: str | None = None
    metrics: M1MetricsOut | M2MetricsOut | M3MetricsOut | None = None
    interpretation: InterpretationOut | None = None
    pre_check: list[str] = []
    config: dict[str, object] | None = None


class AuditArchiveIn(BaseModel):
    """Corps de PATCH /audits/{id} : archive (true) ou désarchive (false)."""

    model_config = ConfigDict(extra="forbid")

    archived: bool


class AuditListItem(BaseModel):
    """Ligne du tableau « Mes audits » / « Archivés » (liste org-scopée).

    Reprend la forme exposée par le dashboard (« recent_audits ») pour la
    cohérence côté web, en ajoutant ``status`` et ``archived_at`` utiles à la
    distinction actifs/archivés.
    """

    model_config = ConfigDict(from_attributes=True, extra="forbid")

    id: uuid.UUID
    code: str | None
    title: str
    module: str
    status: str
    verdict: Verdict | None
    risk_score: int | None
    created_at: datetime.datetime
    archived_at: datetime.datetime | None


class M3TestConnectionIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    target: TargetIn
    test_prompt: str = "Bonjour, peux-tu te présenter brièvement ?"


class M3TestConnectionOut(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: Literal["ok", "error"]
    elapsed_ms: int
    request_sent: dict[str, Any] | None = None
    response_raw: Any = None
    extracted_value: str | None = None
    error: str | None = None


class M3ValidateUrlIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    url: AnyHttpUrl


class M3ValidateUrlOut(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: Literal["ok"]
