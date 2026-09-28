-- Halqen: 6-digit auto-assigned access codes
--
-- Moves the manually-typed 4-digit code (10,000 possible values, globally
-- unique across identities/recipient codes/employee codes) to a 6-digit
-- code (1,000,000 possible values) that the system generates and assigns
-- itself, rather than letting a person type and pick their own — removing
-- both the collision problem ("1000" already taken) and any incentive to
-- pick guessable codes.
--
-- Run this once in the Supabase SQL editor for the halqen.com project,
-- AFTER reviewing the notes below.
--
-- IMPORTANT — please read before running:
-- This session doesn't have direct database credentials, so the exact
-- existing constraints on identities.code / identity_codes.code /
-- employees.code (all three currently enforce 4-digit codes, and at least
-- identities.code is known to already carry a unique constraint named
-- "unique_code_global" from the "duplicate key" error hit during NFC
-- testing) could not be inspected directly. This migration is written
-- defensively as a result:
--   - It only ADDS indexes (via "if not exists") and never drops or alters
--     an existing constraint, so it's safe to run even if some of these
--     already exist in a different form.
--   - It's possible the current "global" uniqueness is enforced by a
--     mechanism spanning all three tables together (rather than one
--     constraint per table). If so, some redundancy here is expected and
--     harmless. Worth confirming together once you're back — this is
--     flagged, not silently assumed away.

-- Ensure each code column is independently unique (idempotent — if a
-- constraint already covers this, this just adds a second, harmless index).
create unique index if not exists identities_code_unique_idx on public.identities(code);
create unique index if not exists identity_codes_code_unique_idx on public.identity_codes(code);
create unique index if not exists employees_code_unique_idx on public.employees(code);

-- Backfill existing 4-digit codes to 6 digits by left-padding with zeros
-- (e.g. "1001" -> "001001"). This is a deterministic, uniqueness-preserving
-- transform — codes that were already distinct at 4 digits stay distinct
-- after padding — so every existing beta identity/recipient code/employee
-- code keeps working, just displayed with two extra leading zeros. Running
-- this more than once is safe: only 4-character codes are touched.
update public.identities set code = lpad(code, 6, '0') where length(code) = 4;
update public.identity_codes set code = lpad(code, 6, '0') where length(code) = 4;
update public.employees set code = lpad(code, 6, '0') where length(code) = 4;

-- Generates a random 6-digit code (000000-999999, zero-padded) and retries
-- until it finds one not already in use anywhere in the system. Runs as
-- security definer specifically so the uniqueness check sees every row
-- across all three tables, not just rows the calling user's own RLS
-- policies would let them see (an owner-scoped check here would silently
-- allow cross-owner collisions, defeating the point).
create or replace function public.generate_unique_access_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  candidate text;
  already_taken boolean;
  attempts int := 0;
begin
  loop
    attempts := attempts + 1;
    if attempts > 50 then
      raise exception 'Could not generate a unique code after 50 attempts — code pool may be nearly exhausted.';
    end if;

    candidate := lpad(floor(random() * 1000000)::int::text, 6, '0');

    select exists(
      select 1 from public.identities where code = candidate
      union all
      select 1 from public.identity_codes where code = candidate
      union all
      select 1 from public.employees where code = candidate
    ) into already_taken;

    exit when not already_taken;
  end loop;

  return candidate;
end;
$$;

grant execute on function public.generate_unique_access_code() to authenticated;
