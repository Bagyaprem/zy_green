-- ============================================================================
-- Fix report_requests.report_from/report_to: date -> timestamptz
-- ============================================================================
-- Confirmed live 2026-08-07: these columns are currently `date`, not the
-- `timestamptz` the committed schema (supabase_admin_schema.sql:174-175) and
-- the app code (ReportsPage.tsx sends full ISO datetimes) both expect -
-- another instance of a change applied directly in Supabase and never
-- saved back to the repo (same pattern as the sensor_status constraint and
-- the missing firmware bucket found earlier today).
--
-- Effect of the bug: Postgres silently truncates any inserted timestamp
-- down to just its date, discarding the time-of-day entirely. A request for
-- "today 10:00 to today 15:42" was stored as "today" to "today" - a
-- zero-width range - so sensorService.getHistory() (report_from <= x <=
-- report_to) never matched anything narrower than a full day boundary,
-- and the PDF displayed both ends as the same UTC-midnight instant.
--
-- This fix only affects requests created AFTER it's applied - existing
-- rows already lost their time-of-day info when it was truncated on
-- insert, there's nothing to recover for those (report_from/report_to on
-- old rows will just become midnight-to-midnight timestamptz values,
-- which is honestly what they already effectively were).

alter table public.report_requests
  alter column report_from type timestamptz using report_from::timestamptz,
  alter column report_to type timestamptz using report_to::timestamptz;
