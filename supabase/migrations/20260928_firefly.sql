-- Halqen Firefly: ping / notice / reveal, with two-way blocking.
--
-- Anyone with a Halqen account can send a ping (property managers,
-- homeowners, landlords, businesses, agents, other contractors). Only
-- providers who have an active identity, list the requested service, and
-- have switched themselves "available" (with an auto-expiring window)
-- receive it. If a provider answers, the requester sees truck-side info
-- only: business name, contact name, phone, email, verified credential types.
--
-- Blocking: after a Firefly connection, either side can block the other.
-- A block works in both directions: neither party's pings reach the other,
-- ever, until the blocker removes it. The blocked person is never told.
-- Blocks are private. They are not reviews and are never shown to anyone
-- except the person who created them.
--
-- Privacy rules enforced here:
--   * Locations are rounded to 2 decimals (~1 km) before they are stored.
--   * Availability rows are deleted when they expire or the provider goes offline.
--   * Expired pings keep only "answered yes/no"; their location, note and
--     recipient list are wiped.
--   * Connections are kept 90 days (so a block is still possible), then deleted.
--   * No table is directly readable by users; everything goes through the
--     security-definer functions below, which only ever return what the
--     caller is allowed to see.
--
-- Run this once in the Supabase SQL editor for the halqen.com project.

-- ---------------------------------------------------------------- tables

create table if not exists public.firefly_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 80),
  user_type text not null default 'other' check (user_type in (
    'property_manager', 'homeowner', 'landlord', 'business', 'real_estate_agent', 'contractor', 'other'
  )),
  -- Set only for people who also want to receive pings as a provider
  provider_identity_id uuid references public.identities(id) on delete set null,
  services text[] not null default '{}',
  updated_at timestamptz not null default now()
);

create table if not exists public.firefly_availability (
  user_id uuid primary key references auth.users(id) on delete cascade,
  lat numeric(5,2) not null,
  lng numeric(5,2) not null,
  expires_at timestamptz not null
);

create table if not exists public.firefly_pings (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id) on delete cascade,
  service text not null,
  lat numeric(5,2),
  lng numeric(5,2),
  radius_km int not null check (radius_km between 1 and 80),
  note text check (char_length(note) <= 140),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  answered boolean not null default false,
  closed_at timestamptz
);
create index if not exists firefly_pings_requester_idx on public.firefly_pings(requester_id, created_at desc);

create table if not exists public.firefly_ping_recipients (
  ping_id uuid not null references public.firefly_pings(id) on delete cascade,
  provider_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  responded_at timestamptz,
  primary key (ping_id, provider_id)
);
create index if not exists firefly_recipients_provider_idx on public.firefly_ping_recipients(provider_id, status);

-- One row per accepted ping. This is what either side blocks from.
create table if not exists public.firefly_connections (
  id uuid primary key default gen_random_uuid(),
  ping_id uuid references public.firefly_pings(id) on delete set null,
  requester_id uuid not null references auth.users(id) on delete cascade,
  provider_id uuid not null references auth.users(id) on delete cascade,
  service text not null,
  -- Snapshots so each side's history stays readable even if profiles change
  requester_label text not null,
  provider_label text not null,
  created_at timestamptz not null default now()
);
create index if not exists firefly_connections_requester_idx on public.firefly_connections(requester_id);
create index if not exists firefly_connections_provider_idx on public.firefly_connections(provider_id);

create table if not exists public.firefly_blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  blocked_label text not null,
  private_note text check (char_length(private_note) <= 280),
  created_at timestamptz not null default now(),
  constraint firefly_blocks_unique unique (blocker_id, blocked_id),
  constraint firefly_blocks_not_self check (blocker_id <> blocked_id)
);
create index if not exists firefly_blocks_blocked_idx on public.firefly_blocks(blocked_id);

-- Lock every table down: RLS on, no policies, no grants. Users reach this
-- data only through the functions below.
alter table public.firefly_profiles enable row level security;
alter table public.firefly_availability enable row level security;
alter table public.firefly_pings enable row level security;
alter table public.firefly_ping_recipients enable row level security;
alter table public.firefly_connections enable row level security;
alter table public.firefly_blocks enable row level security;
revoke all on public.firefly_profiles, public.firefly_availability, public.firefly_pings,
  public.firefly_ping_recipients, public.firefly_connections, public.firefly_blocks
  from anon, authenticated;

-- ---------------------------------------------------------------- helpers

create or replace function public.firefly_is_blocked(a uuid, b uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.firefly_blocks
    where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a)
  );
$$;

