begin;

create type public.workspace_role as enum ('owner', 'reviewer');

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 80),
  created_at timestamptz not null default now()
);

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  description text not null default '' check (char_length(description) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index workspaces_owner_idx on public.workspaces (owner_id);

create table public.workspace_members (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.workspace_role not null,
  added_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create index workspace_members_user_idx on public.workspace_members (user_id);

-- The helpers below are security definer so that policies can ask about
-- membership without recursing into the policies of workspace_members.
create function public.is_workspace_member(target_workspace uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.workspace_members m
    where m.workspace_id = target_workspace
      and m.user_id = (select auth.uid())
  );
$$;

create function public.is_workspace_owner(target_workspace uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.workspace_members m
    where m.workspace_id = target_workspace
      and m.user_id = (select auth.uid())
      and m.role = 'owner'
  );
$$;

create function public.shares_workspace_with(other_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.workspace_members mine
    join public.workspace_members theirs on theirs.workspace_id = mine.workspace_id
    where mine.user_id = (select auth.uid())
      and theirs.user_id = other_user
  );
$$;

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    left(
      coalesce(
        nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''),
        nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
        'Reviewer'
      ),
      80
    )
  );
  return new;
end;
$$;

create function public.add_owner_membership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.workspace_members (workspace_id, user_id, role)
  values (new.id, new.owner_id, 'owner');
  return new;
end;
$$;

create function public.add_workspace_reviewer(target_workspace uuid, reviewer_email text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  reviewer uuid;
begin
  if not public.is_workspace_owner(target_workspace) then
    raise exception 'Only the workspace owner can add reviewers' using errcode = '42501';
  end if;

  select u.id into reviewer
  from auth.users u
  where lower(u.email) = lower(btrim(reviewer_email));

  if reviewer is null then
    raise exception 'No account exists for that email address' using errcode = 'P0002';
  end if;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (target_workspace, reviewer, 'reviewer')
  on conflict do nothing;

  return reviewer;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create trigger workspaces_add_owner
  after insert on public.workspaces
  for each row execute function public.add_owner_membership();

create trigger workspaces_set_updated_at
  before update on public.workspaces
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;

create policy profiles_select on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or public.shares_workspace_with(id));

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- The owner clause lets INSERT ... RETURNING succeed before the membership
-- trigger has run.
create policy workspaces_select on public.workspaces
  for select to authenticated
  using (owner_id = (select auth.uid()) or public.is_workspace_member(id));

create policy workspaces_insert on public.workspaces
  for insert to authenticated
  with check (owner_id = (select auth.uid()));

create policy workspaces_update on public.workspaces
  for update to authenticated
  using (public.is_workspace_owner(id))
  with check (public.is_workspace_owner(id));

create policy workspaces_delete on public.workspaces
  for delete to authenticated
  using (public.is_workspace_owner(id));

create policy workspace_members_select on public.workspace_members
  for select to authenticated
  using (public.is_workspace_member(workspace_id));

create policy workspace_members_delete on public.workspace_members
  for delete to authenticated
  using (public.is_workspace_owner(workspace_id) and role <> 'owner');

revoke all on public.profiles from anon, authenticated;
revoke all on public.workspaces from anon, authenticated;
revoke all on public.workspace_members from anon, authenticated;

grant select on public.profiles to authenticated;
grant update (display_name) on public.profiles to authenticated;

grant select, delete on public.workspaces to authenticated;
grant insert (name, description) on public.workspaces to authenticated;
grant update (name, description) on public.workspaces to authenticated;

grant select, delete on public.workspace_members to authenticated;

revoke all on function public.is_workspace_member(uuid) from public, anon;
revoke all on function public.is_workspace_owner(uuid) from public, anon;
revoke all on function public.shares_workspace_with(uuid) from public, anon;
revoke all on function public.add_workspace_reviewer(uuid, text) from public, anon;
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.add_owner_membership() from public, anon, authenticated;

grant execute on function public.is_workspace_member(uuid) to authenticated;
grant execute on function public.is_workspace_owner(uuid) to authenticated;
grant execute on function public.shares_workspace_with(uuid) to authenticated;
grant execute on function public.add_workspace_reviewer(uuid, text) to authenticated;

commit;
