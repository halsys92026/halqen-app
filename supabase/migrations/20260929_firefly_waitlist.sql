-- Halqen Firefly waitlist: lets a signed-in user ask to be notified when
-- Firefly launches, while the feature itself stays gated behind the
-- "coming soon" placeholder (see FIREFLY_LAUNCHED in
-- src/app/firefly/page.tsx). Run this once, after 20260929_firefly_v2.sql,
-- in the Supabase SQL editor for the halqen.com project.
--
-- No table has direct grants to anon/authenticated, same pattern as the
-- rest of the Firefly schema -- access only through the RPC functions
-- below, each of which runs as the caller (auth.uid()) and nothing else.

create table if not exists public.firefly_waitlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now()
);

alter table public.firefly_waitlist enable row level security;
revoke all on public.firefly_waitlist from anon, authenticated;

-- Whether the current user has already asked to be kept posted.
create or replace function public.firefly_waitlist_status()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.firefly_waitlist where user_id = auth.uid()
  );
$$;

-- Add the current user to the waitlist (idempotent). Pulls the email off
-- their own auth account rather than trusting client input.
create or replace function public.firefly_join_waitlist()
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_email text;
begin
  select email into v_email from auth.users where id = auth.uid();
  if v_email is null then
    raise exception 'No account email found for this user';
  end if;

  insert into public.firefly_waitlist (user_id, email)
  values (auth.uid(), v_email)
  on conflict (user_id) do nothing;
end;
$$;

revoke execute on function public.firefly_waitlist_status() from public, anon;
grant execute on function public.firefly_waitlist_status() to authenticated;

revoke execute on function public.firefly_join_waitlist() from public, anon;
grant execute on function public.firefly_join_waitlist() to authenticated;
