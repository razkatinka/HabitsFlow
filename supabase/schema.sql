-- Habit Tracker – Supabase Schema
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query)

-- habits table
create table if not exists public.habits (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  created_at  timestamptz not null default now()
);

-- habit_logs table
create table if not exists public.habit_logs (
  id         uuid primary key default gen_random_uuid(),
  habit_id   uuid not null references public.habits(id) on delete cascade,
  date       date not null,
  completed  boolean not null default false,
  unique (habit_id, date)
);

-- Row-Level Security
alter table public.habits    enable row level security;
alter table public.habit_logs enable row level security;

-- habits: users can only read/write their own rows
create policy "habits: owner access"
  on public.habits
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- habit_logs: users can only access logs for their own habits
create policy "habit_logs: owner access"
  on public.habit_logs
  for all
  using (
    exists (
      select 1 from public.habits h
      where h.id = habit_id
        and h.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.habits h
      where h.id = habit_id
        and h.user_id = auth.uid()
    )
  );
