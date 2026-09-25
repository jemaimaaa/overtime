-- Review existing policies before running. Broad existing policies must be removed.
-- Apply to the EXISTING table; this does not recreate it.
begin;
alter table public.timesheets alter column id set default gen_random_uuid();
alter table public.timesheets alter column created_at set default now();
alter table public.timesheets enable row level security;
revoke all on public.timesheets from anon;
grant select, insert, update, delete on public.timesheets to authenticated;
drop policy if exists "timesheets_owner_select" on public.timesheets;
drop policy if exists "timesheets_owner_insert" on public.timesheets;
drop policy if exists "timesheets_owner_update" on public.timesheets;
drop policy if exists "timesheets_owner_delete" on public.timesheets;
create policy "timesheets_owner_select" on public.timesheets for select to authenticated using ((select auth.uid()) = user_id);
create policy "timesheets_owner_insert" on public.timesheets for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "timesheets_owner_update" on public.timesheets for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "timesheets_owner_delete" on public.timesheets for delete to authenticated using ((select auth.uid()) = user_id);
commit;
