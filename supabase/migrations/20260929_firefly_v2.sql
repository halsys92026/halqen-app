-- Halqen Firefly v2: saved locations, recurring availability schedules,
-- photo attachments on pings, and "ping again" to a known connection.
--
-- Builds on 20260928_firefly.sql. Run this once, after that file, in the
-- Supabase SQL editor for the halqen.com project.
--
-- Notes on design choices:
--   * Recurring schedule windows are matched in a fixed timezone
--     ('America/Los_Angeles') since every current user is Oregon-based.
--     This can be made per-user later without breaking anything here.
--   * Recurring availability is purely additive: it never overrides an
--     explicit "go offline". If you want a day off from your schedule,
--     disable or delete that day's window rather than using "go offline"
--     (which only clears the manual toggle, not schedule-derived hours).
--   * Once a requester and provider already have a connection, the
--     provider sees the requester's real label on any new ping between
--     them (not just ones sent via "ping again") — anonymity has already
--     served its purpose once two people know each other.

-- ---------------------------------------------------------------- tables

create table if not exists public.firefly_locations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null check (char_length(label) between 1 and 60),
  lat numeric(5,2) not null,
  lng numeric(5,2) not null,
  created_at timestamptz not null default now()
);
create index if not exists firefly_locations_user_idx on public.firefly_locations(user_id);

create table if not exists public.firefly_schedules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  day_of_week int not null check (day_of_week between 0 and 6), -- 0 = Sunday
  start_minute int not null check (start_minute between 0 and 1439),
  end_minute int not null check (end_minute between 1 and 1440),
  location_id uuid not null references public.firefly_locations(id) on delete cascade,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  constraint firefly_schedules_valid_window check (end_minute > start_minute)
);
create index if not exists firefly_schedules_user_idx on public.firefly_schedules(user_id, day_of_week);

alter table public.firefly_locations enable row level security;
alter table public.firefly_schedules enable row level security;
revoke all on public.firefly_locations, public.firefly_schedules from anon, authenticated;

-- Photo attachment on a ping (requester-supplied, wiped on purge like the note)
alter table public.firefly_pings add column if not exists photo_path text;

-- ---------------------------------------------------------------- storage (photo)

insert into storage.buckets (id, name, public)
values ('firefly-ping-photos', 'firefly-ping-photos', false)
on conflict (id) do nothing;

drop policy if exists firefly_photo_insert on storage.objects;
create policy firefly_photo_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'firefly-ping-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists firefly_photo_select on storage.objects;
create policy firefly_photo_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'firefly-ping-photos'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (
        select 1 from public.firefly_pings p
        join public.firefly_ping_recipients r on r.ping_id = p.id
        where p.photo_path = storage.objects.name
          and r.provider_id = auth.uid()
      )
    )
  );

drop policy if exists firefly_photo_delete on storage.objects;
create policy firefly_photo_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'firefly-ping-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---------------------------------------------------------------- saved locations

create or replace function public.firefly_save_location(p_label text, p_lat numeric, p_lng numeric)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  new_id uuid;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  insert into public.firefly_locations (user_id, label, lat, lng)
  values (auth.uid(), left(trim(coalesce(p_label, '')), 60), round(p_lat, 2), round(p_lng, 2))
  returning id into new_id;
  return new_id;
end;
$$;

create or replace function public.firefly_list_locations()
returns table (id uuid, label text, lat numeric, lng numeric)
language sql stable security definer set search_path = public
as $$
  select id, label, lat, lng from public.firefly_locations
   where user_id = auth.uid()
   order by label;
$$;

create or replace function public.firefly_delete_location(p_id uuid)
returns void
language sql security definer set search_path = public
as $$
  delete from public.firefly_locations where id = p_id and user_id = auth.uid();
$$;

-- ---------------------------------------------------------------- recurring schedule

create or replace function public.firefly_save_schedule_window(
  p_day_of_week int, p_start_minute int, p_end_minute int, p_location_id uuid
)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  new_id uuid;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  if not exists (select 1 from public.firefly_locations where id = p_location_id and user_id = auth.uid()) then
    raise exception 'That location is not yours';
  end if;
  insert into public.firefly_schedules (user_id, day_of_week, start_minute, end_minute, location_id)
  values (auth.uid(), p_day_of_week, p_start_minute, p_end_minute, p_location_id)
  returning id into new_id;
  return new_id;
end;
$$;

create or replace function public.firefly_list_schedule()
returns table (id uuid, day_of_week int, start_minute int, end_minute int,
               location_id uuid, location_label text, enabled boolean)
