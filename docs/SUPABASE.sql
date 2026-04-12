create extension if not exists pgcrypto;

create table if not exists public.short_links (
  id uuid primary key default gen_random_uuid(),
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
create index if not exists link_events_created_at_idx on public.link_events (created_at desc);
create index if not exists link_events_slug_snapshot_idx on public.link_events (slug_snapshot);

alter table public.short_links enable row level security;
alter table public.link_events enable row level security;
