-- ============================================================
-- Module 2 — Menu (consultation + gestion)
-- RLS : lecture publique des menus publiés, écriture staff uniquement
-- ============================================================

alter table menus enable row level security;
alter table menu_items enable row level security;

-- ---------- Policies : menus ----------
-- Tout le monde (y compris anonyme/visiteur) peut lire un menu publié.
create policy "menus_select_published" on menus
  for select using (is_published = true);

-- Le staff restaurant voit aussi les menus non publiés (brouillons).
create policy "menus_select_staff_all" on menus
  for select using (auth_user_role() = 'restaurant_staff');

-- Seul le staff restaurant peut créer / modifier / supprimer des menus.
create policy "menus_insert_staff" on menus
  for insert with check (auth_user_role() = 'restaurant_staff');

create policy "menus_update_staff" on menus
  for update using (auth_user_role() = 'restaurant_staff')
  with check (auth_user_role() = 'restaurant_staff');

create policy "menus_delete_staff" on menus
  for delete using (auth_user_role() = 'restaurant_staff');

-- ---------- Policies : menu_items ----------
-- Lecture publique si le menu parent est publié.
create policy "menu_items_select_published" on menu_items
  for select using (
    exists (
      select 1 from menus
      where menus.id = menu_items.menu_id
        and menus.is_published = true
    )
  );

create policy "menu_items_select_staff_all" on menu_items
  for select using (auth_user_role() = 'restaurant_staff');

create policy "menu_items_insert_staff" on menu_items
  for insert with check (auth_user_role() = 'restaurant_staff');

create policy "menu_items_update_staff" on menu_items
  for update using (auth_user_role() = 'restaurant_staff')
  with check (auth_user_role() = 'restaurant_staff');

create policy "menu_items_delete_staff" on menu_items
  for delete using (auth_user_role() = 'restaurant_staff');
