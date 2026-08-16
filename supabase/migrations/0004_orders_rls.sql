-- ============================================================
-- Module 3 — Commande (Administration)
-- RLS : staff_admin crée et consulte ses propres commandes,
-- restaurant_staff voit tout et fait évoluer les statuts.
-- ============================================================

alter table orders enable row level security;
alter table order_items enable row level security;
alter table delivery_requests enable row level security;

-- ---------- Policies : orders ----------
create policy "orders_select_own" on orders
  for select using (user_id = auth.uid());

create policy "orders_select_staff" on orders
  for select using (auth_user_role() = 'restaurant_staff');

-- Seul un staff_admin peut créer une commande, uniquement pour lui-même.
create policy "orders_insert_own" on orders
  for insert with check (
    user_id = auth.uid() and auth_user_role() = 'staff_admin'
  );

-- Le staff_admin ne peut annuler sa commande QUE tant qu'elle est encore 'nouvelle'.
create policy "orders_update_own_cancel" on orders
  for update using (
    user_id = auth.uid() and status = 'nouvelle'
  )
  with check (
    user_id = auth.uid() and status in ('nouvelle', 'annulee')
  );

-- Le staff restaurant peut faire évoluer le statut de n'importe quelle commande.
create policy "orders_update_staff" on orders
  for update using (auth_user_role() = 'restaurant_staff')
  with check (auth_user_role() = 'restaurant_staff');

-- ---------- Policies : order_items ----------
create policy "order_items_select_own" on order_items
  for select using (
    order_id in (select id from orders where user_id = auth.uid())
  );

create policy "order_items_select_staff" on order_items
  for select using (auth_user_role() = 'restaurant_staff');

create policy "order_items_insert_own" on order_items
  for insert with check (
    order_id in (select id from orders where user_id = auth.uid())
  );

-- ---------- Policies : delivery_requests ----------
create policy "delivery_requests_select_own" on delivery_requests
  for select using (
    order_id in (select id from orders where user_id = auth.uid())
  );

create policy "delivery_requests_select_staff" on delivery_requests
  for select using (auth_user_role() = 'restaurant_staff');

create policy "delivery_requests_insert_own" on delivery_requests
  for insert with check (
    order_id in (select id from orders where user_id = auth.uid())
  );

-- ============================================================
-- Rappel métier : `declared_payment_mode` n'est JAMAIS un vrai paiement,
-- juste une indication transmise au restaurant/livreur (voir docs/phase1).
-- ============================================================
