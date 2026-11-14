-- Contract Management & Conflict Resolution (Andrej Biljaka)
-- Run AFTER database/mateo-setup.sql (uses public.teams, public.team_members
-- and private.can_access_team). Safe to run more than once.
-- All timestamps are timestamptz (stored in UTC, shown in the user's time zone).

begin;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.contracts(
    id uuid primary key default gen_random_uuid(),
    team_id uuid not null unique
        references public.teams(id) on delete cascade,
    status text not null default 'active'
        check(status in ('active','archived')),
    version integer not null default 1 check(version>=1),
    country_code text not null default 'HR'
        check(country_code ~ '^[A-Z]{2}$'),
    effective_from date not null default current_date,
    created_by uuid not null default auth.uid()
        references auth.users(id) on delete cascade,
    created_at timestamptz not null default now()
);

create table if not exists public.contract_sections(
    id uuid primary key default gen_random_uuid(),
    contract_id uuid not null
        references public.contracts(id) on delete cascade,
    kind text not null
        check(kind in ('communication','roles','deadlines',
                       'quality','meetings','conflicts')),
    body text not null
        check(char_length(trim(body)) between 1 and 1000),
    position integer not null,
    status text not null default 'agreed'
        check(status in ('agreed','under_review')),
    updated_at timestamptz not null default now(),
    unique(contract_id,kind)
);

create table if not exists public.change_requests(
    id uuid primary key default gen_random_uuid(),
    contract_id uuid not null
        references public.contracts(id) on delete cascade,
    section_id uuid not null
        references public.contract_sections(id) on delete cascade,
    author_id uuid not null default auth.uid()
        references auth.users(id) on delete cascade,
    title text not null
        check(char_length(trim(title)) between 5 and 120),
    proposed_text text not null
        check(char_length(trim(proposed_text)) between 10 and 1000),
    reason text not null
        check(char_length(trim(reason)) between 10 and 1000),
    status text not null default 'pending'
        check(status in ('pending','approved','rejected')),
    voting_closes date not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists change_requests_contract_index
on public.change_requests(contract_id,status);

create table if not exists public.change_votes(
    change_request_id uuid not null
        references public.change_requests(id) on delete cascade,
    user_id uuid not null
        references auth.users(id) on delete cascade,
    choice text not null
        check(choice in ('approve','reject','abstain')),
    comment text check(comment is null or char_length(comment)<=500),
    created_at timestamptz not null default now(),
    primary key(change_request_id,user_id)
);

create table if not exists public.conflicts(
    id uuid primary key default gen_random_uuid(),
    contract_id uuid not null
        references public.contracts(id) on delete cascade,
    reporter_id uuid not null default auth.uid()
        references auth.users(id) on delete cascade,
    section_id uuid
        references public.contract_sections(id) on delete set null,
    title text not null
        check(char_length(trim(title)) between 5 and 120),
    description text not null
        check(char_length(trim(description)) between 20 and 2000),
    severity text not null
        check(severity in ('low','medium','high')),
    status text not null default 'open'
        check(status in ('open','under_review','resolved')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists conflicts_contract_index
on public.conflicts(contract_id,status);

create table if not exists public.conflict_participants(
    conflict_id uuid not null
        references public.conflicts(id) on delete cascade,
    user_id uuid not null
        references auth.users(id) on delete cascade,
    primary key(conflict_id,user_id)
);

create table if not exists public.conflict_updates(
    id uuid primary key default gen_random_uuid(),
    conflict_id uuid not null
        references public.conflicts(id) on delete cascade,
    author_id uuid not null default auth.uid()
        references auth.users(id) on delete cascade,
    body text not null
        check(char_length(trim(body)) between 2 and 1000),
    created_at timestamptz not null default now()
);

create table if not exists public.resolutions(
    id uuid primary key default gen_random_uuid(),
    conflict_id uuid not null
        references public.conflicts(id) on delete cascade,
    proposer_id uuid not null
        references auth.users(id) on delete cascade,
    proposal text not null
        check(char_length(trim(proposal)) between 10 and 1000),
    status text not null default 'proposed'
        check(status in ('proposed','accepted','rejected')),
    created_at timestamptz not null default now()
);

create table if not exists public.resolution_responses(
    resolution_id uuid not null
        references public.resolutions(id) on delete cascade,
    user_id uuid not null
        references auth.users(id) on delete cascade,
    response text not null check(response in ('accept','reject')),
    comment text check(comment is null or char_length(comment)<=500),
    created_at timestamptz not null default now(),
    primary key(resolution_id,user_id)
);

-- History stores an event type and parameters, not a finished sentence,
-- so the client can show every event in the user's language.
create table if not exists public.contract_history(
    id bigint generated always as identity primary key,
    contract_id uuid not null
        references public.contracts(id) on delete cascade,
    type text not null,
    actor_id uuid references auth.users(id) on delete set null,
    params jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
);

create index if not exists contract_history_contract_index
on public.contract_history(contract_id,created_at desc);

-- ---------------------------------------------------------------------------
-- Helper functions (private schema is created in mateo-setup.sql)
-- ---------------------------------------------------------------------------

create or replace function private.can_access_contract(p_contract_id uuid)
returns boolean
language sql
stable
security definer
set search_path=''
as $$
    select exists(
        select 1
        from public.contracts c
        where c.id=p_contract_id
        and private.can_access_team(c.team_id)
    );
$$;

revoke all on function private.can_access_contract(uuid)
from public,anon,authenticated;
grant execute on function private.can_access_contract(uuid)
to authenticated;

-- A proposal can be edited only while nobody else has voted on it.
create or replace function private.change_is_editable(p_change_id uuid)
returns boolean
language sql
stable
security definer
set search_path=''
as $$
    select not exists(
        select 1
        from public.change_votes v
        join public.change_requests r on r.id=v.change_request_id
        where v.change_request_id=p_change_id
        and v.user_id<>r.author_id
    );
$$;

revoke all on function private.change_is_editable(uuid)
from public,anon,authenticated;
grant execute on function private.change_is_editable(uuid)
to authenticated;

create or replace function private.log_history(
    p_contract_id uuid,
    p_type text,
    p_actor uuid,
    p_params jsonb
)
returns void
language sql
security definer
set search_path=''
as $$
    insert into public.contract_history(contract_id,type,actor_id,params)
    values(p_contract_id,p_type,p_actor,coalesce(p_params,'{}'::jsonb));
$$;

revoke all on function private.log_history(uuid,text,uuid,jsonb)
from public,anon,authenticated;

create or replace function private.refresh_section_status(p_section_id uuid)
returns void
language sql
security definer
set search_path=''
as $$
    update public.contract_sections s
    set status=case when exists(
            select 1 from public.change_requests r
            where r.section_id=s.id and r.status='pending'
        ) then 'under_review' else 'agreed' end
    where s.id=p_section_id;
$$;

revoke all on function private.refresh_section_status(uuid)
from public,anon,authenticated;

-- Closes the vote once every team member has voted.
-- More approve than reject votes wins; a tie rejects the change.
create or replace function private.finalize_change(p_change_id uuid)
returns text
language plpgsql
security definer
set search_path=''
as $$
declare
    request public.change_requests%rowtype;
    contract public.contracts%rowtype;
    team_size integer;
    approve_count integer;
    reject_count integer;
    total_count integer;
begin
    select * into request
    from public.change_requests
    where id=p_change_id
    for update;

    if not found or request.status<>'pending' then
        return coalesce(request.status,'pending');
    end if;

    select * into contract
    from public.contracts
    where id=request.contract_id
    for update;

    select count(*) into team_size
    from public.team_members m
    where m.team_id=contract.team_id;

    select
        count(*) filter(where v.choice='approve'),
        count(*) filter(where v.choice='reject'),
        count(*)
    into approve_count,reject_count,total_count
    from public.change_votes v
    join public.team_members m
        on m.user_id=v.user_id and m.team_id=contract.team_id
    where v.change_request_id=p_change_id;

    if total_count<team_size then
        return 'pending';
    end if;

    if approve_count>reject_count then
        update public.change_requests
        set status='approved',updated_at=now()
        where id=p_change_id;

        update public.contract_sections
        set body=request.proposed_text,updated_at=now()
        where id=request.section_id;

        update public.contracts
        set version=version+1
        where id=contract.id;

        perform private.log_history(
            contract.id,'change_approved',null,
            jsonb_build_object(
                'title',request.title,
                'version',contract.version+1
            )
        );
        perform private.refresh_section_status(request.section_id);
        return 'approved';
    end if;

    update public.change_requests
    set status='rejected',updated_at=now()
    where id=p_change_id;

    perform private.log_history(
        contract.id,'change_rejected',null,
        jsonb_build_object('title',request.title)
    );
    perform private.refresh_section_status(request.section_id);
    return 'rejected';
end;
$$;

revoke all on function private.finalize_change(uuid)
from public,anon,authenticated;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

create or replace function private.change_request_before_insert()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
begin
    if not exists(
        select 1 from public.contract_sections s
        where s.id=new.section_id and s.contract_id=new.contract_id
    ) then
        raise exception 'invalid_section';
    end if;

    if new.voting_closes<current_date then
        raise exception 'date_in_past';
    end if;

    new.status:='pending';
    new.created_at:=now();
    new.updated_at:=now();
    return new;
end;
$$;

create or replace function private.change_request_after_insert()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
begin
    -- Proposing a change counts as the author's approve vote.
    insert into public.change_votes(change_request_id,user_id,choice)
    values(new.id,new.author_id,'approve');

    perform private.refresh_section_status(new.section_id);
    perform private.log_history(
        new.contract_id,'change_proposed',new.author_id,
        jsonb_build_object('title',new.title)
    );
    -- A one-person team has already voted completely.
    perform private.finalize_change(new.id);
    return null;
end;
$$;

create or replace function private.change_request_before_update()
returns trigger
language plpgsql
set search_path=''
as $$
begin
    new.updated_at:=now();
    return new;
end;
$$;

create or replace function private.change_request_after_delete()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
begin
    -- Skip when the whole contract is being deleted (cascade).
    if exists(select 1 from public.contracts c where c.id=old.contract_id) then
        perform private.refresh_section_status(old.section_id);
        perform private.log_history(
            old.contract_id,'change_withdrawn',old.author_id,
            jsonb_build_object('title',old.title)
        );
    end if;
    return null;
end;
$$;

create or replace function private.conflict_before_update()
returns trigger
language plpgsql
set search_path=''
as $$
begin
    new.updated_at:=now();
    return new;
end;
$$;

create or replace function private.conflict_after_delete()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
begin
    if exists(select 1 from public.contracts c where c.id=old.contract_id) then
        perform private.log_history(
            old.contract_id,'conflict_withdrawn',old.reporter_id,
            jsonb_build_object('title',old.title)
        );
    end if;
    return null;
end;
$$;

create or replace function private.conflict_update_after_insert()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
begin
    update public.conflicts
    set status='under_review'
    where id=new.conflict_id and status='open';
    return null;
end;
$$;

revoke all on function
    private.change_request_before_insert(),
    private.change_request_after_insert(),
    private.change_request_before_update(),
    private.change_request_after_delete(),
    private.conflict_before_update(),
    private.conflict_after_delete(),
    private.conflict_update_after_insert()
from public,anon,authenticated;

drop trigger if exists change_request_before_insert on public.change_requests;
create trigger change_request_before_insert
before insert on public.change_requests
for each row execute function private.change_request_before_insert();

drop trigger if exists change_request_after_insert on public.change_requests;
create trigger change_request_after_insert
after insert on public.change_requests
for each row execute function private.change_request_after_insert();

drop trigger if exists change_request_before_update on public.change_requests;
create trigger change_request_before_update
before update on public.change_requests
for each row execute function private.change_request_before_update();

drop trigger if exists change_request_after_delete on public.change_requests;
create trigger change_request_after_delete
after delete on public.change_requests
for each row execute function private.change_request_after_delete();

drop trigger if exists conflict_before_update on public.conflicts;
create trigger conflict_before_update
before update on public.conflicts
for each row execute function private.conflict_before_update();

drop trigger if exists conflict_after_delete on public.conflicts;
create trigger conflict_after_delete
after delete on public.conflicts
for each row execute function private.conflict_after_delete();

drop trigger if exists conflict_update_after_insert on public.conflict_updates;
create trigger conflict_update_after_insert
after insert on public.conflict_updates
for each row execute function private.conflict_update_after_insert();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.contracts enable row level security;
alter table public.contract_sections enable row level security;
alter table public.change_requests enable row level security;
alter table public.change_votes enable row level security;
alter table public.conflicts enable row level security;
alter table public.conflict_participants enable row level security;
alter table public.conflict_updates enable row level security;
alter table public.resolutions enable row level security;
alter table public.resolution_responses enable row level security;
alter table public.contract_history enable row level security;

grant select on
    public.contracts,
    public.contract_sections,
    public.change_votes,
    public.conflict_participants,
    public.resolutions,
    public.resolution_responses,
    public.contract_history
to authenticated;

-- Change requests: create, read, update (text fields only), delete.
grant select,delete on public.change_requests to authenticated;
grant insert(contract_id,section_id,title,proposed_text,reason,voting_closes)
on public.change_requests to authenticated;
grant update(title,proposed_text,reason,voting_closes)
on public.change_requests to authenticated;

-- Conflicts are created through report_conflict(); the reporter may
-- update the text fields or delete the report.
grant select,delete on public.conflicts to authenticated;
grant update(title,description,severity)
on public.conflicts to authenticated;

grant select on public.conflict_updates to authenticated;
grant insert(conflict_id,body) on public.conflict_updates to authenticated;

drop policy if exists "Members can view contracts" on public.contracts;
create policy "Members can view contracts"
on public.contracts for select to authenticated
using(private.can_access_team(team_id));

drop policy if exists "Members can view sections" on public.contract_sections;
create policy "Members can view sections"
on public.contract_sections for select to authenticated
using(private.can_access_contract(contract_id));

drop policy if exists "Members can view change requests" on public.change_requests;
create policy "Members can view change requests"
on public.change_requests for select to authenticated
using(private.can_access_contract(contract_id));

drop policy if exists "Members can propose changes" on public.change_requests;
create policy "Members can propose changes"
on public.change_requests for insert to authenticated
with check(
    author_id=(select auth.uid())
    and private.can_access_contract(contract_id)
);

drop policy if exists "Authors can edit unvoted proposals" on public.change_requests;
create policy "Authors can edit unvoted proposals"
on public.change_requests for update to authenticated
using(
    author_id=(select auth.uid())
    and status='pending'
    and private.change_is_editable(id)
)
with check(
    author_id=(select auth.uid())
    and status='pending'
    and voting_closes>=current_date
);

drop policy if exists "Authors can withdraw pending proposals" on public.change_requests;
create policy "Authors can withdraw pending proposals"
on public.change_requests for delete to authenticated
using(author_id=(select auth.uid()) and status='pending');

drop policy if exists "Members can view votes" on public.change_votes;
create policy "Members can view votes"
on public.change_votes for select to authenticated
using(exists(
    select 1 from public.change_requests r
    where r.id=change_votes.change_request_id
));

drop policy if exists "Members can view conflicts" on public.conflicts;
create policy "Members can view conflicts"
on public.conflicts for select to authenticated
using(private.can_access_contract(contract_id));

drop policy if exists "Reporters can edit open conflicts" on public.conflicts;
create policy "Reporters can edit open conflicts"
on public.conflicts for update to authenticated
using(reporter_id=(select auth.uid()) and status<>'resolved')
with check(reporter_id=(select auth.uid()) and status<>'resolved');

drop policy if exists "Reporters can withdraw open conflicts" on public.conflicts;
create policy "Reporters can withdraw open conflicts"
on public.conflicts for delete to authenticated
using(reporter_id=(select auth.uid()) and status<>'resolved');

drop policy if exists "Members can view participants" on public.conflict_participants;
create policy "Members can view participants"
on public.conflict_participants for select to authenticated
using(exists(
    select 1 from public.conflicts c
    where c.id=conflict_participants.conflict_id
));

drop policy if exists "Members can view conflict updates" on public.conflict_updates;
create policy "Members can view conflict updates"
on public.conflict_updates for select to authenticated
using(exists(
    select 1 from public.conflicts c
    where c.id=conflict_updates.conflict_id
));

drop policy if exists "Members can post conflict updates" on public.conflict_updates;
create policy "Members can post conflict updates"
on public.conflict_updates for insert to authenticated
with check(
    author_id=(select auth.uid())
    and exists(
        select 1 from public.conflicts c
        where c.id=conflict_updates.conflict_id
        and c.status<>'resolved'
    )
);

drop policy if exists "Members can view resolutions" on public.resolutions;
create policy "Members can view resolutions"
on public.resolutions for select to authenticated
using(exists(
    select 1 from public.conflicts c
    where c.id=resolutions.conflict_id
));

drop policy if exists "Members can view resolution responses" on public.resolution_responses;
create policy "Members can view resolution responses"
on public.resolution_responses for select to authenticated
using(exists(
    select 1 from public.resolutions r
    where r.id=resolution_responses.resolution_id
));

drop policy if exists "Members can view history" on public.contract_history;
create policy "Members can view history"
on public.contract_history for select to authenticated
using(private.can_access_contract(contract_id));

-- ---------------------------------------------------------------------------
-- Functions called from the browser (database.rpc)
-- Errors are raised as short codes; the client translates them.
-- ---------------------------------------------------------------------------

-- Creates the team's contract with its six sections.
-- p_sections: [{"kind":"communication","body":"..."}, ...]
create or replace function public.create_contract(
    p_team_id uuid,
    p_sections jsonb,
    p_country_code text default 'HR'
)
returns uuid
language plpgsql
security definer
set search_path=''
as $$
declare
    new_id uuid;
    kinds text[]:=array['communication','roles','deadlines',
                        'quality','meetings','conflicts'];
    section_kind text;
    section_body text;
    i integer;
begin
    if auth.uid() is null then
        raise exception 'login_required';
    end if;

    if not private.can_access_team(p_team_id) then
        raise exception 'no_access';
    end if;

    if exists(select 1 from public.contracts c where c.team_id=p_team_id) then
        raise exception 'contract_exists';
    end if;

    insert into public.contracts(team_id,country_code,created_by)
    values(p_team_id,upper(coalesce(p_country_code,'HR')),auth.uid())
    returning id into new_id;

    for i in 1..array_length(kinds,1) loop
        section_kind:=kinds[i];

        select trim(s->>'body') into section_body
        from jsonb_array_elements(coalesce(p_sections,'[]'::jsonb)) s
        where s->>'kind'=section_kind
        limit 1;

        if section_body is null or section_body='' then
            raise exception 'missing_section';
        end if;

        insert into public.contract_sections(contract_id,kind,body,position)
        values(new_id,section_kind,left(section_body,1000),i);
    end loop;

    perform private.log_history(
        new_id,'contract_activated',auth.uid(),
        jsonb_build_object('version',1)
    );

    return new_id;
end;
$$;

-- Casts or changes the current user's vote. Returns the request status.
create or replace function public.cast_vote(
    p_change_id uuid,
    p_choice text,
    p_comment text default null
)
returns text
language plpgsql
security definer
set search_path=''
as $$
declare
    request public.change_requests%rowtype;
begin
    if auth.uid() is null then
        raise exception 'login_required';
    end if;

    select * into request
    from public.change_requests
    where id=p_change_id
    for update;

    if not found then
        raise exception 'not_found';
    end if;

    if not private.can_access_contract(request.contract_id) then
        raise exception 'no_access';
    end if;

    if request.status<>'pending' then
        raise exception 'not_pending';
    end if;

    if p_choice is null
       or p_choice not in ('approve','reject','abstain') then
        raise exception 'choose_option';
    end if;

    insert into public.change_votes(
        change_request_id,user_id,choice,comment
    )
    values(
        p_change_id,auth.uid(),p_choice,
        nullif(left(trim(coalesce(p_comment,'')),500),'')
    )
    on conflict(change_request_id,user_id) do update
    set choice=excluded.choice,
        comment=excluded.comment,
        created_at=now();

    return private.finalize_change(p_change_id);
end;
$$;

-- Creates a conflict together with the people involved.
create or replace function public.report_conflict(
    p_contract_id uuid,
    p_title text,
    p_description text,
    p_severity text,
    p_section_id uuid,
    p_participants uuid[]
)
returns uuid
language plpgsql
security definer
set search_path=''
as $$
declare
    contract public.contracts%rowtype;
    new_id uuid;
    valid_count integer;
begin
    if auth.uid() is null then
        raise exception 'login_required';
    end if;

    select * into contract
    from public.contracts
    where id=p_contract_id;

    if not found or not private.can_access_team(contract.team_id) then
        raise exception 'no_access';
    end if;

    select count(distinct m.user_id) into valid_count
    from public.team_members m
    where m.team_id=contract.team_id
    and m.user_id=any(coalesce(p_participants,'{}'::uuid[]));

    if valid_count=0 then
        raise exception 'choose_people';
    end if;

    if p_section_id is not null and not exists(
        select 1 from public.contract_sections s
        where s.id=p_section_id and s.contract_id=p_contract_id
    ) then
        raise exception 'invalid_section';
    end if;

    insert into public.conflicts(
        contract_id,reporter_id,section_id,title,description,severity
    )
    values(
        p_contract_id,auth.uid(),p_section_id,
        trim(p_title),trim(p_description),p_severity
    )
    returning id into new_id;

    insert into public.conflict_participants(conflict_id,user_id)
    select distinct new_id,m.user_id
    from public.team_members m
    where m.team_id=contract.team_id
    and m.user_id=any(p_participants);

    perform private.log_history(
        p_contract_id,'conflict_reported',auth.uid(),
        jsonb_build_object('title',trim(p_title))
    );

    return new_id;
end;
$$;

-- Proposes a resolution. A newer proposal replaces the open one.
create or replace function public.propose_resolution(
    p_conflict_id uuid,
    p_proposal text
)
returns uuid
language plpgsql
security definer
set search_path=''
as $$
declare
    conflict public.conflicts%rowtype;
    new_id uuid;
begin
    if auth.uid() is null then
        raise exception 'login_required';
    end if;

    select * into conflict
    from public.conflicts
    where id=p_conflict_id
    for update;

    if not found
       or not private.can_access_contract(conflict.contract_id) then
        raise exception 'no_access';
    end if;

    if conflict.status='resolved' then
        raise exception 'already_resolved';
    end if;

    update public.resolutions
    set status='rejected'
    where conflict_id=p_conflict_id and status='proposed';

    insert into public.resolutions(conflict_id,proposer_id,proposal)
    values(p_conflict_id,auth.uid(),trim(p_proposal))
    returning id into new_id;

    update public.conflicts
    set status='under_review'
    where id=p_conflict_id;

    perform private.log_history(
        conflict.contract_id,'resolution_proposed',auth.uid(),
        jsonb_build_object('title',conflict.title)
    );

    return new_id;
end;
$$;

-- Accepts or rejects the open resolution. Only the people involved
-- respond; it is accepted when all of them accept, and one rejection
-- sends it back. Returns the resolution status.
create or replace function public.respond_to_resolution(
    p_resolution_id uuid,
    p_accept boolean,
    p_comment text default null
)
returns text
language plpgsql
security definer
set search_path=''
as $$
declare
    resolution public.resolutions%rowtype;
    conflict public.conflicts%rowtype;
begin
    if auth.uid() is null then
        raise exception 'login_required';
    end if;

    if p_accept is null then
        raise exception 'choose_option';
    end if;

    select * into resolution
    from public.resolutions
    where id=p_resolution_id
    for update;

    if not found then
        raise exception 'not_found';
    end if;

    select * into conflict
    from public.conflicts
    where id=resolution.conflict_id
    for update;

    if not private.can_access_contract(conflict.contract_id) then
        raise exception 'no_access';
    end if;

    if resolution.status<>'proposed' then
        raise exception 'not_open';
    end if;

    if not exists(
        select 1 from public.conflict_participants p
        where p.conflict_id=conflict.id and p.user_id=auth.uid()
    ) then
        raise exception 'not_participant';
    end if;

    insert into public.resolution_responses(
        resolution_id,user_id,response,comment
    )
    values(
        p_resolution_id,auth.uid(),
        case when p_accept then 'accept' else 'reject' end,
        nullif(left(trim(coalesce(p_comment,'')),500),'')
    )
    on conflict(resolution_id,user_id) do update
    set response=excluded.response,
        comment=excluded.comment,
        created_at=now();

    if not p_accept then
        update public.resolutions
        set status='rejected'
        where id=p_resolution_id;
        return 'rejected';
    end if;

    if not exists(
        select 1
        from public.conflict_participants p
        where p.conflict_id=conflict.id
        and not exists(
            select 1 from public.resolution_responses r
            where r.resolution_id=p_resolution_id
            and r.user_id=p.user_id
            and r.response='accept'
        )
    ) then
        update public.resolutions
        set status='accepted'
        where id=p_resolution_id;

        update public.conflicts
        set status='resolved'
        where id=conflict.id;

        perform private.log_history(
            conflict.contract_id,'conflict_resolved',null,
            jsonb_build_object('title',conflict.title)
        );
        return 'accepted';
    end if;

    return 'proposed';
end;
$$;

revoke all on function
    public.create_contract(uuid,jsonb,text),
    public.cast_vote(uuid,text,text),
    public.report_conflict(uuid,text,text,text,uuid,uuid[]),
    public.propose_resolution(uuid,text),
    public.respond_to_resolution(uuid,boolean,text)
from public,anon,authenticated;

grant execute on function
    public.create_contract(uuid,jsonb,text),
    public.cast_vote(uuid,text,text),
    public.report_conflict(uuid,text,text,text,uuid,uuid[]),
    public.propose_resolution(uuid,text),
    public.respond_to_resolution(uuid,boolean,text)
to authenticated;

commit;
