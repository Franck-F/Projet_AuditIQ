"""Moteur de recommandations DÉTERMINISTE — persona « déployeur » (AI Act).

L'utilisateur d'AuditIQ n'est PAS le fournisseur du système d'IA : c'est un
**déployeur** (RH, conformité, achats…) qui UTILISE un outil tiers (tri de CV,
scoring crédit, chatbot…). Il ne possède ni le modèle ni les données
d'entraînement. Les recommandations produites ici sont donc EXCLUSIVEMENT des
actions de déployeur (documenter, superviser, escalader, dialoguer avec
l'éditeur, corriger en aval), JAMAIS des actions de fournisseur (réentraîner,
recalibrer, modifier les données d'entraînement ou les hyperparamètres).

Le catalogue choisit QUELLES recommandations apparaissent en fonction de
``(sévérité du verdict × secteur × module)`` et les ordonne par priorité. Le
LLM ne fait que RÉDIGER/contextualiser le texte sous contrainte de cette liste
blanche ; ce module reste un fallback déterministe complet, testable et
hors-ligne.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal

from app.schemas.audit import RecommendationOut

Sector = Literal[
    "hr", "credit", "insurance", "health", "education", "public_services",
    "justice", "housing", "marketing", "content_moderation", "other",
]
Module = Literal["M1", "M2", "M3"]
Verdict = Literal["pass", "warn", "fail"]

# Liste blanche des verbes d'action AUTORISÉS (registre déployeur). Toute
# recommandation produite doit relever de ce registre.
#
# INTERDIT (registre fournisseur) — ne JAMAIS produire : « réentraîner »,
# « recalibrer », « ré-entraîner le modèle », « modifier les données
# d'entraînement », « ajuster les hyperparamètres », « débiaiser l'algorithme ».

# Termes de fournisseur bannis — utilisés par les tests pour garantir l'absence
# d'actions de fournisseur dans le catalogue.
FORBIDDEN_PROVIDER_TERMS: tuple[str, ...] = (
    "réentraîn", "reentrain", "ré-entraîn", "recalibr", "recalibrer",
    "données d'entraînement", "donnees d'entrainement", "jeu d'entraînement",
    "hyperparamètre", "hyperparametre", "débiais", "debiais",
    "modifier le modèle", "modifier l'algorithme", "corriger le modèle",
    "améliorer les données d'entraînement",
)


def sector_label(sector: Sector) -> str:
    return {
        "hr": "ressources humaines / recrutement",
        "credit": "crédit / scoring financier",
        "insurance": "assurance",
        "health": "santé / médico-social",
        "education": "éducation / formation",
        "public_services": "services publics / accès aux droits",
        "justice": "justice / sécurité",
        "housing": "logement / immobilier",
        "marketing": "marketing / ciblage publicitaire",
        "content_moderation": "modération de contenu",
        "other": "usage à fort enjeu",
    }.get(sector, "usage à fort enjeu")


def _info_legal_ref(sector: Sector) -> str:
    """Référence légale « information des personnes » contextualisée secteur."""
    return {
        "hr": "AI Act Art. 26.7 ; Code du travail (information du CSE) ; "
        "Défenseur des droits",
        "credit": "AI Act Art. 26.7 ; RGPD Art. 22 (décision automatisée) ; "
        "Code de la consommation",
        "insurance": "AI Act Art. 26.7 ; Code des assurances ; ACPR",
        "health": "AI Act Art. 26.7 ; Code de la santé publique ; "
        "CNIL (données de santé)",
        "education": "AI Act Art. 26.7 ; Code de l'éducation ; RGPD",
        "public_services": "AI Act Art. 26.7 ; Défenseur des droits ; RGPD",
        "justice": "AI Act Art. 26.7 ; garanties procédurales ; "
        "Défenseur des droits",
        "housing": "AI Act Art. 26.7 ; loi 89-462 ; Défenseur des droits",
        "marketing": "AI Act Art. 50 (transparence) ; RGPD ; CNIL",
        "content_moderation": "DSA (règlement 2022/2065) ; AI Act Art. 50",
        "other": "AI Act Art. 26.7 ; principe de non-discrimination",
    }.get(sector, "AI Act Art. 26.7")


def _supplier_legal_ref(sector: Sector) -> str:
    return {
        "hr": "AI Act Art. 26 (obligations du déployeur) ; Annexe III (RH = "
        "haut risque)",
        "credit": "AI Act Art. 26 ; ACPR (gouvernance des modèles)",
        "insurance": "AI Act Art. 26 ; ACPR ; Code des assurances",
        "health": "AI Act Art. 26 ; Annexe III (le cas échéant) ; "
        "HAS/ANSM selon usage",
        "education": "AI Act Art. 26 ; Annexe III (accès/évaluation = "
        "haut risque)",
        "public_services": "AI Act Art. 26 ; Annexe III (accès aux "
        "prestations = haut risque)",
        "justice": "AI Act Art. 26 ; Annexe III (justice/sécurité = "
        "haut risque)",
        "housing": "AI Act Art. 26 ; loi anti-discrimination 2008-496",
        "marketing": "AI Act Art. 26 ; RGPD (profilage)",
        "content_moderation": "AI Act Art. 26 ; DSA (obligations des "
        "plateformes)",
        "other": "AI Act Art. 26 (obligations du déployeur)",
    }.get(sector, "AI Act Art. 26")


@dataclass(frozen=True)
class Finding:
    """Constat factuel d'un audit, source du ``rationale`` (le « pourquoi »).

    Tous les champs sont optionnels : selon le module, certains ne sont pas
    disponibles (M2/M3 n'ont pas d'attribut protégé déclaré).
    """

    verdict: Verdict
    module: Module
    sector: Sector
    attribute: str | None = None
    worst_group: str | None = None
    reference_value: str | None = None
    metric_label: str | None = None
    gap_text: str | None = None
    risk_score: int | None = None
    extra: str | None = None

    def constat_phrase(self) -> str:
        """Phrase de constat réutilisée dans chaque rationale."""
        parts: list[str] = []
        if self.attribute:
            parts.append(f"l'attribut « {self.attribute} »")
        if self.worst_group:
            ref = (
                f" face à la référence « {self.reference_value} »"
                if self.reference_value
                else ""
            )
            parts.append(
                f"le groupe défavorisé « {self.worst_group} »{ref}"
            )
        if self.metric_label and self.gap_text:
            parts.append(f"{self.metric_label} : {self.gap_text}")
        elif self.gap_text:
            parts.append(self.gap_text)
        if self.extra:
            parts.append(self.extra)
        if not parts:
            return "le constat de l'audit"
        return " ; ".join(parts)


@dataclass(frozen=True)
class _RuleSpec:
    """Squelette déterministe d'une recommandation (avant rédaction LLM)."""

    id: str
    title: str
    category: str
    priority_level: int
    owner: str
    horizon: str
    legal_ref: str | None
    rationale_template: str
    steps: tuple[str, ...] = field(default_factory=tuple)

    def to_out(self, finding: Finding) -> RecommendationOut:
        rationale = self.rationale_template.format(
            constat=finding.constat_phrase(),
            secteur=sector_label(finding.sector),
        )
        return RecommendationOut(
            id=self.id,
            title=self.title,
            detail=rationale,
            rationale=rationale,
            priority=("high" if self.priority_level == 1
                      else "medium" if self.priority_level == 2 else "low"),
            category=self.category,  # type: ignore[arg-type]
            priority_level=self.priority_level,
            owner=self.owner,  # type: ignore[arg-type]
            horizon=self.horizon,  # type: ignore[arg-type]
            legal_ref=self.legal_ref,
            steps=list(self.steps),
        )


