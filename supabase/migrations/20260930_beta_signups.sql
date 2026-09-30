-- Halqen beta tester intake
-- Public, unauthenticated signup form at /beta. Follows the same zero-trust
-- pattern as the rest of the schema: no direct grants to anon/authenticated
-- on the table itself, all access through a security definer RPC. Unlike
-- every other RPC in this project so far, this one is granted to `anon`
-- (mirroring the existing verify_code function, which /api/verify-code calls
-- through the anon-key supabase client in src/lib/supabaseClient.ts — that is
-- the established, working precedent for public/logged-out access in this
-- schema) since beta signups come from people who don't have an account yet.
--
-- Run this once in the Supabase SQL editor for the halqen.com project.

create table if not exists public.beta_signups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  area text,
  use_case text,
  platform text,
  heard_from text,
  notes text,
  ip_hash text,
  status text not null default 'new',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint unique_beta_signup_email unique (lower(email))
);

create index if not exists beta_signups_created_at_idx on public.beta_signups(created_at desc);

alter table public.beta_signups enable row level security;

-- No policies, no base grants to anon/authenticated — every read/write goes
-- through submit_beta_signup below (writes) or is done from the Supabase
-- dashboard directly (reads, for now — this is a low-volume intake list).
revoke all on public.beta_signups from anon, authenticated;

create or replace function public.submit_beta_signup(
  input_name text,
  input_email text,
  input_phone text,
  input_area text,
  input_use_case text,
  input_platform text,
  input_heard_from text,
  input_notes text,
  client_ip_hash text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  recent_count int;
begin
  if input_name is null or trim(input_name) = '' then
    raise exception 'Name is required.';
  end if;
  if input_email is null or trim(input_email) !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'A valid email is required.';
  end if;

  -- Lightweight abuse guard — this table has no rate-limit history table of
  -- its own (unlike verify_code/verify_card_token, which lean on
  -- failed_attempts for a brute-force scenario that doesn't apply here); a
  -- simple per-IP count over a short window is enough for a low-traffic
  -- public form.
  select count(*) into recent_count
  from public.beta_signups
  where ip_hash = client_ip_hash
    and created_at > now() - interval '10 minutes';

  if recent_count >= 5 then
    raise exception 'Too many submissions. Try again later.';
  end if;

  insert into public.beta_signups (name, email, phone, area, use_case, platform, heard_from, notes, ip_hash)
  values (trim(input_name), lower(trim(input_email)), input_phone, input_area, input_use_case, input_platform, input_heard_from, input_notes, client_ip_hash)
  on conflict (lower(email)) do update
    set name = excluded.name,
        phone = excluded.phone,
        area = excluded.area,
        use_case = excluded.use_case,
        platform = excluded.platform,
        heard_from = excluded.heard_from,
        notes = excluded.notes,
        updated_at = now();
end;
$$;

revoke execute on function public.submit_beta_signup(text, text, text, text, text, text, text, text, text) from public;
grant execute on function public.submit_beta_signup(text, text, text, text, text, text, text, text, text) to anon, authenticated;
