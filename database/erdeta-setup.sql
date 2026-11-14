create table if not exists public.team_preferences (
    team_id uuid not null,
    user_id uuid not null default auth.uid(),

    communication text[] not null default '{}',

    availability jsonb not null default
        '{"times":[],"flexible":false}'::jsonb,

    roles text[] not null default '{}',

    deadline text not null default '',

    quality text[] not null default '{}',

    preferred_locale text not null default 'en',

    updated_at timestamptz not null default now(),

    primary key (team_id, user_id),

    foreign key (team_id, user_id)
        references public.team_members(team_id, user_id)
        on delete cascade,

    check (cardinality(roles) <= 3),

    check (
        deadline in (
            '',
            'Strict deadlines',
            'Some flexibility',
            'Flexible'
        )
    ),

    check (
        jsonb_typeof(availability) = 'object'
        and jsonb_typeof(availability->'times') = 'array'
        and jsonb_typeof(availability->'flexible') = 'boolean'
    )
);

create index if not exists team_preferences_user_index
on public.team_preferences(user_id);

alter table public.team_preferences enable row level security;

grant select, insert, update, delete
on public.team_preferences to authenticated;

drop policy if exists "Team members can view preferences"
on public.team_preferences;

create policy "Team members can view preferences"
on public.team_preferences
for select
to authenticated
using (
    private.can_access_team(team_id)
);

drop policy if exists "Users can save own preferences"
on public.team_preferences;

create policy "Users can save own preferences"
on public.team_preferences
for insert
to authenticated
with check (
    user_id = (select auth.uid())
    and private.can_access_team(team_id)
);

drop policy if exists "Users can update own preferences"
on public.team_preferences;

create policy "Users can update own preferences"
on public.team_preferences
for update
to authenticated
using (
    user_id = (select auth.uid())
    and private.can_access_team(team_id)
)
with check (
    user_id = (select auth.uid())
    and private.can_access_team(team_id)
);

drop policy if exists "Users can delete own preferences"
on public.team_preferences;

create policy "Users can delete own preferences"
on public.team_preferences
for delete
to authenticated
using (
    user_id = (select auth.uid())
    and private.can_access_team(team_id)
);