-- Great-circle distance in km (no PostGIS needed at this scale)
create or replace function public.firefly_distance_km(lat1 numeric, lng1 numeric, lat2 numeric, lng2 numeric)
returns double precision
language sql immutable
as $$
  select 6371 * 2 * asin(sqrt(
    power(sin(radians((lat2 - lat1)::float8) / 2), 2) +
    cos(radians(lat1::float8)) * cos(radians(lat2::float8)) *
    power(sin(radians((lng2 - lng1)::float8) / 2), 2)
  ));
$$;

-- Wipes everything the privacy rules say should not linger. Called at the
-- start of the busy functions so no scheduled job is required.
create or replace function public.firefly_purge()
returns void
language plpgsql security definer set search_path = public
as $$
begin
  delete from public.firefly_availability where expires_at < now();

  update public.firefly_pings
     set lat = null, lng = null, note = null, closed_at = coalesce(closed_at, now())
   where expires_at < now() and (lat is not null or note is not null);

  delete from public.firefly_ping_recipients r
   using public.firefly_pings p
   where p.id = r.ping_id and (p.expires_at < now() or p.closed_at is not null);

  delete from public.firefly_pings where created_at < now() - interval '90 days';
  delete from public.firefly_connections where created_at < now() - interval '90 days';
end;
$$;

-- ---------------------------------------------------------------- profile

create or replace function public.firefly_get_profile()
returns table (display_name text, user_type text, provider_identity_id uuid, services text[],
               available_until timestamptz)
language sql stable security definer set search_path = public
as $$
  select p.display_name, p.user_type, p.provider_identity_id, p.services,
         (select a.expires_at from public.firefly_availability a
           where a.user_id = auth.uid() and a.expires_at > now())
    from public.firefly_profiles p
   where p.user_id = auth.uid();
$$;

create or replace function public.firefly_save_profile(
  p_display_name text, p_user_type text, p_provider_identity_id uuid, p_services text[]
)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;

  if p_provider_identity_id is not null and not exists (
    select 1 from public.identities
     where id = p_provider_identity_id and owner_id = auth.uid() and is_active = true
  ) then
    raise exception 'That identity is not yours or is not active';
  end if;

  insert into public.firefly_profiles (user_id, display_name, user_type, provider_identity_id, services, updated_at)
  values (auth.uid(), left(trim(coalesce(p_display_name, '')), 80), p_user_type, p_provider_identity_id,
          coalesce(p_services, '{}'), now())
  on conflict (user_id) do update
    set display_name = excluded.display_name,
        user_type = excluded.user_type,
        provider_identity_id = excluded.provider_identity_id,
        services = excluded.services,
        updated_at = now();

  -- Removing the provider side takes the person offline immediately
  if p_provider_identity_id is null or coalesce(array_length(p_services, 1), 0) = 0 then
    delete from public.firefly_availability where user_id = auth.uid();
  end if;
end;
$$;

-- ---------------------------------------------------------------- availability

create or replace function public.firefly_set_available(p_lat numeric, p_lng numeric, p_minutes int)
returns timestamptz
language plpgsql security definer set search_path = public
as $$
declare
  prof record;
  until_ts timestamptz;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;

  select * into prof from public.firefly_profiles where user_id = auth.uid();
  if prof is null or prof.provider_identity_id is null or coalesce(array_length(prof.services, 1), 0) = 0 then
    raise exception 'Pick an identity and at least one service before going available';
  end if;

  until_ts := now() + make_interval(mins => least(greatest(coalesce(p_minutes, 60), 15), 480));

  insert into public.firefly_availability (user_id, lat, lng, expires_at)
  values (auth.uid(), round(p_lat, 2), round(p_lng, 2), until_ts)
  on conflict (user_id) do update
    set lat = excluded.lat, lng = excluded.lng, expires_at = excluded.expires_at;

  return until_ts;
end;
$$;

create or replace function public.firefly_go_offline()
returns void
language sql security definer set search_path = public
as $$
  delete from public.firefly_availability where user_id = auth.uid();
$$;

-- ---------------------------------------------------------------- pinging

