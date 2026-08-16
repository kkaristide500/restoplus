-- ============================================================
-- RestoPlus — Schéma initial
-- Phase 5 : structure uniquement (RLS + logique fine = Phase 6)
-- ============================================================

create extension if not exists "uuid-ossp";

-- ---------- Rôles & comptes ----------
create type user_role as enum ('student', 'staff_admin', 'restaurant_staff');
create type meal_slot as enum ('petit_dejeuner', 'dejeuner', 'diner');
create type transaction_type as enum ('credit', 'debit', 'correction');
create type order_status as enum ('nouvelle', 'confirmee', 'en_preparation', 'prete', 'recuperee_livree', 'annulee');
create type withdrawal_mode as enum ('retrait_restaurant', 'livraison_bureau');
create type declared_payment_mode as enum ('especes', 'wave', 'orange_money');

create table users (
  id uuid primary key default uuid_generate_v4(),
  email text unique not null,
  role user_role not null,
  full_name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table student_profiles (
  user_id uuid primary key references users(id) on delete cascade,
  matricule text unique not null,
  classe text
);

create table staff_profiles (
  user_id uuid primary key references users(id) on delete cascade,
  service text,
  bureau text,
  batiment text
);

-- ---------- Menus ----------
create table menus (
  id uuid primary key default uuid_generate_v4(),
  date date not null,
  slot meal_slot not null,
  category text not null check (category in ('eleve', 'administration')),
  is_published boolean not null default false,
  created_at timestamptz not null default now()
);

create table menu_items (
  id uuid primary key default uuid_generate_v4(),
  menu_id uuid not null references menus(id) on delete cascade,
  name text not null,
  description text,
  price numeric(10,2) not null,
  photo_url text,
  is_available boolean not null default true
);

-- ---------- Abonnements élèves ----------
create table subscription_plans (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  includes_petit_dejeuner boolean not null default false,
  includes_dejeuner boolean not null default true,
  includes_diner boolean not null default true,
  duration_days int not null,
  price numeric(10,2) not null
);

create table meal_accounts (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid not null references users(id) on delete cascade,
  plan_id uuid not null references subscription_plans(id),
  expires_at date not null,
  created_at timestamptz not null default now()
);

-- Le solde n'est JAMAIS stocké directement : uniquement des transactions.
create table transactions (
  id uuid primary key default uuid_generate_v4(),
  meal_account_id uuid not null references meal_accounts(id) on delete cascade,
  type transaction_type not null,
  slot meal_slot,               -- null si transaction globale (ex: renouvellement)
  amount int not null,          -- en nombre de repas (positif = crédit, négatif = débit)
  created_by uuid references users(id),
  note text,
  created_at timestamptz not null default now()
);

-- ---------- Commandes (Administration) ----------
create table orders (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  status order_status not null default 'nouvelle',
  withdrawal_mode withdrawal_mode not null,
  declared_payment_mode declared_payment_mode not null,
  total_amount numeric(10,2) not null default 0,
  created_at timestamptz not null default now()
);

create table order_items (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references orders(id) on delete cascade,
  menu_item_id uuid not null references menu_items(id),
  quantity int not null check (quantity > 0),
  unit_price numeric(10,2) not null
);

create table delivery_requests (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references orders(id) on delete cascade,
  batiment text not null,
  bureau text not null,
  etage text,
  note text
);

-- ---------- Consommations élèves (scan QR) ----------
create table meal_consumptions (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid not null references users(id) on delete cascade,
  menu_item_id uuid references menu_items(id),
  slot meal_slot not null,
  scanned_by uuid references users(id),
  scan_token text unique not null,   -- anti double-scan (contrainte d'unicité)
  created_at timestamptz not null default now()
);

-- ---------- QR Codes ----------
create table qr_codes (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid unique references users(id) on delete cascade, -- null si QR public
  is_public boolean not null default false,
  code_value text unique not null,
  is_active boolean not null default true
);

-- ---------- Notifications ----------
create table notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  type text not null,
  content text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------- Avis ----------
create table reviews (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  order_id uuid references orders(id),
  meal_consumption_id uuid references meal_consumptions(id),
  rating int not null check (rating between 1 and 5),
  comment text,
  is_hidden boolean not null default false,
  created_at timestamptz not null default now(),
  check (order_id is not null or meal_consumption_id is not null)
);

-- ---------- Marketing ----------
create table marketing_campaigns (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  target_role user_role,
  message text not null,
  is_active boolean not null default false,
  max_frequency_per_week int default 1
);

-- ---------- Traçabilité ----------
create table audit_log (
  id uuid primary key default uuid_generate_v4(),
  actor_id uuid references users(id),
  action text not null,
  target_table text not null,
  target_id uuid,
  details jsonb,
  created_at timestamptz not null default now()
);

-- ============================================================
-- TODO Phase 6 :
--  - Activer Row Level Security sur toutes les tables sensibles
--  - Écrire les policies par rôle (student / staff_admin / restaurant_staff)
--  - Edge Function `consume_meal(scan_token)` : seule voie autorisée pour
--    créer une ligne meal_consumptions + transaction de débit associée
--  - Edge Function `renew_subscription(...)` avec audit_log automatique
-- ============================================================
