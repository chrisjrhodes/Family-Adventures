-- Run this once in Supabase SQL Editor.

create table if not exists public.secret_missions (
  holiday_id text not null,
  profile_id text not null,
  mission text not null check (char_length(mission) between 1 and 220),
  updated_at timestamptz not null default now(),
  primary key (holiday_id, profile_id)
);

alter table public.secret_missions enable row level security;

create policy "Public can read secret missions"
on public.secret_missions for select
to anon
using (true);

create policy "Public can add secret missions"
on public.secret_missions for insert
to anon
with check (true);

create policy "Public can update secret missions"
on public.secret_missions for update
to anon
using (true)
with check (true);
