-- =============================================
-- TITAN AUTORENT — Schema
-- Run this in Supabase SQL Editor
-- =============================================

-- Cars
create table cars (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  name text not null,
  plate text not null,
  daily_rate numeric not null default 0,
  rest_day int not null default 0, -- 0=Sun, 1=Mon, ..., 6=Sat
  created_at timestamptz default now()
);

-- Drivers
create table drivers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  name text not null,
  phone text,
  created_at timestamptz default now()
);

-- Car ↔ Driver assignments (periods)
create table assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  car_id uuid references cars on delete cascade not null,
  driver_id uuid references drivers on delete cascade not null,
  started_at date not null,
  ended_at date, -- null = currently active
  created_at timestamptz default now()
);

-- Rental payments
create table payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  assignment_id uuid references assignments on delete cascade not null,
  date date not null,
  amount numeric not null check (amount > 0),
  note text,
  created_at timestamptz default now()
);

-- Car expenses
create table expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  car_id uuid references cars on delete cascade not null,
  date date not null,
  category text not null,
  amount numeric not null check (amount > 0),
  note text,
  created_at timestamptz default now()
);

-- Maintenance work types per car (with km interval)
create table maintenance_works (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  car_id uuid references cars on delete cascade not null,
  name text not null,
  interval_km int not null,
  created_at timestamptz default now()
);

-- Maintenance records
create table maintenance_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  car_id uuid references cars on delete cascade not null,
  date date not null,
  mileage int not null,
  works text[] not null default '{}',
  cost numeric,
  note text,
  created_at timestamptz default now()
);

-- =============================================
-- Row Level Security
-- =============================================
alter table cars enable row level security;
alter table drivers enable row level security;
alter table assignments enable row level security;
alter table payments enable row level security;
alter table expenses enable row level security;
alter table maintenance_works enable row level security;
alter table maintenance_records enable row level security;

create policy "own cars" on cars for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own drivers" on drivers for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own assignments" on assignments for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own payments" on payments for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own expenses" on expenses for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own maintenance_works" on maintenance_works for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own maintenance_records" on maintenance_records for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
