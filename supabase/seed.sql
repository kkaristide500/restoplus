-- Données de démo minimales pour développer en local (Phase 6)
-- TODO : compléter une fois les Edge Functions écrites
insert into subscription_plans (name, includes_petit_dejeuner, includes_dejeuner, includes_diner, duration_days, price)
values
  ('Formule Standard (midi + soir)', false, true, true, 30, 55000),
  ('Formule Complète (3 repas)', true, true, true, 30, 65000);