# Owner par défaut selon le secteur pour la supervision métier.
def _business_owner(sector: Sector) -> str:
    return {
        "hr": "RH",
        "credit": "Direction",
        "insurance": "Direction",
        "health": "Direction",
        "education": "Direction",
        "public_services": "Direction",
        "justice": "Juridique",
        "housing": "Direction",
        "marketing": "Direction",
        "content_moderation": "Direction",
        "other": "Direction",
    }.get(sector, "Direction")


def _doc_rule(
    finding: Finding, *, light: bool, priority_level: int = 1
) -> _RuleSpec:
    if light:
        return _RuleSpec(
            id="doc_light",
            title="Archiver ce rapport horodaté au registre de l'outil",
            category="documentation",
            priority_level=3,
            owner="DPO",
            horizon="continu",
            legal_ref="AI Act Art. 26 (journaux & traçabilité)",
            rationale_template=(
                "Même sans écart significatif, conserver ce rapport daté "
                "constitue une preuve de diligence sur {constat}, exploitable "
                "en cas de contrôle ou de réclamation."
            ),
            steps=(
                "Classer le rapport (PDF/Excel) dans le dossier de conformité "
                "de l'outil.",
                "Noter la date de l'audit et la version de l'outil testée.",
            ),
        )
    return _RuleSpec(
        id="doc_proof",
        title="Conserver ce rapport horodaté comme preuve de diligence",
        category="documentation",
        priority_level=priority_level,
        owner="DPO",
        horizon="immediat" if priority_level == 1 else "court_terme",
        legal_ref="AI Act Art. 26 (journaux & traçabilité du déployeur)",
        rationale_template=(
            "Le biais constaté ({constat}) doit être tracé : archiver ce "
            "rapport daté documente votre vigilance de déployeur et les "
            "mesures engagées, exploitable en cas de contrôle ou de litige."
        ),
        steps=(
            "Archiver le rapport (PDF/Excel) dans le dossier de conformité.",
            "Consigner la version de l'outil et la date du constat.",
            "Tenir un journal des mesures décidées à la suite de cet audit.",
        ),
    )


