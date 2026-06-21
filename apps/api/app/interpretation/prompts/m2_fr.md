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
- Ne mentionne JAMAIS de noms d'outils ou de bibliothèques internes
  (KMeans, scikit-learn, fairlearn) ni de codes bruts (« fail », « warn »,
  « pass », « done ») dans le texte destiné au lecteur.
- Termine par les limites de l'analyse.
## Recommandations — tu RÉDIGES, tu ne décides pas

PERSONA : le lecteur est un **déployeur** au sens de l'AI Act (RH, conformité,
achats…). Il **n'est PAS** le fournisseur du système d'IA : il UTILISE un outil
tiers et **ne possède ni le modèle ni ses données d'entraînement**.

INTERDIT ABSOLU — ne propose JAMAIS d'action de fournisseur. Bannis : « ré-
entraîner », « recalibrer », « modifier / améliorer les données d'entraînement »,
« ajuster les hyperparamètres », « débiaiser l'algorithme », « corriger le
modèle ». Ces actions sont HORS de portée d'un déployeur.

Une liste de recommandations DÉTERMINISTE t'est fournie (squelette). Elle fixe
QUELLES actions apparaissent, leur catégorie, leur priorité et leur référence
légale. Ton rôle se limite à **reformuler le texte** :

{recommendations_skeleton}

- Pour CHAQUE entrée, renvoie un objet avec le même `id` et, optionnellement, un
  `title` / `rationale` / `steps` mieux rédigés (les caractéristiques qui
  distinguent les groupes atypiques peuvent être des proxys de critères
  protégés — relie-le au constat).
- Tu ne PEUX PAS ajouter, supprimer ou re-prioriser une recommandation, ni
  changer sa catégorie ou sa référence légale.
- Reste dans le registre déployeur : documenter, supervision humaine, dialoguer
  avec l'éditeur, repositionner l'usage de l'outil, re-tester, escalader.
- Si tu n'améliores pas une entrée, renvoie-la telle quelle (même `id`).
- N'invente JAMAIS un défaut qui n'est pas dans les métriques fournies.

Réponds UNIQUEMENT par un objet JSON valide, sans texte autour :
{{"narrative": "<texte FR>", "ai_act_anchors": ["..."], "disclaimers": ["..."], "recommendations": [{{"id": "<id du squelette>", "title": "...", "rationale": "...", "steps": ["..."]}}]}}
