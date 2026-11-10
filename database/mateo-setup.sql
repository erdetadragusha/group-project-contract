begin;

-- Teams

create table if not exists public.teams(
    id uuid primary key default gen_random_uuid(),
    owner_id uuid not null default auth.uid()
        references auth.users(id) on delete cascade,
    name text not null
        check(char_length(trim(name)) between 1 and 80),
    project_name text not null
        check(char_length(trim(project_name)) between 1 and 100),
    description text not null
        check(char_length(trim(description)) between 1 and 1000),
    created_at timestamptz not null default now()
);

create index if not exists teams_owner_id_index
on public.teams(owner_id);

alter table public.teams enable row level security;

grant usage on schema public to authenticated;

grant select,insert,update,delete
on public.teams to authenticated;

drop policy if exists "Owners can view teams"
on public.teams;

create policy "Owners can view teams"
on public.teams
for select
to authenticated
using(owner_id=(select auth.uid()));

drop policy if exists "Owners can create teams"
on public.teams;

create policy "Owners can create teams"
on public.teams
for insert
to authenticated
with check(owner_id=(select auth.uid()));

drop policy if exists "Owners can update teams"
on public.teams;

create policy "Owners can update teams"
on public.teams
for update
to authenticated
using(owner_id=(select auth.uid()))
with check(owner_id=(select auth.uid()));

drop policy if exists "Owners can delete teams"
on public.teams;

create policy "Owners can delete teams"
on public.teams
for delete
to authenticated
using(owner_id=(select auth.uid()));

-- Invitations

create table if not exists public.invitations(
    id uuid primary key default gen_random_uuid(),
    team_id uuid not null
        references public.teams(id) on delete cascade,
    invited_email text not null
        check(
            invited_email=lower(trim(invited_email))
            and char_length(invited_email) between 3 and 254
            and position('@' in invited_email)>1
        ),
    created_by uuid not null default auth.uid()
        references auth.users(id) on delete cascade,
    status text not null default 'pending'
        check(status in ('pending','accepted','declined','revoked')),
    created_at timestamptz not null default now(),
    responded_at timestamptz
);

create unique index if not exists invitations_pending_email_index
on public.invitations(team_id,invited_email)
where status='pending';

create index if not exists invitations_email_index
on public.invitations(invited_email);

alter table public.invitations enable row level security;

grant select,insert on public.invitations to authenticated;

drop policy if exists "Owners can create invitations"
on public.invitations;

create policy "Owners can create invitations"
on public.invitations
for insert
to authenticated
with check(
    created_by=(select auth.uid())
    and status='pending'
    and responded_at is null
    and exists(
        select 1
        from public.teams
        where teams.id=invitations.team_id
        and teams.owner_id=(select auth.uid())
    )
);

drop policy if exists "Owners and recipients can view invitations"
on public.invitations;

create policy "Owners and recipients can view invitations"
on public.invitations
for select
to authenticated
using(
    invited_email=lower((select auth.jwt()->>'email'))
    or exists(
        select 1
        from public.teams
        where teams.id=invitations.team_id
        and teams.owner_id=(select auth.uid())
    )
);

-- Team membership

create table if not exists public.team_members(
    team_id uuid not null
        references public.teams(id) on delete cascade,
    user_id uuid not null
        references auth.users(id) on delete cascade,
    joined_at timestamptz not null default now(),
    primary key(team_id,user_id)
);

create index if not exists team_members_user_index
on public.team_members(user_id);

alter table public.team_members enable row level security;

grant select on public.team_members to authenticated;

-- Shared access check

create schema if not exists private;

grant usage on schema private to authenticated;

