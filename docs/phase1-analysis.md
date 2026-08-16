# Phase 1 — Analyse du projet

## Problème
Le restaurant de l'académie gère tout manuellement (affichage papier, WhatsApp, cahiers).
Les usagers ne connaissent pas le menu sans se déplacer ; le restaurant perd du temps sur
des tâches répétitives.

## Utilisateurs
| Profil | Besoin principal | Paiement dans l'app |
|---|---|---|
| Élève | Menu, crédit repas prépayé, QR perso, historique | Aucun (crédit interne) |
| Administration | Précommander, retrait/livraison bureau | Indicatif seulement |
| Visiteur | Consulter le menu sans compte | — |
| Restaurant/Staff | Publier menus, gérer commandes, scanner QR, dashboard | — |

## Décisions de cadrage validées
1. **Visiteur = consultation seule**, aucun compte, aucune commande.
2. **Scan du QR élève = web + mobile** (dashboard responsive utilisable des deux côtés).
3. **Petit-déjeuner inclus ou non selon la formule d'abonnement** (`subscription_plans`).
4. **Staff = dashboard web responsive uniquement**, pas d'app mobile dédiée.

## Règles métier critiques
- Aucun paiement réel dans l'app (Wave/Mobile Money/carte) — le mode de paiement est
  une déclaration d'intention transmise au restaurant/livreur.
- Le crédit repas élève est une comptabilité interne basée sur des transactions
  (jamais un solde modifiable directement).
- Solde et déductions **contrôlés côté serveur uniquement**.
- Élèves : retrait au restaurant uniquement, jamais de livraison en chambre.
- Anti-double-scan obligatoire (contrainte unique en base).
- Évaluation possible uniquement après une commande récupérée/livrée.

## Incohérences corrigées par rapport aux maquettes initiales
1. Écran "Créer un compte" → suppression de la carte Visiteur.
2. Écran "Scan QR" → déplacé côté staff (dashboard web), pas dans l'app élève.
3. "Recharger abonnement" → renommé "Demander un renouvellement" (pas de paiement en app).
4. Disclaimer ajouté sur l'écran de mode de paiement admin.

## MVP (voir `phase2-architecture.md` pour le détail technique)
Must Have / Should Have / Nice to Have / Future : voir section correspondante,
validée en Phase 3.
