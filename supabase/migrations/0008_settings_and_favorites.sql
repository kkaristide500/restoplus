-- ============================================================
-- Module 7 (Should Have) — Paramètres restaurant, heure limite de
-- commande, quantité max par plat, favoris, seuil solde faible configurable
-- ============================================================

-- ---------- Paramètres globaux (une seule ligne) ----------
create table restaurant_settings (
  id smallint primary key default 1,
  order_cutoff_minutes int not null default 60,   -- ex: commande fermée 60 min avant le créneau
  max_quantity_per_item int not null default 5,
  low_balance_threshold int not null default 5,
  opening_hours jsonb not null default '{
    "petit_dejeuner": "06h30 - 08h00",
    "dejeuner": "12h00 - 14h00",
    "diner": "18h30 - 20h30"
  }'::jsonb,
  updated_at timestamptz not null default now(),
  constraint single_row check (id = 1)
);

insert into restaurant_settings (id) values (1);

alter table restaurant_settings enable row level security;

-- Lecture ouverte à tous les comptes authentifiés (l'appli mobile doit
-- pouvoir afficher "commande fermée" ou la quantité max autorisée).
create policy "restaurant_settings_select_all" on restaurant_settings
  for select using (true);

create policy "restaurant_settings_update_staff" on restaurant_settings
  for update using (auth_user_role() = 'restaurant_staff')
  with check (auth_user_role() = 'restaurant_staff');

-- ============================================================
-- Trigger : applique l'heure limite de commande + la quantité max par plat
-- au moment de l'ajout d'une ligne à une commande (order_items).
-- ============================================================
create or replace function enforce_order_rules()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_settings restaurant_settings%rowtype;
  v_menu_date date;
  v_slot meal_slot;
  v_slot_start time;
  v_cutoff_at timestamptz;
begin
  select * into v_settings from restaurant_settings where id = 1;

  if new.quantity > v_settings.max_quantity_per_item then
    raise exception 'Quantité maximale autorisée par plat : %', v_settings.max_quantity_per_item;
  end if;

  select m.date, m.slot into v_menu_date, v_slot
  from menu_items mi join menus m on m.id = mi.menu_id
  where mi.id = new.menu_item_id;

  v_slot_start := case v_slot
    when 'petit_dejeuner' then time '06:30'
    when 'dejeuner' then time '12:00'
    when 'diner' then time '18:30'
  end;

  v_cutoff_at := (v_menu_date + v_slot_start) - (v_settings.order_cutoff_minutes || ' minutes')::interval;

  if now() > v_cutoff_at then
    raise exception 'Commande fermée : l''heure limite pour ce créneau est dépassée (% min avant le service)',
      v_settings.order_cutoff_minutes;
  end if;

  return new;
end;
$$;

create trigger on_order_item_insert
  before insert on order_items
  for each row execute function enforce_order_rules();

-- ============================================================
-- Seuil "solde faible" : utiliser le paramètre configurable au lieu
-- d'une constante codée en dur dans consume_meal().
-- ============================================================
create or replace function consume_meal(p_code_value text, p_slot meal_slot)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student_id uuid;
  v_student_name text;
  v_meal_account_id uuid;
  v_includes boolean;
  v_remaining int;
  v_already_consumed boolean;
  v_remaining_after int;
  v_low_balance_threshold int;
begin
  if auth_user_role() <> 'restaurant_staff' then
    raise exception 'Action réservée au personnel du restaurant';
  end if;

  select low_balance_threshold into v_low_balance_threshold from restaurant_settings where id = 1;

  select qc.user_id into v_student_id
  from qr_codes qc
  where qc.code_value = p_code_value and qc.is_active = true and qc.is_public = false;

  if v_student_id is null then
    raise exception 'QR Code invalide ou inactif';
  end if;

  select full_name into v_student_name from users where id = v_student_id and role = 'student';
  if v_student_name is null then
    raise exception 'Ce QR Code ne correspond pas à un élève';
  end if;

  select ma.id into v_meal_account_id
  from meal_accounts ma
  where ma.student_id = v_student_id and ma.expires_at >= current_date
  order by ma.expires_at desc
  limit 1;

  if v_meal_account_id is null then
    raise exception 'Aucun abonnement actif pour cet élève';
  end if;

  select case p_slot
    when 'petit_dejeuner' then sp.includes_petit_dejeuner
    when 'dejeuner' then sp.includes_dejeuner
    when 'diner' then sp.includes_diner
  end into v_includes
  from meal_accounts ma
  join subscription_plans sp on sp.id = ma.plan_id
  where ma.id = v_meal_account_id;

  if not v_includes then
    raise exception 'Ce créneau n''est pas inclus dans la formule de l''élève';
  end if;

  select exists(
    select 1 from meal_consumptions
    where student_id = v_student_id and slot = p_slot and created_at::date = current_date
  ) into v_already_consumed;

  if v_already_consumed then
    raise exception 'Ce repas a déjà été validé aujourd''hui pour cet élève';
  end if;

  select coalesce(sum(amount), 0) into v_remaining
  from transactions
  where meal_account_id = v_meal_account_id and slot = p_slot;

  if v_remaining <= 0 then
    raise exception 'Solde insuffisant pour ce créneau';
  end if;

  insert into meal_consumptions (student_id, slot, scanned_by, scan_token)
  values (v_student_id, p_slot, auth.uid(), gen_random_uuid()::text);

  insert into transactions (meal_account_id, type, slot, amount, created_by, note)
  values (v_meal_account_id, 'debit', p_slot, -1, auth.uid(), 'Scan repas');

  insert into audit_log (actor_id, action, target_table, target_id, details)
  values (auth.uid(), 'consume_meal', 'meal_consumptions', v_meal_account_id,
          json_build_object('student_id', v_student_id, 'slot', p_slot));

  v_remaining_after := v_remaining - 1;

  if v_remaining_after <= v_low_balance_threshold then
    insert into notifications (user_id, type, content)
    values (
      v_student_id, 'low_balance',
      'Ton solde pour ' || p_slot || ' est faible : ' || v_remaining_after || ' repas restants.'
    );
  end if;

  return json_build_object(
    'student_name', v_student_name,
    'slot', p_slot,
    'remaining_after', v_remaining_after
  );
end;
$$;

-- ============================================================
-- Plats favoris (Administration) — calculés automatiquement, jamais saisis.
-- security_invoker respecte le RLS de order_items/orders : chacun ne voit
-- que ses propres favoris.
-- ============================================================
create view admin_favorite_meals
  with (security_invoker = true) as
select
  o.user_id,
  mi.name,
  count(*) as order_count
from order_items oi
join orders o on o.id = oi.order_id
join menu_items mi on mi.id = oi.menu_item_id
where o.status <> 'annulee'
group by o.user_id, mi.name;
