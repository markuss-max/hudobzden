-- ============================================================================
-- Лапка & Пончик — Supabase Schema + RLS + Realtime
-- Выполните этот скрипт целиком в Supabase SQL Editor
-- ============================================================================

create extension if not exists "pgcrypto";

-- 1. Комнаты пар
create table if not exists public.couples (
  id uuid primary key default gen_random_uuid(),
  invite_code text unique not null,
  streak_days integer not null default 0,
  wishlist_title text not null default 'Читмил-вечер и кино 🍿',
  wishlist_target_days integer not null default 7,
  last_streak_date date,
  created_at timestamptz not null default now()
);

-- 2. Профили пользователей
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  couple_id uuid references public.couples(id) on delete set null,
  display_name text not null default 'Малыш',
  avatar text not null default '🐰',
  daily_limit integer not null default 1800,
  privacy_mode boolean not null default false,
  weekend_stash integer not null default 0,
  sex text default 'female',
  age integer default 25,
  height_cm integer default 168,
  current_weight numeric(5,2),
  target_weight numeric(5,2),
  activity text default 'light',
  updated_at timestamptz not null default now()
);

-- 3. Дневник еды (только калории)
create table if not exists public.food_logs (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  log_date date not null default current_date,
  name text not null,
  calories integer not null check (calories >= 0),
  created_at timestamptz not null default now()
);

create index if not exists idx_food_logs_couple_date on public.food_logs(couple_id, log_date);

-- 4. Избранные блюда / шаблоны
create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  calories integer not null check (calories >= 0),
  created_at timestamptz not null default now()
);

-- 5. Общая кухня (блюда на двоих)
create table if not exists public.shared_dishes (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  unit text not null default 'г',
  total_amount numeric(8,2) not null,
  remaining_amount numeric(8,2) not null,
  total_calories integer not null,
  remaining_calories integer not null,
  created_at timestamptz not null default now()
);

-- 6. Трекер веса
create table if not exists public.weight_logs (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  log_date date not null default current_date,
  weight_kg numeric(5,2) not null,
  created_at timestamptz not null default now()
);

-- 7. Трекер воды
create table if not exists public.water_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  log_date date not null default current_date,
  cups integer not null default 0,
  unique(user_id, log_date)
);

-- 8. Быстрые реакции пары
create table if not exists public.reactions (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  from_user_id uuid not null references public.profiles(id) on delete cascade,
  to_user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  message text not null,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================
alter table public.couples enable row level security;
alter table public.profiles enable row level security;
alter table public.food_logs enable row level security;
alter table public.favorites enable row level security;
alter table public.shared_dishes enable row level security;
alter table public.weight_logs enable row level security;
alter table public.water_logs enable row level security;
alter table public.reactions enable row level security;

create or replace function public.my_couple_id()
returns uuid
language sql
stable
security definer
as $$
  select couple_id from public.profiles where id = auth.uid();
$$;

-- Couples: любой авторизованный может создать или найти по коду, читать/обновлять свою пару
create policy "couples_select" on public.couples for select to authenticated using (true);
create policy "couples_insert" on public.couples for insert to authenticated with check (true);
create policy "couples_update" on public.couples for update to authenticated using (id = public.my_couple_id());

-- Profiles: свой профиль + профиль партнёра в той же комнате
create policy "profiles_select" on public.profiles for select to authenticated
  using (id = auth.uid() or couple_id = public.my_couple_id());
create policy "profiles_upsert" on public.profiles for insert to authenticated
  with check (id = auth.uid());
create policy "profiles_update" on public.profiles for update to authenticated
  using (id = auth.uid());

-- Food logs: чтение в рамках пары, запись/удаление своих записей
create policy "food_select" on public.food_logs for select to authenticated
  using (couple_id = public.my_couple_id());
create policy "food_insert" on public.food_logs for insert to authenticated
  with check (user_id = auth.uid() and couple_id = public.my_couple_id());
create policy "food_delete" on public.food_logs for delete to authenticated
  using (user_id = auth.uid());

-- Favorites: только свои
create policy "fav_all" on public.favorites for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Shared dishes: общие внутри пары
create policy "dishes_all" on public.shared_dishes for all to authenticated
  using (couple_id = public.my_couple_id()) with check (couple_id = public.my_couple_id());

-- Weight logs: чтение в паре, запись своих
create policy "weight_select" on public.weight_logs for select to authenticated
  using (couple_id = public.my_couple_id());
create policy "weight_insert" on public.weight_logs for insert to authenticated
  with check (user_id = auth.uid() and couple_id = public.my_couple_id());
create policy "weight_update" on public.weight_logs for update to authenticated
  using (user_id = auth.uid());

-- Water logs: только свои
create policy "water_all" on public.water_logs for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Reactions: внутри пары
create policy "reactions_all" on public.reactions for all to authenticated
  using (couple_id = public.my_couple_id()) with check (couple_id = public.my_couple_id());

-- ============================================================================
-- Включение Realtime для мгновенной синхронизации
-- ============================================================================
alter publication supabase_realtime add table public.couples;
alter publication supabase_realtime add table public.profiles;
alter publication supabase_realtime add table public.food_logs;
alter publication supabase_realtime add table public.shared_dishes;
alter publication supabase_realtime add table public.reactions;

