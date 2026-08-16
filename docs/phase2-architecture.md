# Phase 2 — Architecture technique

## Stack
- **Mobile** (Élève + Admin) : Expo (React Native), navigation conditionnelle par rôle.
- **Web** (Staff + page publique) : Next.js, App Router, responsive mobile-first.
- **Backend** : Supabase (Postgres + Auth + RLS + Edge Functions + Storage + Realtime).
- **Notifications** : Expo Push Notifications.
- **QR Code** : génération via `qrcode`, lecture via `expo-camera` (mobile) et
  `getUserMedia` / `html5-qrcode` (web).

## Rôles
| Rôle | Peut | Ne peut pas |
|---|---|---|
| student | Voir menu midi/soir(+petit-déj si formule), solde, historique, QR, noter | Modifier son solde, voir les données d'autres élèves |
| staff_admin | Précommander, retrait/livraison, paiement déclaré, noter | Modifier crédits élèves, accéder au dashboard restaurant |
| restaurant_staff | Gérer menus/commandes, scanner QR, gérer crédits, dashboard, modérer avis | — |
| public (visiteur) | Lire le menu du jour | Tout le reste (pas de compte) |

Sécurité appliquée via **Row Level Security (RLS)** sur toutes les tables sensibles.

## Entités principales (voir `supabase/migrations/0001_init_schema.sql`)
- `users`, `student_profiles`, `staff_profiles`
- `menus`, `menu_items`
- `subscription_plans`, `meal_accounts`, `transactions`
- `orders`, `order_items`, `delivery_requests`
- `meal_consumptions` (avec `scan_token` unique anti-double-scan)
- `qr_codes`, `notifications`, `reviews`
- `favorite_meals` (calculé), `marketing_campaigns`
- `audit_log` (traçabilité des corrections manuelles)

## Sécurité — non négociable
- RLS activé partout où c'est pertinent.
- Déduction de solde = Edge Function serveur uniquement, jamais un update direct
  depuis le client.
- Anti-double-scan : contrainte unique + fenêtre de temps.
- Journalisation (`audit_log`) de toute correction manuelle.
- Aucune donnée de paiement réel stockée (champ texte/enum indicatif seulement).

## Notifications — déclencheurs
Nouveau menu publié · Statuts de commande · Solde faible · Plat préféré disponible.

## Navigation
- **Mobile** : un seul projet Expo, deux univers de navigation (Élève / Admin) selon le rôle.
- **Web dashboard** : Tableau de bord · Menus · Commandes · Scan QR · Élèves/Crédits ·
  Avis · Recommandations · QR public · Paramètres · Utilisateurs.
- **Page publique** : route unique `/menu`, sans authentification.