create or replace function private.can_access_team(p_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path=''
as $$
    select exists(
        select 1
        from public.teams t
        where t.id=p_team_id
        and t.owner_id=auth.uid()
    ) or exists(
        select 1
        from public.team_members m
        where m.team_id=p_team_id
        and m.user_id=auth.uid()
    );
$$;

revoke all on function private.can_access_team(uuid)
from public,anon,authenticated;

grant execute on function private.can_access_team(uuid)
to authenticated;

drop policy if exists "Members can view their teams"
on public.teams;

create policy "Members can view their teams"
on public.teams
for select
to authenticated
using(private.can_access_team(id));

drop policy if exists "Members can view team membership"
on public.team_members;

create policy "Members can view team membership"
on public.team_members
for select
to authenticated
using(private.can_access_team(team_id));

drop policy if exists "Members can view team invitations"
on public.invitations;

create policy "Members can view team invitations"
on public.invitations
for select
to authenticated
using(private.can_access_team(team_id));

-- Automatically add the owner as a member

create or replace function private.add_team_owner()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
begin
    insert into public.team_members(team_id,user_id)
    values(new.id,new.owner_id)
    on conflict do nothing;

    return new;
end;
$$;

revoke all on function private.add_team_owner()
from public,anon,authenticated;

drop trigger if exists add_team_owner_after_insert
on public.teams;

create trigger add_team_owner_after_insert
after insert on public.teams
for each row
execute function private.add_team_owner();

insert into public.team_members(team_id,user_id)
select id,owner_id
from public.teams
on conflict do nothing;

-- Accept or decline an invitation

create or replace function public.respond_to_invitation(
    p_invitation_id uuid,
    p_accept boolean
)
returns uuid
language plpgsql
security definer
set search_path=''
as $$
declare
    current_user_id uuid:=auth.uid();
    current_email text;
    invitation public.invitations%rowtype;
begin
    if current_user_id is null then
        raise exception 'Please log in first.';
    end if;

    if p_accept is null then
        raise exception 'Choose accept or decline.';
    end if;

    select lower(u.email)
    into current_email
    from auth.users u
    where u.id=current_user_id
    and u.email_confirmed_at is not null;

    if current_email is null then
        raise exception 'Confirm your email before responding.';
    end if;

    select i.*
    into invitation
    from public.invitations i
    where i.id=p_invitation_id
    for update;

    if not found then
        raise exception 'Invitation is unavailable.';
    end if;

    if invitation.invited_email<>current_email then
        raise exception 'This invitation belongs to another email address.';
    end if;

    if invitation.status<>'pending' then
        raise exception 'This invitation has already been answered or revoked.';
    end if;

    if p_accept then
        insert into public.team_members(team_id,user_id)
        values(invitation.team_id,current_user_id)
        on conflict do nothing;
    end if;

    update public.invitations
    set status=case
        when p_accept then 'accepted'
        else 'declined'
    end,
    responded_at=now()
    where id=p_invitation_id;

    return invitation.team_id;
end;
$$;

revoke all on function public.respond_to_invitation(uuid,boolean)
from public,anon,authenticated;

grant execute on function public.respond_to_invitation(uuid,boolean)
to authenticated;

-- Read member details for an accessible team

create or replace function public.get_team_members(p_team_id uuid)
returns table(
    user_id uuid,
    full_name text,
    email text,
    joined_at timestamptz,
    is_owner boolean
)
language plpgsql
security definer
set search_path=''
as $$
begin
    if auth.uid() is null then
        raise exception 'Please log in first.';
    end if;

    if not private.can_access_team(p_team_id) then
        raise exception 'You do not have access to this team.';
    end if;

    return query
    select
        m.user_id,
        coalesce(
            nullif(trim(u.raw_user_meta_data->>'full_name'),''),
            split_part(u.email,'@',1)
        )::text,
        u.email::text,
        m.joined_at,
        (t.owner_id=m.user_id)
    from public.team_members m
    join auth.users u on u.id=m.user_id
    join public.teams t on t.id=m.team_id
    where m.team_id=p_team_id
    order by
        (t.owner_id=m.user_id) desc,
        m.joined_at asc;
end;
$$;

revoke all on function public.get_team_members(uuid)
from public,anon,authenticated;

grant execute on function public.get_team_members(uuid)
to authenticated;

commit;