create or replace function public.firefly_send_ping(
  p_service text, p_lat numeric, p_lng numeric, p_radius_km int, p_note text
)
returns table (ping_id uuid, recipients int, expires_at timestamptz)
language plpgsql security definer set search_path = public
as $$
declare
  recent int;
  new_ping public.firefly_pings;
  n int;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  perform public.firefly_purge();

  select count(*) into recent from public.firefly_pings
   where requester_id = auth.uid() and created_at > now() - interval '1 hour';
  if recent >= 5 then
    raise exception 'Ping limit reached (5 per hour). Try again later.';
  end if;

  if not exists (select 1 from public.firefly_profiles where user_id = auth.uid()) then
    raise exception 'Set up your Firefly profile first';
  end if;

  insert into public.firefly_pings (requester_id, service, lat, lng, radius_km, note, expires_at)
  values (auth.uid(), p_service, round(p_lat, 2), round(p_lng, 2),
          least(greatest(coalesce(p_radius_km, 15), 1), 80),
          nullif(left(trim(coalesce(p_note, '')), 140), ''),
          now() + interval '30 minutes')
  returning * into new_ping;

  insert into public.firefly_ping_recipients (ping_id, provider_id)
  select new_ping.id, a.user_id
    from public.firefly_availability a
    join public.firefly_profiles fp on fp.user_id = a.user_id
    join public.identities i on i.id = fp.provider_identity_id and i.is_active = true
   where a.expires_at > now()
     and a.user_id <> auth.uid()
     and new_ping.service = any (fp.services)
     and public.firefly_distance_km(new_ping.lat, new_ping.lng, a.lat, a.lng) <= new_ping.radius_km
     and not public.firefly_is_blocked(auth.uid(), a.user_id);

  get diagnostics n = row_count;
  return query select new_ping.id, n, new_ping.expires_at;
end;
$$;

-- Provider inbox: open pings addressed to the caller. The requester stays
-- anonymous here; only their category (e.g. "Homeowner") is shown.
create or replace function public.firefly_inbox()
returns table (ping_id uuid, service text, requester_type text, distance_km int, note text,
               expires_at timestamptz)
language plpgsql security definer set search_path = public
as $$
begin
  perform public.firefly_purge();
  return query
  select p.id, p.service, coalesce(fp.user_type, 'other'),
         greatest(1, round(public.firefly_distance_km(p.lat, p.lng, a.lat, a.lng)))::int,
         p.note, p.expires_at
    from public.firefly_ping_recipients r
    join public.firefly_pings p on p.id = r.ping_id
    left join public.firefly_profiles fp on fp.user_id = p.requester_id
    left join public.firefly_availability a on a.user_id = r.provider_id
   where r.provider_id = auth.uid()
     and r.status = 'pending'
     and p.expires_at > now() and p.closed_at is null
     and not public.firefly_is_blocked(auth.uid(), p.requester_id)
   order by p.created_at desc;
end;
$$;

create or replace function public.firefly_respond(p_ping_id uuid, p_accept boolean)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  p public.firefly_pings;
  req_label text;
  prov_label text;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;

  select * into p from public.firefly_pings where id = p_ping_id;
  if p is null or p.expires_at < now() or p.closed_at is not null then
    raise exception 'This ping has expired';
  end if;
  if not exists (select 1 from public.firefly_ping_recipients
                  where ping_id = p_ping_id and provider_id = auth.uid() and status = 'pending') then
    raise exception 'Nothing to respond to';
  end if;
  if public.firefly_is_blocked(auth.uid(), p.requester_id) then
    raise exception 'This ping has expired';
  end if;

  update public.firefly_ping_recipients
     set status = case when p_accept then 'accepted' else 'declined' end, responded_at = now()
   where ping_id = p_ping_id and provider_id = auth.uid();

  if p_accept then
    update public.firefly_pings set answered = true where id = p_ping_id;

    select coalesce(nullif(fp.display_name, ''), initcap(replace(fp.user_type, '_', ' ')))
      into req_label from public.firefly_profiles fp where fp.user_id = p.requester_id;
    select coalesce(nullif(i.business, ''), i.display_name)
      into prov_label
      from public.firefly_profiles fp join public.identities i on i.id = fp.provider_identity_id
     where fp.user_id = auth.uid();

    insert into public.firefly_connections (ping_id, requester_id, provider_id, service, requester_label, provider_label)
    values (p_ping_id, p.requester_id, auth.uid(), p.service,
            coalesce(req_label, 'Halqen user'), coalesce(prov_label, 'Halqen provider'));
  end if;
end;
$$;

-- Requester view: their pings from the last 24 hours plus the truck-side
-- details of every provider who answered.
create or replace function public.firefly_my_pings()
returns table (ping_id uuid, service text, created_at timestamptz, expires_at timestamptz,
               is_open boolean, connection_id uuid, business text, contact_name text,
               phone text, email text, photo_url text, verified text[])
