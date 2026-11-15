-- Invites: run once in Supabase → SQL Editor.
-- Multi-event: each host owns events; guests can only *add* a reply through
-- submit_rsvp() and can never read anyone's answers.

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.rsvps (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  answers jsonb not null default '{}'::jsonb,   -- attending, plus_one, message, any custom fields
  created_at timestamptz not null default now()
);
create index if not exists rsvps_event_idx on public.rsvps(event_id, created_at);

alter table public.events enable row level security;
alter table public.rsvps  enable row level security;

drop policy if exists "own events" on public.events;
create policy "own events" on public.events for all
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "read own rsvps" on public.rsvps;
create policy "read own rsvps" on public.rsvps for select
  using (exists (select 1 from public.events e where e.id = event_id and e.owner_id = auth.uid()));
drop policy if exists "delete own rsvps" on public.rsvps;
create policy "delete own rsvps" on public.rsvps for delete
  using (exists (select 1 from public.events e where e.id = event_id and e.owner_id = auth.uid()));
-- no insert/update policy: guests go through the function below

create or replace function public.submit_rsvp(p_slug text, p_name text, p_answers jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare eid uuid; recent int;
begin
  select id into eid from public.events where slug = p_slug;
  if eid is null then raise exception 'unknown event'; end if;
  if p_name is null or char_length(trim(p_name)) = 0 or char_length(p_name) > 80 then raise exception 'bad name'; end if;
  if jsonb_typeof(p_answers) <> 'object' or pg_column_size(p_answers) > 4000 then raise exception 'bad answers'; end if;
  -- crude flood guard: max 300 replies per event per hour
  select count(*) into recent from public.rsvps where event_id = eid and created_at > now() - interval '1 hour';
  if recent > 300 then raise exception 'slow down'; end if;
  insert into public.rsvps (event_id, name, answers) values (eid, trim(p_name), p_answers);
end $$;

grant execute on function public.submit_rsvp(text, text, jsonb) to anon, authenticated;

-- ── added 2026-11-15: event is pre-created unowned; the host's first login claims it ──
alter table public.events alter column owner_id drop not null;
insert into public.events (slug, owner_id) values ('ola-urodziny-2026', null) on conflict (slug) do nothing;
create or replace function public.claim_event(p_slug text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return; end if;
  if lower(coalesce(auth.jwt()->>'email','')) not in ('grotkowskaaleksandra3@gmail.com','cotoaleksandra@gmail.com') then return; end if;
  update public.events set owner_id = auth.uid() where slug = p_slug and owner_id is null;
end $$;
revoke execute on function public.claim_event(text) from public, anon;
grant execute on function public.claim_event(text) to authenticated;

-- ── added 2026-11-15: no host login. The guest list opens with a private link
-- (admin.html#k=<key>); only the key's sha256 lives here. ──
create extension if not exists pgcrypto with schema extensions;
alter table public.events add column if not exists admin_key_hash text;
update public.events set admin_key_hash = '5035133983df9c304a4fbdc09a429b4629b417818a9a8875099b70d7989599c5' where slug = 'ola-urodziny-2026';

create or replace function public.host_event(p_slug text, p_key text)
returns uuid language sql stable security definer set search_path = public, extensions as $$
  select id from public.events
  where slug = p_slug and admin_key_hash is not null
    and admin_key_hash = encode(digest(coalesce(p_key,''), 'sha256'), 'hex');
$$;
revoke execute on function public.host_event(text, text) from public, anon, authenticated;

create or replace function public.host_rsvps(p_slug text, p_key text)
returns setof public.rsvps language plpgsql security definer set search_path = public as $$
declare eid uuid := public.host_event(p_slug, p_key);
begin
  if eid is null then raise exception 'not allowed'; end if;
  return query select * from public.rsvps where event_id = eid order by created_at;
end $$;

create or replace function public.host_delete_rsvp(p_slug text, p_key text, p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare eid uuid := public.host_event(p_slug, p_key);
begin
  if eid is null then raise exception 'not allowed'; end if;
  delete from public.rsvps where id = p_id and event_id = eid;
end $$;
grant execute on function public.host_rsvps(text, text) to anon, authenticated;
grant execute on function public.host_delete_rsvp(text, text, uuid) to anon, authenticated;
