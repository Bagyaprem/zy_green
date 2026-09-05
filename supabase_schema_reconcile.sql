-- ============================================================================
-- Reconcile the committed schema with what the app actually writes
-- ============================================================================
-- Two more instances of the drift pattern this repo keeps hitting (see
-- supabase_sensor_status_fix.sql, supabase_report_dates_fix.sql, and the
-- missing storage buckets): a change was made directly in the Supabase SQL
-- editor to make the app work, and never written back to a repo file. The
-- live database is fine; the committed SQL is not. Anyone running
-- supabase_admin_schema.sql against a fresh project today gets a database
-- the frontend cannot write to.
--
--   1. machines.status
--      Committed constraint: ('Online','Offline','Maintenance','Disconnected'),
--      default 'Disconnected'. The app has only ever used 'Active'/'Inactive'
--      (src/types/machine.ts, machineSchema.ts, MACHINE_STATUS_OPTIONS), so
--      every AddMachineDialog submit would fail with a 23514 check violation.
--      Note this column is the ADMIN's enabled/disabled flag for a machine —
--      it is not connectivity. Live online/offline is derived from
--      machine_status.last_seen (see src/constants/status.ts), which is why
--      'Online'/'Offline' never belonged in here in the first place.
--
--   2. report_requests.remarks
--      Written by reportService.createReportRequest() and read back by
--      mapReport()/ReportsPage, but present in no SQL file at all. Without
--      it every report request fails with a 42703 undefined-column error.
--
-- Safe and idempotent: re-running changes nothing once applied. The legacy
-- value mapping below is a no-op on a database that already holds
-- Active/Inactive.
-- ============================================================================

-- ── 1. machines.status → ('Active','Inactive') ──────────────────────────────
-- Drop first: the old constraint would reject the very UPDATE that migrates
-- rows out of the old vocabulary.
alter table public.machines drop constraint if exists machines_status_check;

-- Map any legacy values. 'Maintenance' folds into Inactive rather than Active:
-- a machine under maintenance should not read as in-service.
update public.machines set status = 'Active'   where status = 'Online';
update public.machines set status = 'Inactive' where status in ('Offline', 'Maintenance', 'Disconnected');

alter table public.machines alter column status set default 'Active';
alter table public.machines add constraint machines_status_check
  check (status in ('Active', 'Inactive'));

-- ── 2. report_requests.remarks ──────────────────────────────────────────────
alter table public.report_requests add column if not exists remarks text;

-- ── Verify ──────────────────────────────────────────────────────────────────
-- Both of these should come back empty. Anything listed is still drifted.
select 'machines.status has unexpected values' as problem, status, count(*)
from public.machines
where status not in ('Active', 'Inactive')
group by status;

select 'report_requests.remarks is missing' as problem
where not exists (
  select 1 from information_schema.columns
  where table_schema = 'public' and table_name = 'report_requests' and column_name = 'remarks'
);
