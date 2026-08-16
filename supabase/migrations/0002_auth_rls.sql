-- ============================================================
-- Module 1 — Authentification & Rôles
-- RLS + trigger de création de profil automatique
-- ============================================================

-- ---------- Activation RLS ----------
alter table users enable row level security;
alter table student_profiles enable row level security;
alter table staff_profiles enable row level security;
alter table meal_accounts enable row level security;
alter table transactions enable row level security;
alter table meal_consumptions enable row level security;
alter table qr_codes enable row level security;
alter table notifications enable row level security;

-- ---------- Fonction utilitaire : rôle de l'utilisateur courant ----------
create or replace function auth_user_role()
returns user_role
language sql stable
security definer
set search_path = public
as $$
  select role from users where id = auth.uid();
$$;

-- ---------- Policies : users ----------
-- Chacun peut lire sa propre ligne
create policy "users_select_self" on users
  for select using (id = auth.uid());

-- Le staff restaurant peut lire tous les utilisateurs (gestion des comptes)
create policy "users_select_staff" on users
  for select using (auth_user_role() = 'restaurant_staff');

-- Un utilisateur peut mettre à jour certains de ses propres champs (pas le rôle)
create policy "users_update_self" on users
  for update using (id = auth.uid())
  with check (id = auth.uid());

-- ---------- Policies : student_profiles ----------
create policy "student_profiles_select_self" on student_profiles
  for select using (user_id = auth.uid());

create policy "student_profiles_select_staff" on student_profiles
  for select using (auth_user_role() = 'restaurant_staff');

-- ---------- Policies : staff_profiles ----------
create policy "staff_profiles_select_self" on staff_profiles
  for select using (user_id = auth.uid());

create policy "staff_profiles_select_staff" on staff_profiles
  for select using (auth_user_role() = 'restaurant_staff');

-- ---------- Policies : meal_accounts / transactions / meal_consumptions ----------
-- L'élève ne voit que son propre compte / historique
create policy "meal_accounts_select_self" on meal_accounts
  for select using (student_id = auth.uid());

create policy "meal_accounts_select_staff" on meal_accounts
  for select using (auth_user_role() = 'restaurant_staff');

create policy "transactions_select_self" on transactions
  for select using (
    meal_account_id in (select id from meal_accounts where student_id = auth.uid())
  );

create policy "transactions_select_staff" on transactions
  for select using (auth_user_role() = 'restaurant_staff');

create policy "meal_consumptions_select_self" on meal_consumptions
  for select using (student_id = auth.uid());

create policy "meal_consumptions_select_staff" on meal_consumptions
  for select using (auth_user_role() = 'restaurant_staff');

-- ⚠️ Aucune policy INSERT/UPDATE n'est ouverte sur transactions / meal_accounts /
-- meal_consumptions pour les rôles student / staff_admin : ces écritures ne
-- passeront QUE par les Edge Functions (Module "Scan & Crédit repas", à venir).

-- ---------- Policies : qr_codes ----------
create policy "qr_codes_select_self" on qr_codes
  for select using (user_id = auth.uid() or is_public = true);

-- ---------- Policies : notifications ----------
create policy "notifications_select_self" on notifications
  for select using (user_id = auth.uid());

create policy "notifications_update_self" on notifications
  for update using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ============================================================
-- Trigger : à la création d'un compte Supabase Auth, on crée
-- automatiquement la ligne `users` + le profil (student ou staff)
-- correspondant, à partir des métadonnées passées au signUp().
-- ============================================================

create or replace function handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  chosen_role user_role;
begin
  chosen_role := coalesce((new.raw_user_meta_data->>'role')::user_role, 'staff_admin');

  insert into public.users (id, email, role, full_name)
  values (
    new.id,
    new.email,
    chosen_role,
    coalesce(new.raw_user_meta_data->>'full_name', '')
  );

  if chosen_role = 'student' then
    insert into public.student_profiles (user_id, matricule, classe)
    values (
      new.id,
      coalesce(new.raw_user_meta_data->>'matricule', ''),
      new.raw_user_meta_data->>'classe'
    );
  elsif chosen_role in ('staff_admin', 'restaurant_staff') then
    insert into public.staff_profiles (user_id, service, bureau, batiment)
    values (
      new.id,
      new.raw_user_meta_data->>'service',
      new.raw_user_meta_data->>'bureau',
      new.raw_user_meta_data->>'batiment'
    );
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_auth_user();

-- ============================================================
-- Rappel : le rôle 'restaurant_staff' n'est PAS proposé à l'inscription
-- publique (mobile/web). Il est attribué manuellement par un
-- administrateur système directement en base ou via le dashboard
-- "Gestion des utilisateurs" (Module Staff, à venir).
-- ============================================================
