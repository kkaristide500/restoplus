-- ============================================================
-- Module 6 — Historique/Notifications & Avis
-- RLS avis + notifications générées automatiquement côté serveur
-- ============================================================

-- ---------- Policies : reviews ----------
alter table reviews enable row level security;

-- Public (y compris anonyme) : voit les avis non masqués (ex: note moyenne affichée)
create policy "reviews_select_public" on reviews
  for select using (is_hidden = false);

create policy "reviews_select_staff_all" on reviews
  for select using (auth_user_role() = 'restaurant_staff');

-- Un utilisateur ne peut noter QUE sa propre commande livrée, ou son propre repas consommé.
create policy "reviews_insert_own" on reviews
  for insert with check (
    user_id = auth.uid()
    and (
      (order_id is not null and exists(
        select 1 from orders where id = order_id and user_id = auth.uid() and status = 'recuperee_livree'
      ))
      or
      (meal_consumption_id is not null and exists(
        select 1 from meal_consumptions where id = meal_consumption_id and student_id = auth.uid()
      ))
    )
  );

-- Seul le staff peut modérer (masquer/démasquer) un avis.
create policy "reviews_update_staff_moderate" on reviews
  for update using (auth_user_role() = 'restaurant_staff')
  with check (auth_user_role() = 'restaurant_staff');

-- ============================================================
-- Notifications automatiques (déclenchées côté serveur, jamais par le client)
-- ============================================================

-- ---------- 1. Changement de statut d'une commande ----------
create or replace function notify_order_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_label text;
begin
  if new.status = old.status then
    return new;
  end if;

  v_label := case new.status
    when 'confirmee' then 'Ta commande a été confirmée.'
    when 'en_preparation' then 'Ta commande est en cours de préparation.'
    when 'prete' then 'Ta commande est prête !'
    when 'recuperee_livree' then 'Ta commande a été récupérée/livrée. Bon appétit !'
    when 'annulee' then 'Ta commande a été annulée.'
    else null
  end;

  if v_label is not null then
    insert into notifications (user_id, type, content)
    values (new.user_id, 'order_status', v_label);
  end if;

  return new;
end;
$$;

create trigger on_order_status_change
  after update on orders
  for each row execute function notify_order_status_change();

-- ---------- 2. Publication d'un nouveau menu ----------
create or replace function notify_menu_published()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_target_role user_role;
begin
  if new.is_published = true and (old.is_published is distinct from true) then
    v_target_role := case new.category when 'eleve' then 'student' else 'staff_admin' end;

    insert into notifications (user_id, type, content)
    select id, 'new_menu', 'Le menu de ' || new.date || ' vient d''être publié.'
    from users
    where role = v_target_role and is_active = true;
  end if;

  return new;
end;
$$;

create trigger on_menu_published
  after update on menus
  for each row execute function notify_menu_published();

-- ---------- 3. Solde faible après un scan (déclenché depuis consume_meal) ----------
-- Ajout d'une notification directement dans la fonction consume_meal existante :
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
  v_low_balance_threshold constant int := 5;
begin
  if auth_user_role() <> 'restaurant_staff' then
    raise exception 'Action réservée au personnel du restaurant';
  end if;

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

  -- Notification "solde faible" si on passe sous le seuil
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
