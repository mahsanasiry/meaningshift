begin;

create type public.difference_category as enum (
  'number',
  'date',
  'condition',
  'certainty',
  'attribution',
  'stylistic'
);

create type public.decision_verdict as enum ('confirmed', 'rejected', 'uncertain');

create type public.pair_status as enum (
  'unreviewed',
  'in_review',
  'meaning_changed',
  'meaning_unchanged',
  'uncertain'
);

create type public.version_side as enum ('a', 'b');

create table public.claim_pairs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  title text not null default '' check (char_length(title) <= 200),
  created_by uuid not null default auth.uid() references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index claim_pairs_workspace_created_idx
  on public.claim_pairs (workspace_id, created_at desc);

create table public.claim_versions (
  id uuid primary key default gen_random_uuid(),
  pair_id uuid not null references public.claim_pairs (id) on delete cascade,
  side public.version_side not null,
  body text not null check (char_length(btrim(body)) between 1 and 5000),
  language text not null check (language ~ '^[a-z]{2,3}(-[A-Za-z0-9]+)*$'),
  source_name text not null check (char_length(btrim(source_name)) between 1 and 200),
  source_url text not null check (source_url ~* '^https?://\S+$'),
  published_on date not null,
  unique (pair_id, side)
);

create index claim_versions_language_idx on public.claim_versions (language);

create table public.differences (
  id uuid primary key default gen_random_uuid(),
  pair_id uuid not null references public.claim_pairs (id) on delete cascade,
  category public.difference_category not null,
  fingerprint text not null check (char_length(fingerprint) between 1 and 300),
  detector_id text not null check (char_length(detector_id) between 1 and 100),
  summary text not null check (char_length(summary) between 1 and 500),
  a_start integer,
  a_end integer,
  a_excerpt text,
  b_start integer,
  b_end integer,
  b_excerpt text,
  created_at timestamptz not null default now(),
  unique (id, pair_id),
  unique (pair_id, fingerprint),
  check ((a_start is null) = (a_end is null)),
  check ((b_start is null) = (b_end is null)),
  check (a_start is null or (a_start >= 0 and a_end > a_start)),
  check (b_start is null or (b_start >= 0 and b_end > b_start)),
  check (a_start is not null or b_start is not null)
);

create table public.decisions (
  id uuid primary key default gen_random_uuid(),
  difference_id uuid not null,
  pair_id uuid not null references public.claim_pairs (id) on delete cascade,
  reviewer_id uuid not null default auth.uid() references auth.users (id),
  verdict public.decision_verdict not null,
  reason text not null check (char_length(btrim(reason)) between 1 and 2000),
  created_at timestamptz not null default now(),
  foreign key (difference_id, pair_id) references public.differences (id, pair_id)
);

create index decisions_pair_idx on public.decisions (pair_id, created_at desc);
create index decisions_difference_idx on public.decisions (difference_id, reviewer_id, created_at desc);

