
alter table public.preference_proposals
add column if not exists status text not null default 'pending';

alter table public.preference_proposals
add column if not exists reviewed_at timestamptz;

alter table public.preference_proposals
drop constraint if exists preference_proposals_status_valid;

alter table public.preference_proposals
add constraint preference_proposals_status_valid
check (
    status in (
        'pending',
        'approved',
        'changes_requested',
        'rejected'
    )
);

grant update (status, reviewed_at)
on public.preference_proposals
to authenticated;

drop policy if exists "Assigned teammate can review proposal"
on public.preference_proposals;

create policy "Assigned teammate can review proposal"
on public.preference_proposals
for update
to authenticated
using (
    teammate_id = (select auth.uid())
    and status = 'pending'
    and private.can_access_team(team_id)
)
with check (
    teammate_id = (select auth.uid())
    and status in (
        'approved',
        'changes_requested',
        'rejected'
    )
    and reviewed_at is not null
    and private.can_access_team(team_id)
);
