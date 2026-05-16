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

Réponds UNIQUEMENT par un objet JSON valide, sans texte autour :
{{"narrative": "<texte FR>", "ai_act_anchors": ["..."], "disclaimers": ["..."]}}
