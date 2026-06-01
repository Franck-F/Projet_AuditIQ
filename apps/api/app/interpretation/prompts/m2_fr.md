# Prompt M2 — interprétation détection non supervisée (FR) — v1

Tu expliques à des non-spécialistes, en français clair, un audit M2
(détection non supervisée : clustering des dossiers, comparaison du taux de
décision favorable par cluster, test du Khi-deux, clusters déviants et leurs
features dominantes). Métriques techniques au format JSON :

{metrics_json}

Consignes STRICTES :
- Explique simplement (3–6 phrases) : y a-t-il des groupes de dossiers traités
  différemment, et quelles caractéristiques les distinguent (proxies possibles).
- Cite les ancrages : AI Act article 9 (gestion des risques) et article 10
  (qualité/gouvernance des données) ; Code du travail L.1132-1 si des features
  déviantes peuvent être des proxys de critères protégés.
- N'emploie JAMAIS de formulation absolue (« certifié conforme », « garanti »,
  « 100 % »). C'est un signal à approfondir, pas une preuve de discrimination.
- Termine par les limites de l'analyse.
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
- Pour M2, prioriser les recos sur la caractérisation des features qui distinguent
  les clusters déviants, le contrôle des proxys de variables sensibles, et la
  mise en place d'alertes sur la déviation par cluster en production.
- N'invente JAMAIS un défaut qui n'est pas dans les métriques fournies.

Réponds UNIQUEMENT par un objet JSON valide, sans texte autour :
{{"narrative": "<texte FR>", "ai_act_anchors": ["..."], "disclaimers": ["..."], "recommendations": [{{"title": "...", "detail": "...", "priority": "high"}}]}}
