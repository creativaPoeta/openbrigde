create extension if not exists pgcrypto;

create or replace function public.set_current_timestamp_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.account_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text,
  workspace_name text,
  plan_key text not null default 'starter',
  monthly_event_limit integer,
  billing_status text not null default 'trial',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.account_profiles
  add column if not exists email text,
  add column if not exists workspace_name text,
  add column if not exists plan_key text not null default 'starter',
  add column if not exists monthly_event_limit integer,
  add column if not exists billing_status text not null default 'trial',
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.short_links (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete cascade,
  slug text not null unique,
  title text,
  description text,
  destination_type text not null,
  destination_value text not null,
  cta_label text,
  campaign text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.short_links
  add column if not exists owner_id uuid references auth.users(id) on delete cascade;

create table if not exists public.link_events (
  id bigint generated always as identity primary key,
  link_id uuid references public.short_links(id) on delete cascade,
  slug_snapshot text,
  event_type text not null,
  destination_url text,
  page_url text,
  referrer text,
  user_agent text,
  source_app text,
  os text,
  browser text,
  in_app boolean not null default false,
  event_meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists short_links_slug_idx on public.short_links (slug);
create index if not exists account_profiles_plan_key_idx on public.account_profiles (plan_key);
create index if not exists short_links_owner_id_idx on public.short_links (owner_id, created_at desc);
create index if not exists link_events_created_at_idx on public.link_events (created_at desc);
create index if not exists link_events_slug_snapshot_idx on public.link_events (slug_snapshot);
create index if not exists link_events_link_id_idx on public.link_events (link_id, created_at desc);

alter table public.account_profiles enable row level security;
alter table public.short_links enable row level security;
alter table public.link_events enable row level security;

drop trigger if exists set_account_profiles_updated_at on public.account_profiles;
create trigger set_account_profiles_updated_at
before update on public.account_profiles
for each row
execute function public.set_current_timestamp_updated_at();

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'account_profiles'
      and policyname = 'owners_read_account_profiles'
  ) then
    create policy owners_read_account_profiles
      on public.account_profiles
      for select
      to authenticated
      using (user_id = auth.uid());
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'account_profiles'
      and policyname = 'owners_insert_account_profiles'
  ) then
    create policy owners_insert_account_profiles
      on public.account_profiles
      for insert
      to authenticated
      with check (user_id = auth.uid());
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'account_profiles'
      and policyname = 'owners_update_account_profiles'
  ) then
    create policy owners_update_account_profiles
      on public.account_profiles
      for update
      to authenticated
      using (user_id = auth.uid())
      with check (user_id = auth.uid());
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'short_links'
      and policyname = 'public_read_active_short_links'
  ) then
    create policy public_read_active_short_links
      on public.short_links
      for select
      to anon, authenticated
      using (is_active = true or owner_id = auth.uid());
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'short_links'
      and policyname = 'owners_insert_short_links'
  ) then
    create policy owners_insert_short_links
      on public.short_links
      for insert
      to authenticated
      with check (owner_id = auth.uid());
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'short_links'
      and policyname = 'owners_update_short_links'
  ) then
    create policy owners_update_short_links
      on public.short_links
      for update
      to authenticated
      using (owner_id = auth.uid())
      with check (owner_id = auth.uid());
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'short_links'
      and policyname = 'owners_delete_short_links'
  ) then
    create policy owners_delete_short_links
      on public.short_links
      for delete
      to authenticated
      using (owner_id = auth.uid());
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'link_events'
      and policyname = 'owners_read_link_events'
  ) then
    create policy owners_read_link_events
      on public.link_events
      for select
      to authenticated
      using (
        exists (
          select 1
          from public.short_links
          where public.short_links.id = public.link_events.link_id
            and public.short_links.owner_id = auth.uid()
        )
      );
  end if;
end
$$;

comment on table public.account_profiles is 'Owner-scoped billing and plan metadata for OpenBridge workspaces.';
comment on table public.short_links is 'Owner-scoped smart links used by OpenBridge accounts.';
comment on table public.link_events is 'Public click and handoff telemetry linked back to an owner through short_links.link_id.';
