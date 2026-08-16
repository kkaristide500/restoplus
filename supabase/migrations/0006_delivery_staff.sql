-- ============================================================
-- Module 5 (partiel) — Rôle "Serveur / Livreur" (delivery_staff)
-- Créé par le staff restaurant, peut accepter une commande et la livrer.
-- ============================================================

-- ---------- Nouveau rôle ----------
alter type user_role add value if not exists 'delivery_staff';

-- ---------- Suivi de l'attribution d'une commande ----------
alter table orders add column if not exists assigned_to uuid references users(id);

-- ---------- Policies : orders (accès serveur/livreur) ----------
-- Un serveur/livreur voit toutes les commandes confirmées (pour pouvoir les accepter)
-- ainsi que celles déjà attribuées.
create policy "orders_select_delivery" on orders
  for select using (auth_user_role() = 'delivery_staff');

-- Il peut "accepter" une commande non attribuée (assigned_to devient son propre id),
-- ou faire évoluer le statut d'une commande déjà attribuée à lui.
create policy "orders_update_delivery" on orders
  for update using (
    auth_user_role() = 'delivery_staff'
    and (assigned_to is null or assigned_to = auth.uid())
  )
  with check (
    auth_user_role() = 'delivery_staff' and assigned_to = auth.uid()
  );

-- order_items / delivery_requests : lecture pour le serveur/livreur
create policy "order_items_select_delivery" on order_items
  for select using (auth_user_role() = 'delivery_staff');

create policy "delivery_requests_select_delivery" on delivery_requests
  for select using (auth_user_role() = 'delivery_staff');

-- ---------- Gestion des comptes staff (users) ----------
-- Le staff restaurant (manager) peut activer/désactiver n'importe quel compte,
-- y compris les serveurs/livreurs qu'il crée.
create policy "users_update_staff_manage" on users
  for update using (auth_user_role() = 'restaurant_staff')
  with check (auth_user_role() = 'restaurant_staff');

-- ============================================================
-- Rappel : la CRÉATION d'un compte (email + mot de passe) passe obligatoirement
-- par l'Edge Function `create-staff-account` (service_role), car Supabase Auth
-- ne peut pas être manipulé directement en SQL. Voir supabase/functions/.
-- ============================================================