language sql stable security definer set search_path = public
as $$
  select s.id, s.day_of_week, s.start_minute, s.end_minute, s.location_id, l.label, s.enabled
    from public.firefly_schedules s
    join public.firefly_locations l on l.id = s.location_id
   where s.user_id = auth.uid()
   order by s.day_of_week, s.start_minute;
$$;

create or replace function public.firefly_delete_schedule_window(p_id uuid)
returns void
language sql security definer set search_path = public
as $$
  delete from public.firefly_schedules where id = p_id and user_id = auth.uid();
$$;

create or replace function public.firefly_set_schedule_window_enabled(p_id uuid, p_enabled boolean)
returns void
language sql security definer set search_path = public
as $$
  update public.firefly_schedules set enabled = p_enabled where id = p_id and user_id = auth.uid();
$$;

-- Internal only: everyone who counts as available right now, whether via
-- the manual toggle or a recurring schedule window. Manual toggle wins no
-- special precedence over schedule here — they simply union together.
create or replace function public.firefly_effective_availability()
returns table (user_id uuid, lat numeric, lng numeric)
language sql stable security definer set search_path = public
as $$
  select a.user_id, a.lat, a.lng
    from public.firefly_availability a
   where a.expires_at > now()
  union
  select s.user_id, l.lat, l.lng
    from public.firefly_schedules s
    join public.firefly_locations l on l.id = s.location_id
   where s.enabled
     and s.day_of_week = extract(dow from (now() at time zone 'America/Los_Angeles'))::int
     and (extract(hour from (now() at time zone 'America/Los_Angeles')) * 60
          + extract(minute from (now() at time zone 'America/Los_Angeles')))
         between s.start_minute and s.end_minute;
$$;

-- ---------------------------------------------------------------- profile (adds schedule_active)

drop function if exists public.firefly_get_profile();
create or replace function public.firefly_get_profile()
returns table (display_name text, user_type text, provider_identity_id uuid, services text[],
               available_until timestamptz, schedule_active boolean)
language sql stable security definer set search_path = public
as $$
  select p.display_name, p.user_type, p.provider_identity_id, p.services,
         (select a.expires_at from public.firefly_availability a
           where a.user_id = auth.uid() and a.expires_at > now()),
         exists (select 1 from public.firefly_effective_availability() e where e.user_id = auth.uid())
    from public.firefly_profiles p
   where p.user_id = auth.uid();
$$;

-- ---------------------------------------------------------------- pinging (adds photo, uses effective availability)

