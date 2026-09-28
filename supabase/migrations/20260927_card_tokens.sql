-- Halqen NFC card tokens
-- Adds support for physical NFC cards that resolve directly to a profile via
-- a unique token, as an alternative entry point alongside the existing
-- 4-digit identity_codes flow. A card_token can belong to either an
-- individual identity or a company employee, never both.
--
-- Run this once in the Supabase SQL editor for the halqen.com project.

create table if not exists public.card_tokens (
  id uuid primary key default gen_random_uuid(),
  identity_id uuid references public.identities(id) on delete cascade,
  employee_id uuid references public.employees(id) on delete cascade,
  token uuid not null default gen_random_uuid(),
  label text,
  is_active boolean not null default true,
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  constraint unique_card_token unique (token),
  constraint card_token_owner_check check (
    (identity_id is not null and employee_id is null) or
    (identity_id is null and employee_id is not null)
  )
);

create index if not exists card_tokens_identity_id_idx on public.card_tokens(identity_id);
create index if not exists card_tokens_employee_id_idx on public.card_tokens(employee_id);

alter table public.card_tokens enable row level security;

-- RLS policies only take effect on top of a base GRANT — without this,
-- Postgres blocks access before the policies below are ever evaluated,
-- producing "permission denied for table card_tokens" for every logged-in
-- user regardless of ownership.
grant select, insert, update, delete on public.card_tokens to authenticated;

-- An identity owner manages card tokens for their own identities only.
drop policy if exists owner_manages_own_identity_card_tokens on public.card_tokens;
create policy owner_manages_own_identity_card_tokens
  on public.card_tokens
  for all
  using (
    identity_id is not null
    and exists (
      select 1 from public.identities i
      where i.id = card_tokens.identity_id and i.owner_id = auth.uid()
    )
  )
  with check (
    identity_id is not null
    and exists (
      select 1 from public.identities i
      where i.id = card_tokens.identity_id and i.owner_id = auth.uid()
    )
  );

-- A company admin manages card tokens for their own employees only.
drop policy if exists admin_manages_own_employee_card_tokens on public.card_tokens;
create policy admin_manages_own_employee_card_tokens
  on public.card_tokens
  for all
  using (
    employee_id is not null
    and exists (
      select 1 from public.employees e
      join public.companies c on c.id = e.company_id
      where e.id = card_tokens.employee_id and c.admin_id = auth.uid()
    )
  )
  with check (
    employee_id is not null
    and exists (
      select 1 from public.employees e
      join public.companies c on c.id = e.company_id
      where e.id = card_tokens.employee_id and c.admin_id = auth.uid()
    )
  );

-- Resolves a tapped NFC card token to the profile it belongs to, mirroring
-- verify_code's shape and rate-limiting behavior so /api/verify-card can
-- reuse the exact same request/response handling as /api/verify-code.
create or replace function public.verify_card_token(input_token uuid, client_ip_hash text)
returns table (
  kind text,
  business text,
  display_name text,
  title text,
  phone text,
  email text,
  color text,
  photo_url text,
  brand text,
  bio text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  recent_failures int;
  matched_card record;
begin
  select count(*) into recent_failures
  from public.failed_attempts
  where ip_hash = client_ip_hash
    and attempted_at > now() - interval '15 minutes';

  if recent_failures >= 10 then
    raise exception 'Too many attempts. Try again later.';
  end if;

  select * into matched_card
  from public.card_tokens
  where token = input_token and is_active = true and revoked_at is null;

  if matched_card is null then
    insert into public.failed_attempts (ip_hash, attempted_at) values (client_ip_hash, now());
    return;
  end if;

  update public.card_tokens set last_used_at = now() where id = matched_card.id;

  if matched_card.identity_id is not null then
    insert into public.access_logs (identity_id, accessed_at, success)
    values (matched_card.identity_id, now(), true);

    return query
    select 'identity'::text, i.business, i.display_name, i.title, i.phone, i.email, i.color, i.photo_url, null::text, i.bio
    from public.identities i
    where i.id = matched_card.identity_id and i.is_active = true;
  else
    -- Employees have no bio field and companies carry a brand_color, not a
    -- bio/brand name, so those two output columns are simply left blank here.
    return query
    select 'employee'::text, c.company_name, e.name, e.role, e.phone, e.email, e.color, e.photo_url, c.brand_color, null::text
    from public.employees e
    join public.companies c on c.id = e.company_id
    where e.id = matched_card.employee_id and e.employment_status = 'active';
  end if;
end;
$$;