def _build_specs(finding: Finding) -> list[_RuleSpec]:
    """Sélectionne et ordonne les règles selon (sévérité × secteur × module)."""
    v = finding.verdict
    sector = finding.sector
    biz = _business_owner(sector)
    specs: list[_RuleSpec] = []

    if v == "fail":
        # 1) Documentation (preuve de diligence) — priorité 1.
        specs.append(_doc_rule(finding, light=False))
        # 2) Supervision humaine sur le groupe lésé — priorité 1.
        specs.append(_RuleSpec(
            id="human_review",
            title="Instaurer une revue humaine des décisions sur le groupe "
            "défavorisé",
            category="supervision_humaine",
            priority_level=1,
            owner=biz,
            horizon="immediat",
            legal_ref="AI Act Art. 14 (contrôle humain) & Art. 26",
            rationale_template=(
                "Le constat ({constat}) impose une supervision humaine "
                "effective : faire réexaminer par une personne qualifiée les "
                "décisions touchant le groupe lésé avant qu'elles ne "
                "produisent leurs effets."
            ),
            steps=(
                "Identifier les décisions concernant le groupe défavorisé.",
                "Désigner un·e responsable habilité·e à confirmer ou infirmer "
                "la décision de l'outil.",
                "Tracer chaque revue (qui, quand, décision finale).",
            ),
        ))
        # 3) Relation fournisseur — priorité 2.
        specs.append(_RuleSpec(
            id="supplier_report",
            title="Signaler le biais à l'éditeur et exiger sa documentation de "
            "conformité",
            category="relation_fournisseur",
            priority_level=2,
            owner="Achats",
            horizon="court_terme",
            legal_ref=_supplier_legal_ref(sector),
            rationale_template=(
                "En tant que déployeur, la correction du système relève de "
                "l'éditeur, pas de vous : remontez-lui formellement le constat "
                "({constat}) et réclamez sa documentation de conformité (notice "
                "AI Act, mesures de réduction des biais)."
            ),
            steps=(
                "Adresser un signalement écrit à l'éditeur avec ce rapport.",
                "Demander la notice d'utilisation et la documentation de "
                "conformité (AI Act Art. 13).",
                "Conserver la trace des échanges pour le dossier de diligence.",
            ),
        ))
        # 4) Usage de l'outil — priorité 2.
        specs.append(_RuleSpec(
            id="tool_downgrade",
            title="Repasser l'outil en aide à la décision, pas en décideur "
            "automatique",
            category="usage_outil",
            priority_level=2,
            owner=biz,
            horizon="immediat",
            legal_ref="AI Act Art. 14 (contrôle humain)",
            rationale_template=(
                "Tant que le biais persiste ({constat}), n'utilisez plus la "
                "sortie de l'outil comme décision finale : positionnez-la en "
                "simple aide à la décision soumise à validation humaine."
            ),
            steps=(
                "Désactiver toute automatisation de la décision finale.",
                "Documenter la décision humaine qui prévaut sur la sortie de "
                "l'outil.",
            ),
        ))
        # 5) Conformité — information des personnes concernées — priorité 2.
        specs.append(_RuleSpec(
            id="inform_subjects",
            title=(
                "Informer les candidats qu'un système d'IA intervient dans "
                "l'évaluation" if sector == "hr"
                else "Informer les personnes concernées de l'usage d'un "
                "système d'IA"
            ),
            category="conformite",
            priority_level=2,
            owner="Juridique",
            horizon="court_terme",
            legal_ref=_info_legal_ref(sector),
            rationale_template=(
                "Le déployeur d'un système à haut risque doit informer les "
                "personnes soumises à la décision ({constat}). "
                + ("En recrutement, informez aussi le CSE."
                   if sector == "hr" else "")
            ),
            steps=(
                "Ajouter une mention d'information dans le parcours concerné.",
                "Préciser les voies de recours / réexamen humain."
                + (" Informer le CSE." if sector == "hr" else ""),
            ),
        ))
        # 6) Escalade — uniquement si écart très fort.
        if finding.risk_score is not None and finding.risk_score >= 80:
            specs.append(_RuleSpec(
                id="escalation_suspend",
                title="Suspendre l'usage automatisé pour cette décision tant "
                "que le biais persiste",
                category="escalade",
                priority_level=1,
                owner="Direction",
                horizon="immediat",
                legal_ref="AI Act Art. 26.5 (suspension d'usage par le "
                "déployeur)",
                rationale_template=(
                    "L'écart est très marqué ({constat}) : par prudence, "
                    "suspendez l'usage automatisé de l'outil pour cette "
                    "décision et escaladez à la Direction et au DPO."
                ),
                steps=(
                    "Geler l'usage automatisé pour la décision concernée.",
                    "Escalader à la Direction, au DPO et au référent juridique.",
                ),
            ))
    elif v == "warn":
        specs.append(_doc_rule(finding, light=False, priority_level=2))
        specs.append(_RuleSpec(
            id="human_review_targeted",
            title="Mettre en place une revue humaine ciblée sur les décisions "
            "sensibles",
            category="supervision_humaine",
            priority_level=2,
            owner=biz,
            horizon="court_terme",
            legal_ref="AI Act Art. 14 (contrôle humain)",
            rationale_template=(
                "Le signal de vigilance ({constat}) justifie un contrôle "
                "humain ciblé : faire réexaminer un échantillon des décisions "
                "concernant le groupe potentiellement lésé."
            ),
            steps=(
                "Échantillonner les décisions sur le groupe à risque.",
                "Faire valider ces décisions par une personne qualifiée.",
            ),
        ))
        specs.append(_RuleSpec(
            id="investigate_supplier",
            title="Investiguer le signal et interroger l'éditeur de l'outil",
            category="relation_fournisseur",
            priority_level=2,
            owner="Achats",
            horizon="court_terme",
            legal_ref=_supplier_legal_ref(sector),
            rationale_template=(
                "Avant de conclure, approfondissez le constat ({constat}) et "
                "demandez à l'éditeur des éléments sur le comportement de "
                "l'outil pour ce profil."
            ),
            steps=(
                "Vérifier la représentativité du jeu de décisions audité.",
                "Solliciter l'éditeur sur le constat observé.",
            ),
        ))
        specs.append(_RuleSpec(
            id="retest_warn",
            title="Planifier un nouvel audit de contrôle à court terme",
            category="surveillance",
            priority_level=2,
            owner="DPO",
            horizon="court_terme",
            legal_ref="AI Act Art. 26 (surveillance par le déployeur)",
            rationale_template=(
                "Le signal ({constat}) doit être confirmé ou levé : "
                "reprogrammez un audit sur un jeu de décisions plus large ou "
                "plus récent."
            ),
            steps=(
                "Fixer une échéance de re-test (ex. sous 3 mois).",
                "Comparer les résultats au présent rapport.",
            ),
        ))
    else:  # pass
        specs.append(_doc_rule(finding, light=True))
        specs.append(_RuleSpec(
            id="periodic_retest",
            title="Planifier un re-test périodique de l'outil",
            category="surveillance",
            priority_level=3,
            owner="DPO",
            horizon="continu",
            legal_ref="AI Act Art. 26 (surveillance par le déployeur)",
            rationale_template=(
                "Aucun écart significatif n'est constaté ({constat}), mais le "
                "comportement de l'outil peut dériver : reprogrammez un audit "
                "périodique, notamment après toute mise à jour de l'outil."
            ),
            steps=(
                "Définir une fréquence de re-test (ex. semestrielle).",
                "Re-tester systématiquement après une mise à jour de l'outil.",
            ),
        ))
    return specs


def build_recommendations(finding: Finding) -> list[RecommendationOut]:
    """Construit la liste déterministe, ordonnée par priorité (1 → 3).

    Persona déployeur exclusivement. Aucune action de fournisseur.
    """
    specs = _build_specs(finding)
    outs = [s.to_out(finding) for s in specs]
    # Tri stable par priorité (1=haute en premier) ; l'ordre d'insertion
    # départage les ex-æquo.
    outs.sort(key=lambda r: r.priority_level)
    return outs
