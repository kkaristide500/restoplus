-- ============================================================
-- Module 4 — Abonnement & crédit repas (Élève)
-- Table renewal_requests + vue soldes + fonctions serveur sécurisées
-- ============================================================

-- ---------- Demandes de renouvellement (bouton "Demander un renouvellement") ----------
create type renewal_status as enum ('en_attente', 'traitee');

create table renewal_requests (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid not null references users(id) on delete cascade,
  status renewal_status not null default 'en_attente',
  created_at timestamptz not null default now(),
  treated_at timestamptz,
  treated_by uuid references users(id)
);

alter table renewal_requests enable row level security;

create policy "renewal_requests_select_own" on renewal_requests
  for select using (student_id = auth.uid());

create policy "renewal_requests_select_staff" on renewal_requests
  for select using (auth_user_role() = 'restaurant_staff');

create policy "renewal_requests_insert_own" on renewal_requests
  for insert with check (student_id = auth.uid() and auth_user_role() = 'student');

create policy "renewal_requests_update_staff" on renewal_requests
  for update using (auth_user_role() = 'restaurant_staff')
  with check (auth_user_role() = 'restaurant_staff');

-- ---------- Vue : solde de repas restants par créneau ----------
-- security_invoker garantit que la vue respecte le RLS de l'utilisateur
-- qui interroge (et non les droits du propriétaire de la vue).
create view student_meal_balances
  with (security_invoker = true) as
select
  ma.student_id,
  ma.id as meal_account_id,
  ma.expires_at,
  sp.name as plan_name,
  t.slot,
  sum(t.amount) as remaining
from meal_accounts ma
join subscription_plans sp on sp.id = ma.plan_id
join transactions t on t.meal_account_id = ma.id
where t.slot is not null
group by ma.student_id, ma.id, ma.expires_at, sp.name, t.slot;

-- ============================================================
-- Fonction : consume_meal
-- Appelée UNIQUEMENT par le staff (web ou mobile) au moment du scan.
-- Vérifie l'abonnement, le solde, et empêche qu'un élève soit servi
-- deux fois le même repas le même jour (anti-double-scan métier).
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
begin
  if auth_user_role() <> 'restaurant_staff' then
    raise exception 'Action réservée au personnel du restaurant';
  end if;

  -- 1. Résoudre le QR Code vers l'élève
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

  -- 2. Trouver l'abonnement actif le plus récent
  select ma.id into v_meal_account_id
  from meal_accounts ma
  where ma.student_id = v_student_id and ma.expires_at >= current_date
  order by ma.expires_at desc
  limit 1;

  if v_meal_account_id is null then
    raise exception 'Aucun abonnement actif pour cet élève';
  end if;

  -- 3. Vérifier que la formule inclut ce créneau
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

  -- 4. Anti-double-scan : refuser si déjà consommé aujourd'hui pour ce créneau
  select exists(
    select 1 from meal_consumptions
    where student_id = v_student_id
      and slot = p_slot
      and created_at::date = current_date
  ) into v_already_consumed;

  if v_already_consumed then
    raise exception 'Ce repas a déjà été validé aujourd''hui pour cet élève';
  end if;

  -- 5. Vérifier le solde restant
  select coalesce(sum(amount), 0) into v_remaining
  from transactions
  where meal_account_id = v_meal_account_id and slot = p_slot;

  if v_remaining <= 0 then
    raise exception 'Solde insuffisant pour ce créneau';
  end if;

  -- 6. Enregistrer la consommation + le débit (transaction unique et tracée)
  insert into meal_consumptions (student_id, slot, scanned_by, scan_token)
  values (v_student_id, p_slot, auth.uid(), gen_random_uuid()::text);

  insert into transactions (meal_account_id, type, slot, amount, created_by, note)
  values (v_meal_account_id, 'debit', p_slot, -1, auth.uid(), 'Scan repas');

  insert into audit_log (actor_id, action, target_table, target_id, details)
  values (auth.uid(), 'consume_meal', 'meal_consumptions', v_meal_account_id,
          json_build_object('student_id', v_student_id, 'slot', p_slot));

  return json_build_object(
    'student_name', v_student_name,
    'slot', p_slot,
    'remaining_after', v_remaining - 1
  );
end;
$$;

-- ============================================================
-- Fonction : renew_subscription
-- Renouvellement manuel par le staff (aucun paiement traité par l'app).
-- Crée un nouveau compte repas + crédite chaque créneau inclus.
-- ============================================================
create or replace function renew_subscription(p_student_id uuid, p_plan_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan subscription_plans%rowtype;
  v_meal_account_id uuid;
begin
  if auth_user_role() <> 'restaurant_staff' then
    raise exception 'Action réservée au personnel du restaurant';
  end if;

  select * into v_plan from subscription_plans where id = p_plan_id;
  if v_plan is null then
    raise exception 'Formule d''abonnement introuvable';
  end if;

  insert into meal_accounts (student_id, plan_id, expires_at)
  values (p_student_id, p_plan_id, current_date + v_plan.duration_days)
  returning id into v_meal_account_id;

  if v_plan.includes_petit_dejeuner then
    insert into transactions (meal_account_id, type, slot, amount, created_by, note)
    values (v_meal_account_id, 'credit', 'petit_dejeuner', v_plan.duration_days, auth.uid(), 'Renouvellement');
  end if;
  if v_plan.includes_dejeuner then
    insert into transactions (meal_account_id, type, slot, amount, created_by, note)
    values (v_meal_account_id, 'credit', 'dejeuner', v_plan.duration_days, auth.uid(), 'Renouvellement');
  end if;
  if v_plan.includes_diner then
    insert into transactions (meal_account_id, type, slot, amount, created_by, note)
    values (v_meal_account_id, 'credit', 'diner', v_plan.duration_days, auth.uid(), 'Renouvellement');
  end if;

  update renewal_requests
    set status = 'traitee', treated_at = now(), treated_by = auth.uid()
  where student_id = p_student_id and status = 'en_attente';

  insert into audit_log (actor_id, action, target_table, target_id, details)
  values (auth.uid(), 'renew_subscription', 'meal_accounts', v_meal_account_id,
          json_build_object('student_id', p_student_id, 'plan_id', p_plan_id));

  return json_build_object('meal_account_id', v_meal_account_id, 'expires_at', current_date + v_plan.duration_days);
end;
$$;
