-- Run ONLY on a new dedicated CCTV Manager Pro Supabase project.
create extension if not exists pgcrypto;
create schema if not exists private;
create type public.staff_role as enum ('admin','office','technician');
create type public.job_kind as enum ('breakdown','site_visit','installation');
create type public.job_status as enum ('pending','assigned','in_progress','completed','cancelled');
create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 full_name text not null check (length(trim(full_name)) between 1 and 120),
 role public.staff_role not null default 'technician',
 active boolean not null default false,
 created_at timestamptz not null default now()
);
create table public.customers (
 id uuid primary key default gen_random_uuid(),
 name text not null check(length(trim(name))>0),
 phone text,
 address text,
 notes text,
 created_at timestamptz not null default now()
);
create table public.jobs (
 id uuid primary key default gen_random_uuid(),
 job_number text not null unique,
 customer_id uuid not null references public.customers(id),
 title text not null check(length(trim(title))>0),
 description text,
 kind public.job_kind not null,
 status public.job_status not null default 'pending',
 priority text not null default 'normal' check(priority in ('low','normal','high','urgent')),
 scheduled_at timestamptz,
 created_by uuid not null references public.profiles(id),
 created_at timestamptz not null default now()
);
create table public.job_assignments (
 job_id uuid not null references public.jobs(id) on delete cascade,
 technician_id uuid not null references public.profiles(id),
 assigned_by uuid not null references public.profiles(id),
 assigned_at timestamptz not null default now(),
 primary key(job_id,technician_id)
);
create table public.job_updates (
 id uuid primary key default gen_random_uuid(),
 job_id uuid not null references public.jobs(id) on delete cascade,
 author_id uuid not null default auth.uid() references public.profiles(id),
 note text not null check(length(trim(note))>0),
 status public.job_status,
 created_at timestamptz not null default now()
);
create index on public.jobs(customer_id);
create index on public.jobs(created_at desc);
create index on public.job_assignments(technician_id);
create index on public.job_updates(job_id,created_at desc);

-- Role lookups use a non-exposed schema to avoid recursive profile RLS.
create or replace function private.current_role() returns public.staff_role
language sql stable security definer set search_path = ''
as $$ select p.role from public.profiles p where p.id=(select auth.uid()) and p.active=true $$;
create or replace function private.is_assigned(target_job uuid) returns boolean
language sql stable security definer set search_path = ''
as $$ select exists(select 1 from public.job_assignments a join public.profiles p on p.id=a.technician_id where a.job_id=target_job and a.technician_id=(select auth.uid()) and p.active=true) $$;
revoke all on function private.current_role() from public,anon;
revoke all on function private.is_assigned(uuid) from public,anon;
grant usage on schema private to authenticated;
grant execute on function private.current_role() to authenticated;
grant execute on function private.is_assigned(uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.customers enable row level security;
alter table public.jobs enable row level security;
alter table public.job_assignments enable row level security;
alter table public.job_updates enable row level security;

create policy profiles_read on public.profiles for select to authenticated
 using(id=(select auth.uid()) or (select private.current_role()) in ('admin','office'));
-- Profiles and role assignments must be provisioned by trusted admin operations only.
create policy customers_read on public.customers for select to authenticated
 using((select private.current_role()) in ('admin','office'));
create policy customers_insert on public.customers for insert to authenticated
 with check((select private.current_role()) in ('admin','office'));
create policy customers_update on public.customers for update to authenticated
 using((select private.current_role()) in ('admin','office'))
 with check((select private.current_role()) in ('admin','office'));

create policy jobs_read on public.jobs for select to authenticated
 using((select private.current_role()) in ('admin','office') or (select private.is_assigned(id)));
create policy jobs_insert on public.jobs for insert to authenticated
 with check((select private.current_role()) in ('admin','office') and created_by=(select auth.uid()));
create policy jobs_update on public.jobs for update to authenticated
 using((select private.current_role()) in ('admin','office'))
 with check((select private.current_role()) in ('admin','office'));

create policy assignments_read on public.job_assignments for select to authenticated
 using((select private.current_role()) in ('admin','office') or technician_id=(select auth.uid()));
create policy assignments_insert on public.job_assignments for insert to authenticated
 with check((select private.current_role()) in ('admin','office') and assigned_by=(select auth.uid())
 and exists(select 1 from public.profiles p where p.id=technician_id and p.role='technician' and p.active));
create policy assignments_delete on public.job_assignments for delete to authenticated
 using((select private.current_role()) in ('admin','office'));

create policy updates_read on public.job_updates for select to authenticated
 using((select private.current_role()) in ('admin','office') or (select private.is_assigned(job_id)));
create policy updates_insert on public.job_updates for insert to authenticated
 with check(author_id=(select auth.uid()) and ((select private.current_role()) in ('admin','office') or (select private.is_assigned(job_id))));

-- Do not grant browser clients permission to edit role profiles.
revoke all on public.profiles from anon,authenticated;
grant select on public.profiles to authenticated;
grant select,insert,update on public.customers,public.jobs to authenticated;
grant select,insert,delete on public.job_assignments to authenticated;
grant select,insert on public.job_updates to authenticated;
-- Explicitly deny anonymous access.
revoke all on public.customers,public.jobs,public.job_assignments,public.job_updates from anon;
