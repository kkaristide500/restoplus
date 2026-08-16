-- ============================================================
-- Module 8 (Nice to Have) — Critères d'évaluation détaillés,
-- vues statistiques pour les rapports, sécurisation du marketing
-- ============================================================

-- ---------- Critères d'évaluation détaillés (optionnels) ----------
alter table reviews add column if not exists rating_taste smallint check (rating_taste between 1 and 5);
alter table reviews add column if not exists rating_quantity smallint check (rating_quantity between 1 and 5);
alter table reviews add column if not exists rating_service smallint check (rating_service between 1 and 5);

-- ---------- RLS marketing_campaigns (oubliée en Phase 2 — usage interne staff uniquement) ----------
alter table marketing_campaigns enable row level security;

create policy "marketing_campaigns_all_staff" on marketing_campaigns
  for all using (auth_user_role() = 'restaurant_staff')
  with check (auth_user_role() = 'restaurant_staff');

-- ============================================================
-- Vues statistiques (dashboard "Rapports")
-- security_invoker : respecte le RLS des tables sous-jacentes, donc
-- seul le staff restaurant (qui a déjà un accès "select all" sur
-- meal_consumptions/reviews) peut réellement exploiter ces vues.
-- ============================================================

-- Repas servis par jour et par créneau
create view daily_meals_served
  with (security_invoker = true) as
select
  created_at::date as day,
  slot,
  count(*) as meals_count
from meal_consumptions
group by created_at::date, slot;

-- Évolution de la satisfaction moyenne (avis non masqués) par jour
create view daily_satisfaction
  with (security_invoker = true) as
select
  created_at::date as day,
  avg(rating)::numeric(3,2) as avg_rating,
  count(*) as review_count
from reviews
where is_hidden = false
group by created_at::date;

-- Répartition par critère détaillé (goût / quantité / service)
create view satisfaction_breakdown
  with (security_invoker = true) as
select
  avg(rating_taste)::numeric(3,2) as avg_taste,
  avg(rating_quantity)::numeric(3,2) as avg_quantity,
  avg(rating_service)::numeric(3,2) as avg_service,
  count(rating_taste) as taste_count
from reviews
where is_hidden = false;

-- ============================================================
-- Note : une vraie "satisfaction par plat" nécessiterait de tracer le
-- menu_item_id exact consommé dans meal_consumptions (actuellement on ne
-- trace que le créneau). C'est une évolution possible mais hors scope
-- Nice-to-Have actuel — signalé pour une itération future.
-- ============================================================