drop function if exists public.firefly_send_ping(text, numeric, numeric, int, text);
create or replace function public.firefly_send_ping(
  p_service text, p_lat numeric, p_lng numeric, p_radius_km int, p_note text, p_photo_path text default null
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

  insert into public.firefly_pings (requester_id, service, lat, lng, radius_km, note, photo_path, expires_at)
  values (auth.uid(), p_service, round(p_lat, 2), round(p_lng, 2),
          least(greatest(coalesce(p_radius_km, 15), 1), 80),
          nullif(left(trim(coalesce(p_note, '')), 140), ''),
          p_photo_path,
          now() + interval '30 minutes')
  returning * into new_ping;

  insert into public.firefly_ping_recipients (ping_id, provider_id)
  select new_ping.id, e.user_id
    from public.firefly_effective_availability() e
    join public.firefly_profiles fp on fp.user_id = e.user_id
    join public.identities i on i.id = fp.provider_identity_id and i.is_active = true
   where e.user_id <> auth.uid()
     and new_ping.service = any (fp.services)
     and public.firefly_distance_km(new_ping.lat, new_ping.lng, e.lat, e.lng) <= new_ping.radius_km
     and not public.firefly_is_blocked(auth.uid(), e.user_id);

  get diagnostics n = row_count;
  return query select new_ping.id, n, new_ping.expires_at;
end;
$$;

-- Ping a specific past connection directly, bypassing availability/radius
-- matching (they already know each other). Still rate-limited and still
-- blockable.
create or replace function public.firefly_ping_again(
  p_connection_id uuid, p_lat numeric, p_lng numeric, p_note text, p_photo_path text default null
)
returns table (ping_id uuid, expires_at timestamptz)
language plpgsql security definer set search_path = public
as $$
declare
  c public.firefly_connections;
  recent int;
  new_ping public.firefly_pings;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  perform public.firefly_purge();

  select * into c from public.firefly_connections where id = p_connection_id;
  if c is null or c.requester_id <> auth.uid() then
    raise exception 'Connection not found';
  end if;
  if public.firefly_is_blocked(auth.uid(), c.provider_id) then
    raise exception 'You cannot ping this person';
  end if;

  select count(*) into recent from public.firefly_pings
   where requester_id = auth.uid() and created_at > now() - interval '1 hour';
  if recent >= 5 then
    raise exception 'Ping limit reached (5 per hour). Try again later.';
  end if;

  insert into public.firefly_pings (requester_id, service, lat, lng, radius_km, note, photo_path, expires_at)
  values (auth.uid(), c.service, round(p_lat, 2), round(p_lng, 2), 1,
          nullif(left(trim(coalesce(p_note, '')), 140), ''), p_photo_path,
          now() + interval '30 minutes')
  returning * into new_ping;

  insert into public.firefly_ping_recipients (ping_id, provider_id)
  values (new_ping.id, c.provider_id);

  return query select new_ping.id, new_ping.expires_at;
end;
$$;

-- Provider inbox: open pings addressed to the caller. Anonymous unless the
-- two already share a connection, in which case the real label is shown.
drop function if exists public.firefly_inbox();
create or replace function public.firefly_inbox()
returns table (ping_id uuid, service text, requester_type text, requester_label text,
               distance_km int, note text, photo_path text, expires_at timestamptz)
language plpgsql security definer set search_path = public
as $$
begin
  perform public.firefly_purge();
  return query
  select p.id, p.service, coalesce(fp.user_type, 'other'),
         (select c.requester_label from public.firefly_connections c
           where c.requester_id = p.requester_id and c.provider_id = auth.uid()
           order by c.created_at desc limit 1),
         case when a.lat is null then null
              else greatest(1, round(public.firefly_distance_km(p.lat, p.lng, a.lat, a.lng)))::int end,
         p.note, p.photo_path, p.expires_at
    from public.firefly_ping_recipients r
    join public.firefly_pings p on p.id = r.ping_id
    left join public.firefly_profiles fp on fp.user_id = p.requester_id
    left join public.firefly_effective_availability() a on a.user_id = r.provider_id
   where r.provider_id = auth.uid()
     and r.status = 'pending'
     and p.expires_at > now() and p.closed_at is null
     and not public.firefly_is_blocked(auth.uid(), p.requester_id)
   order by p.created_at desc;
end;
$$;

-- Requester view: adds photo_path to what was already returned.
drop function if exists public.firefly_my_pings();
create or replace function public.firefly_my_pings()
returns table (ping_id uuid, service text, created_at timestamptz, expires_at timestamptz,
               is_open boolean, connection_id uuid, business text, contact_name text,
               phone text, email text, photo_url text, photo_path text, verified text[])
language plpgsql security definer set search_path = public
as $$
begin
  perform public.firefly_purge();
  return query
  select p.id, p.service, p.created_at, p.expires_at,
         (p.expires_at > now() and p.closed_at is null),
         c.id, i.business, i.display_name, i.phone, i.email, i.photo_url, p.photo_path,
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

-- Purge now also clears photos from storage on expiry.
create or replace function public.firefly_purge()
returns void
language plpgsql security definer set search_path = public
as $$
begin
  delete from public.firefly_availability where expires_at < now();

  delete from storage.objects o
   using public.firefly_pings p
   where o.bucket_id = 'firefly-ping-photos'
     and o.name = p.photo_path
     and p.expires_at < now()
     and p.photo_path is not null;

  update public.firefly_pings
     set lat = null, lng = null, note = null, photo_path = null, closed_at = coalesce(closed_at, now())
   where expires_at < now() and (lat is not null or note is not null or photo_path is not null);

  delete from public.firefly_ping_recipients r
   using public.firefly_pings p
   where p.id = r.ping_id and (p.expires_at < now() or p.closed_at is not null);

  delete from public.firefly_pings where created_at < now() - interval '90 days';
  delete from public.firefly_connections where created_at < now() - interval '90 days';
end;
$$;

-- ---------------------------------------------------------------- permissions

revoke execute on function public.firefly_effective_availability() from public, anon, authenticated;

do $$
declare fn text;
begin
  foreach fn in array array[
    'firefly_save_location(text, numeric, numeric)',
    'firefly_list_locations()',
    'firefly_delete_location(uuid)',
    'firefly_save_schedule_window(int, int, int, uuid)',
    'firefly_list_schedule()',
    'firefly_delete_schedule_window(uuid)',
    'firefly_set_schedule_window_enabled(uuid, boolean)',
    'firefly_get_profile()',
    'firefly_send_ping(text, numeric, numeric, int, text, text)',
    'firefly_ping_again(uuid, numeric, numeric, text, text)',
    'firefly_inbox()',
    'firefly_my_pings()'
  ] loop
    execute format('revoke execute on function public.%s from public, anon', fn);
    execute format('grant execute on function public.%s to authenticated', fn);
  end loop;
end $$;
