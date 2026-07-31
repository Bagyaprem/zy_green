-- ============================================================================
-- RLS fix for the ZYGREEN admin schema.
--
-- Your database already has the 11 real tables (customers, machines,
-- machine_wifi, machine_status, machine_settings, machine_firmware,
-- machine_commands, machine_alerts, report_requests, machine_reports,
-- machine_logs) — confirmed via direct REST checks. The one remaining issue:
-- writes from a logged-in user still get rejected with a 403 / "row violates
-- row-level security policy" error, which means RLS is enabled on these
-- tables but the policy that lets an authenticated user actually write was
-- never created (or didn't survive whatever ran before).
--
-- This script only touches RLS — it does not create, alter, or drop any
-- table. Safe to re-run: skips policies that already exist.
-- ============================================================================
do $$
declare
  t text;
begin
  for t in
    select unnest(array[
      'customers', 'machines', 'machine_wifi', 'sensor_data',
      'machine_status', 'machine_settings', 'machine_firmware', 'machine_commands',
      'machine_alerts', 'report_requests', 'machine_reports', 'machine_logs'
    ])
  loop
    execute format('alter table public.%I enable row level security;', t);
    if not exists (
      select 1 from pg_policies where schemaname = 'public' and tablename = t and policyname = 'authenticated_full_access'
    ) then
      execute format(
        'create policy "authenticated_full_access" on public.%I for all to authenticated using (true) with check (true);',
        t
      );
    end if;
  end loop;
end $$;