language plpgsql security definer set search_path = public
as $$
begin
  perform public.firefly_purge();
  return query
  select p.id, p.service, p.created_at, p.expires_at,
         (p.expires_at > now() and p.closed_at is null),
         c.id, i.business, i.display_name, i.phone, i.email, i.photo_url,
         (select coalesce(array_agg(distinct cr.credential_type), '{}')
            from public.credentials cr
           where cr.identity_id = i.id and cr.status = 'active'
             and (cr.expiration_date is null or cr.expiration_date >= current_date))
    from public.firefly_pings p
    left join public.firefly_connections c on c.ping_id = p.id
         and not public.firefly_is_blocked(p.requester_id, c.provider_id)
    left join public.firefly_profiles fp on fp.user_id = c.provider_id
    left join public.identities i on i.id = fp.provider_identity_id
   where p.requester_id = auth.uid()
     and p.created_at > now() - interval '24 hours'
   order by p.created_at desc, c.created_at;
end;
$$;

create or replace function public.firefly_close_ping(p_ping_id uuid)
returns void
language sql security definer set search_path = public
as $$
  update public.firefly_pings set closed_at = now(), lat = null, lng = null, note = null
   where id = p_ping_id and requester_id = auth.uid() and closed_at is null;
$$;

-- ---------------------------------------------------------------- history + blocking

-- Every Firefly connection the caller was part of (last 90 days), from
-- either side, with whether they have blocked that person.
create or replace function public.firefly_connections_list()
returns table (connection_id uuid, my_role text, other_label text, service text,
               created_at timestamptz, blocked boolean)
language sql stable security definer set search_path = public
as $$
  select c.id,
         case when c.requester_id = auth.uid() then 'requester' else 'provider' end,
         case when c.requester_id = auth.uid() then c.provider_label else c.requester_label end,
         c.service, c.created_at,
         exists (select 1 from public.firefly_blocks b
                  where b.blocker_id = auth.uid()
                    and b.blocked_id = case when c.requester_id = auth.uid() then c.provider_id else c.requester_id end)
    from public.firefly_connections c
   where c.requester_id = auth.uid() or c.provider_id = auth.uid()
   order by c.created_at desc;
$$;

-- Block the other party of a connection. The caller never learns the other
-- person's account id; the connection is the only handle.
create or replace function public.firefly_block(p_connection_id uuid, p_private_note text)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  c public.firefly_connections;
  other uuid;
  label text;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;

  select * into c from public.firefly_connections where id = p_connection_id;
  if c is null or (c.requester_id <> auth.uid() and c.provider_id <> auth.uid()) then
    raise exception 'Connection not found';
  end if;

  if c.requester_id = auth.uid() then
    other := c.provider_id; label := c.provider_label;
  else
    other := c.requester_id; label := c.requester_label;
  end if;

  insert into public.firefly_blocks (blocker_id, blocked_id, blocked_label, private_note)
  values (auth.uid(), other, label, nullif(left(trim(coalesce(p_private_note, '')), 280), ''))
  on conflict (blocker_id, blocked_id) do update set private_note = excluded.private_note;

  -- Pull any live pings between the two out of each other's inboxes now
  delete from public.firefly_ping_recipients r
   using public.firefly_pings p
   where p.id = r.ping_id and r.status = 'pending'
     and ((p.requester_id = auth.uid() and r.provider_id = other)
       or (p.requester_id = other and r.provider_id = auth.uid()));
end;
$$;

create or replace function public.firefly_my_blocks()
returns table (block_id uuid, blocked_label text, private_note text, created_at timestamptz)
language sql stable security definer set search_path = public
as $$
  select id, blocked_label, private_note, created_at
    from public.firefly_blocks
   where blocker_id = auth.uid()
   order by created_at desc;
$$;

create or replace function public.firefly_unblock(p_block_id uuid)
returns void
language sql security definer set search_path = public
as $$
  delete from public.firefly_blocks where id = p_block_id and blocker_id = auth.uid();
$$;

-- ---------------------------------------------------------------- permissions

revoke execute on function public.firefly_is_blocked(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.firefly_purge() from public, anon, authenticated;

do $$
declare fn text;
begin
  foreach fn in array array[
    'firefly_get_profile()',
    'firefly_save_profile(text, text, uuid, text[])',
    'firefly_set_available(numeric, numeric, int)',
    'firefly_go_offline()',
    'firefly_send_ping(text, numeric, numeric, int, text)',
    'firefly_inbox()',
    'firefly_respond(uuid, boolean)',
    'firefly_my_pings()',
    'firefly_close_ping(uuid)',
    'firefly_connections_list()',
    'firefly_block(uuid, text)',
    'firefly_my_blocks()',
    'firefly_unblock(uuid)'
  ] loop
    execute format('revoke execute on function public.%s from public, anon', fn);
    execute format('grant execute on function public.%s to authenticated', fn);
  end loop;
end $$;
