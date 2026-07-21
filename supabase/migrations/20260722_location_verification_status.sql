-- Distinguish confirmed installations from unverified location candidates.
-- Existing rows and relationships are preserved.
alter table public.locations
  add column if not exists verification_status text default 'candidate';

update public.locations
set verification_status = 'candidate'
where verification_status is null;

alter table public.locations
  alter column verification_status set default 'candidate';

create index if not exists locations_verification_status_idx
  on public.locations (verification_status);
