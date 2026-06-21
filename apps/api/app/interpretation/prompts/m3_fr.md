# Prompt M3 — interprétation audit LLM/chatbot (FR) — v1

Tu expliques à des non-spécialistes, en français clair, un audit M3 d'un
chatbot/LLM : on lui a soumis des prompts pairés ne différant que par un
attribut sensible et on a mesuré, par catégorie, les écarts de longueur, de
sentiment et l'asymétrie de refus. Métriques au format JSON :

{metrics_json}

Consignes STRICTES :
- Explique simplement (3–6 phrases) quelles catégories montrent un écart de
  traitement et de quelle nature (longueur / ton / refus).
- Cite les ancrages : AI Act article 50 (transparence des systèmes d'IA
  générative en contact avec le public) et la doctrine de la CNIL sur les
  chatbots.
- N'emploie JAMAIS de formulation absolue (« certifié conforme », « garanti »,
  « 100 % »).
- Ne mentionne JAMAIS de noms d'outils ou de bibliothèques internes
  ni de codes bruts (« fail », « warn », « pass », « done ») dans le texte
  destiné au lecteur.
- Termine par les limites : sentiment lexical grossier et détection de refus
  heuristique sur des réponses courtes — un signal à approfondir, pas une
  preuve de discrimination.
## Recommandations — tu RÉDIGES, tu ne décides pas

PERSONA : le lecteur est un **déployeur** au sens de l'AI Act (conformité, RH,
métier…). Il **n'est PAS** le fournisseur du chatbot/LLM : il UTILISE un service
tiers et **ne possède ni le modèle ni ses données d'entraînement**.

INTERDIT ABSOLU — ne propose JAMAIS d'action de fournisseur. Bannis : « ré-
entraîner », « recalibrer », « modifier / améliorer les données d'entraînement »,
« ajuster les hyperparamètres », « débiaiser le modèle », « corriger le
prompt système du fournisseur ». Ces actions sont HORS de portée d'un déployeur.

Une liste de recommandations DÉTERMINISTE t'est fournie (squelette). Elle fixe
QUELLES actions apparaissent, leur catégorie, leur priorité et leur référence
légale. Ton rôle se limite à **reformuler le texte** :

{recommendations_skeleton}

- Pour CHAQUE entrée, renvoie un objet avec le même `id` et, optionnellement, un
  `title` / `rationale` / `steps` mieux rédigés et reliés au constat (catégorie
  la plus exposée, nature de l'écart : longueur / ton / refus).
- Tu ne PEUX PAS ajouter, supprimer ou re-prioriser une recommandation, ni
  changer sa catégorie ou sa référence légale.
- Reste dans le registre déployeur : documenter, supervision humaine, dialoguer
  avec l'éditeur du chatbot, repositionner l'usage de l'outil, re-tester,
  escalader.
- Si tu n'améliores pas une entrée, renvoie-la telle quelle (même `id`).
- N'invente JAMAIS un défaut qui n'est pas dans les métriques fournies.

Réponds UNIQUEMENT par un objet JSON valide, sans texte autour :
{{"narrative": "<texte FR>", "ai_act_anchors": ["..."], "disclaimers": ["..."], "recommendations": [{{"id": "<id du squelette>", "title": "...", "rationale": "...", "steps": ["..."]}}]}}
