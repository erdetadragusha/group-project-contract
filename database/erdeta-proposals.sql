
create table if not exists public.preference_proposals (
    id uuid primary key default gen_random_uuid(),

    team_id uuid not null
        references public.teams(id) on delete cascade,

    author_id uuid not null default auth.uid(),
    teammate_id uuid not null,

    topic text not null
        check (
            topic in (
                'Communication',
                'Availability',
                'Preferred Roles',
                'Deadlines',
                'Quality'
            )
        ),

    proposal_text text not null
        check (char_length(trim(proposal_text)) between 10 and 1000),

    created_at timestamptz not null default now(),

    foreign key (team_id, author_id)
        references public.team_members(team_id, user_id)
        on delete cascade,

    foreign key (team_id, teammate_id)
        references public.team_members(team_id, user_id)
        on delete cascade,

    check (author_id <> teammate_id)
);

create index if not exists preference_proposals_team_index
on public.preference_proposals(team_id);

alter table public.preference_proposals
enable row level security;

grant select, insert
on public.preference_proposals to authenticated;

drop policy if exists "Members can view preference proposals"
on public.preference_proposals;

create policy "Members can view preference proposals"
on public.preference_proposals
for select to authenticated
using (
    private.can_access_team(team_id)
);

drop policy if exists "Members can create preference proposals"
on public.preference_proposals;

create policy "Members can create preference proposals"
on public.preference_proposals
for insert to authenticated
with check (
    author_id = (select auth.uid())
    and private.can_access_team(team_id)
);