create table public.pair_status_changes (
  id uuid primary key default gen_random_uuid(),
  pair_id uuid not null references public.claim_pairs (id) on delete cascade,
  changed_by uuid not null default auth.uid() references auth.users (id),
  status public.pair_status not null check (status <> 'unreviewed'),
  reason text not null check (char_length(btrim(reason)) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index pair_status_changes_pair_idx
  on public.pair_status_changes (pair_id, created_at desc);

create function public.is_pair_member(target_pair uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.claim_pairs p
    join public.workspace_members m on m.workspace_id = p.workspace_id
    where p.id = target_pair
      and m.user_id = (select auth.uid())
  );
$$;

create function public.is_pair_owner(target_pair uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.claim_pairs p
    join public.workspace_members m on m.workspace_id = p.workspace_id
    where p.id = target_pair
      and m.user_id = (select auth.uid())
      and m.role = 'owner'
  );
$$;

-- Versions and flags may only change while nobody has reviewed the pair,
-- otherwise earlier decisions would point at text that no longer exists.
create function public.pair_is_unreviewed(target_pair uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not exists (select 1 from public.decisions d where d.pair_id = target_pair)
    and not exists (select 1 from public.pair_status_changes c where c.pair_id = target_pair);
$$;

create trigger claim_pairs_set_updated_at
  before update on public.claim_pairs
  for each row execute function public.set_updated_at();

alter table public.claim_pairs enable row level security;
alter table public.claim_versions enable row level security;
alter table public.differences enable row level security;
alter table public.decisions enable row level security;
alter table public.pair_status_changes enable row level security;

create policy claim_pairs_select on public.claim_pairs
  for select to authenticated
  using (public.is_workspace_member(workspace_id));

create policy claim_pairs_insert on public.claim_pairs
  for insert to authenticated
  with check (public.is_workspace_owner(workspace_id) and created_by = (select auth.uid()));

create policy claim_pairs_update on public.claim_pairs
  for update to authenticated
  using (public.is_workspace_owner(workspace_id))
  with check (public.is_workspace_owner(workspace_id));

create policy claim_pairs_delete on public.claim_pairs
  for delete to authenticated
  using (public.is_workspace_owner(workspace_id) and public.pair_is_unreviewed(id));

create policy claim_versions_select on public.claim_versions
  for select to authenticated
  using (public.is_pair_member(pair_id));

create policy claim_versions_insert on public.claim_versions
  for insert to authenticated
  with check (public.is_pair_owner(pair_id));

create policy claim_versions_update on public.claim_versions
  for update to authenticated
  using (public.is_pair_owner(pair_id) and public.pair_is_unreviewed(pair_id))
  with check (public.is_pair_owner(pair_id) and public.pair_is_unreviewed(pair_id));

create policy differences_select on public.differences
  for select to authenticated
  using (public.is_pair_member(pair_id));

create policy differences_insert on public.differences
  for insert to authenticated
  with check (public.is_pair_member(pair_id));

create policy differences_delete on public.differences
  for delete to authenticated
  using (public.is_pair_owner(pair_id) and public.pair_is_unreviewed(pair_id));

create policy decisions_select on public.decisions
  for select to authenticated
  using (public.is_pair_member(pair_id));

create policy decisions_insert on public.decisions
  for insert to authenticated
  with check (reviewer_id = (select auth.uid()) and public.is_pair_member(pair_id));

create policy pair_status_changes_select on public.pair_status_changes
  for select to authenticated
  using (public.is_pair_member(pair_id));

create policy pair_status_changes_insert on public.pair_status_changes
  for insert to authenticated
  with check (changed_by = (select auth.uid()) and public.is_pair_member(pair_id));

create function public.create_claim_pair(
  target_workspace uuid,
  pair_title text,
  a_body text,
  a_language text,
  a_source_name text,
  a_source_url text,
  a_published_on date,
  b_body text,
  b_language text,
  b_source_name text,
  b_source_url text,
  b_published_on date
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  new_pair uuid;
begin
  insert into public.claim_pairs (workspace_id, title)
  values (target_workspace, coalesce(pair_title, ''))
  returning id into new_pair;

  insert into public.claim_versions
    (pair_id, side, body, language, source_name, source_url, published_on)
  values
    (new_pair, 'a'::public.version_side, a_body, a_language, a_source_name, a_source_url, a_published_on),
    (new_pair, 'b'::public.version_side, b_body, b_language, b_source_name, b_source_url, b_published_on);

  return new_pair;
end;
$$;

create view public.current_decisions
with (security_invoker = true)
as
select distinct on (d.difference_id, d.reviewer_id) d.*
from public.decisions d
order by d.difference_id, d.reviewer_id, d.created_at desc, d.id desc;

create view public.claim_pair_overview
with (security_invoker = true)
as
select
  p.id,
  p.workspace_id,
  p.title,
  p.created_by,
  p.created_at,
  coalesce(s.status, 'unreviewed'::public.pair_status) as status,
  s.created_at as status_changed_at,
  va.language as language_a,
  vb.language as language_b,
  va.source_name as source_name_a,
  vb.source_name as source_name_b,
  va.published_on as published_on_a,
  vb.published_on as published_on_b,
  left(va.body, 200) as excerpt_a,
  left(vb.body, 200) as excerpt_b,
  coalesce(
    (select array_agg(distinct d.category order by d.category)
     from public.differences d
     where d.pair_id = p.id),
    '{}'::public.difference_category[]
  ) as categories,
  coalesce(
    (select array_agg(distinct x.reviewer_id)
     from public.decisions x
     where x.pair_id = p.id),
    '{}'::uuid[]
  ) as reviewer_ids
from public.claim_pairs p
join public.claim_versions va on va.pair_id = p.id and va.side = 'a'
join public.claim_versions vb on vb.pair_id = p.id and vb.side = 'b'
left join lateral (
  select c.status, c.created_at
  from public.pair_status_changes c
  where c.pair_id = p.id
  order by c.created_at desc, c.id desc
  limit 1
) s on true;

create view public.pair_history
with (security_invoker = true)
as
select
  p.id as event_id,
  p.id as pair_id,
  p.created_at as occurred_at,
  p.created_by as actor_id,
  'pair_created'::text as kind,
  null::uuid as subject_id,
  null::text as outcome,
  null::text as reason
from public.claim_pairs p
union all
select
  d.id,
  d.pair_id,
  d.created_at,
  d.reviewer_id,
  'decision_recorded',
  d.difference_id,
  d.verdict::text,
  d.reason
from public.decisions d
union all
select
  c.id,
  c.pair_id,
  c.created_at,
  c.changed_by,
  'status_changed',
  null::uuid,
  c.status::text,
  c.reason
from public.pair_status_changes c;

revoke all on public.claim_pairs from anon, authenticated;
revoke all on public.claim_versions from anon, authenticated;
revoke all on public.differences from anon, authenticated;
revoke all on public.decisions from anon, authenticated;
revoke all on public.pair_status_changes from anon, authenticated;
revoke all on public.current_decisions from anon, authenticated;
revoke all on public.claim_pair_overview from anon, authenticated;
revoke all on public.pair_history from anon, authenticated;

grant select, delete on public.claim_pairs to authenticated;
grant insert (workspace_id, title) on public.claim_pairs to authenticated;
grant update (title) on public.claim_pairs to authenticated;

grant select on public.claim_versions to authenticated;
grant insert (pair_id, side, body, language, source_name, source_url, published_on)
  on public.claim_versions to authenticated;
grant update (body, language, source_name, source_url, published_on)
  on public.claim_versions to authenticated;

grant select, delete on public.differences to authenticated;
grant insert (
  pair_id, category, fingerprint, detector_id, summary,
  a_start, a_end, a_excerpt, b_start, b_end, b_excerpt
) on public.differences to authenticated;

grant select on public.decisions to authenticated;
grant insert (difference_id, pair_id, verdict, reason) on public.decisions to authenticated;

grant select on public.pair_status_changes to authenticated;
grant insert (pair_id, status, reason) on public.pair_status_changes to authenticated;

grant select on public.current_decisions to authenticated;
grant select on public.claim_pair_overview to authenticated;
grant select on public.pair_history to authenticated;

revoke all on function public.is_pair_member(uuid) from public, anon;
revoke all on function public.is_pair_owner(uuid) from public, anon;
revoke all on function public.pair_is_unreviewed(uuid) from public, anon;
revoke all on function public.create_claim_pair(
  uuid, text, text, text, text, text, date, text, text, text, text, date
) from public, anon;

grant execute on function public.is_pair_member(uuid) to authenticated;
grant execute on function public.is_pair_owner(uuid) to authenticated;
grant execute on function public.pair_is_unreviewed(uuid) to authenticated;
grant execute on function public.create_claim_pair(
  uuid, text, text, text, text, text, date, text, text, text, text, date
) to authenticated;

commit;
