-- =========================================================================
-- NINETY — 90-Day Athletic & Recovery Regimen
-- Supabase Database Schema & Security Policies (Row Level Security)
-- =========================================================================

-- 1. Enable UUID Extension
create extension if not exists "uuid-ossp";

-- 2. Profiles Table (Holds User Status & Admin Role)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  role text default 'member' check (role in ('admin', 'member')),
  status text default 'pending' check (status in ('pending', 'approved', 'revoked')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on Profiles
alter table public.profiles enable row level security;

-- Security Definer Function to Check Admin Status
-- (Prevents infinite recursion in RLS policies)
create or replace function public.is_admin()
returns boolean as $$
begin
  return exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
end;
$$ language plpgsql security definer;

-- Policies for Profiles:
-- Any authenticated user can read their own profile
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

-- Admins can view all profiles
create policy "Admins can view all profiles"
  on public.profiles for select
  using (public.is_admin());

-- Admins can update any profile (approve, revoke, change role)
create policy "Admins can update profiles"
  on public.profiles for update
  using (public.is_admin());

-- Admins can delete profiles
create policy "Admins can delete profiles"
  on public.profiles for delete
  using (public.is_admin());

-- 3. Daily Logs Table (Stores Workouts, Sleep, Water, Exercises per user per date)
create table if not exists public.daily_logs (
  id bigint generated always as identity primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  date date not null,
  workout_done boolean default false,
  sleep numeric(4, 2) default 7.0,
  water numeric(4, 2) default 2.75,
  checked_exercises jsonb default '[]'::jsonb,
  checked_diet jsonb default '[]'::jsonb,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint unique_user_date unique (user_id, date)
);

-- Enable RLS on Daily Logs
alter table public.daily_logs enable row level security;

-- Policies for Daily Logs:
-- Users can only read, insert, update, or delete their own logs
create policy "Users can view own logs"
  on public.daily_logs for select
  using (auth.uid() = user_id);

create policy "Users can insert own logs"
  on public.daily_logs for insert
  with check (auth.uid() = user_id);

create policy "Users can update own logs"
  on public.daily_logs for update
  using (auth.uid() = user_id);

create policy "Users can delete own logs"
  on public.daily_logs for delete
  using (auth.uid() = user_id);

-- Admins can view all logs (for progress monitoring)
create policy "Admins can view all logs"
  on public.daily_logs for select
  using (public.is_admin());

-- 4. User Regimen Configuration Table (Start date, frozen dates, custom splits)
create table if not exists public.user_regimens (
  user_id uuid references public.profiles(id) on delete cascade primary key,
  start_date date not null,
  frozen_dates jsonb default '{}'::jsonb,
  custom_workouts jsonb default '{}'::jsonb,
  custom_diets jsonb default '{}'::jsonb,
  custom_dos jsonb default '[]'::jsonb,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on User Regimens
alter table public.user_regimens enable row level security;

create policy "Users can view own regimen"
  on public.user_regimens for select
  using (auth.uid() = user_id);

create policy "Users can insert own regimen"
  on public.user_regimens for insert
  with check (auth.uid() = user_id);

create policy "Users can update own regimen"
  on public.user_regimens for update
  using (auth.uid() = user_id);

-- 5. Helper RPC Functions for Safe Client Interactions

-- Get total approved member count (accessible to both anon and authenticated users)
create or replace function public.get_approved_member_count()
returns integer as $$
declare
  total_count integer;
begin
  select count(*) into total_count from public.profiles where status = 'approved';
  return total_count;
end;
$$ language plpgsql security definer;

-- Admin approve member RPC (strictly enforces max 20 capacity limit)
create or replace function public.admin_approve_member(target_user_id uuid)
returns jsonb as $$
declare
  approved_count integer;
begin
  if not public.is_admin() then
    raise exception 'Unauthorized: Only cohort administrators can approve members.';
  end if;

  select count(*) into approved_count from public.profiles where status = 'approved';
  if approved_count >= 20 then
    raise exception 'Cohort capacity limit reached (20/20 active members). An existing member spot must be revoked first.';
  end if;

  update public.profiles
  set status = 'approved'
  where id = target_user_id;

  return jsonb_build_object('success', true, 'message', 'Member approved successfully');
end;
$$ language plpgsql security definer;

-- Admin revoke member RPC
create or replace function public.admin_revoke_member(target_user_id uuid)
returns jsonb as $$
begin
  if not public.is_admin() then
    raise exception 'Unauthorized: Only cohort administrators can revoke members.';
  end if;

  update public.profiles
  set status = 'revoked'
  where id = target_user_id;

  return jsonb_build_object('success', true, 'message', 'Member revoked successfully');
end;
$$ language plpgsql security definer;

-- Admin delete member RPC
create or replace function public.admin_delete_member(target_user_id uuid)
returns jsonb as $$
begin
  if not public.is_admin() then
    raise exception 'Unauthorized: Only cohort administrators can delete member registrations.';
  end if;

  delete from public.profiles where id = target_user_id;

  return jsonb_build_object('success', true, 'message', 'Member registration deleted');
end;
$$ language plpgsql security definer;

-- Grant execution permissions on RPC functions
grant execute on function public.is_admin to authenticated;
grant execute on function public.get_approved_member_count to anon, authenticated;
grant execute on function public.admin_approve_member to authenticated;
grant execute on function public.admin_revoke_member to authenticated;
grant execute on function public.admin_delete_member to authenticated;

-- 6. Trigger: Automatically Create Profile on User Sign-Up
-- The FIRST registered user automatically becomes 'admin' and 'approved'.
-- Every subsequent user is created with 'member' role and 'pending' status.
create or replace function public.handle_new_user()
returns trigger as $$
declare
  user_count integer;
begin
  select count(*) into user_count from public.profiles;

  if new.email = 'koineniarjun08@gmail.com' then
    -- The specified user is the Primary Admin and auto-approved
    insert into public.profiles (id, email, role, status)
    values (new.id, new.email, 'admin', 'approved');
  else
    -- All other users require admin permission
    insert into public.profiles (id, email, role, status)
    values (new.id, new.email, 'member', 'pending');
  end if;

  return new;
end;
$$ language plpgsql security definer;

-- Drop trigger if exists and recreate
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =========================================================================
-- Schema setup complete!
-- =========================================================================
