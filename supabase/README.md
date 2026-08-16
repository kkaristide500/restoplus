# Supabase — RestoPlus

- `migrations/0001_init_schema.sql` : schéma initial (tables + types), sans RLS ni Edge Functions (Phase 6).
- `seed.sql` : données de démonstration minimales.

## À faire en Phase 6
1. Activer et écrire les policies RLS (student / staff_admin / restaurant_staff).
2. Edge Function `consume_meal` : seule voie pour créditer/débiter un compte repas.
3. Edge Function `renew_subscription` : renouvellement manuel + `audit_log`.
4. Trigger de calcul du solde par créneau à partir de `transactions`.
