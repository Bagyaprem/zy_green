-- ─────────────────────────────────────────────────────────────
-- ZyGreen: change air_quality retention from 15 days to 31 days.
--
-- Run this in the Supabase SQL editor.
--
-- STEP 0 (inspect what you currently have, so you can remove the old
-- 15-day mechanism — it may be a pg_cron job OR an INSERT trigger):
--
--   select jobid, schedule, command from cron.job;                 -- cron jobs
--   select tgname, tgrelid::regclass from pg_trigger
--     where tgrelid = 'public.air_quality'::regclass
--       and not tgisinternal;                                      -- triggers
--
-- If the old delete was a TRIGGER, drop it, e.g.:
--   drop trigger if exists trg_air_quality_retention on public.air_quality;
--   drop function if exists public.delete_old_air_quality();
--
-- If it was a CRON job, remove it by name (whatever you named it):
--   select cron.unschedule('air_quality_retention_15d');
-- ─────────────────────────────────────────────────────────────

-- Make sure pg_cron is available (Supabase: Database → Extensions → enable pg_cron)
create extension if not exists pg_cron;

-- Remove any prior ZyGreen retention job so we don't run two
do $$
begin
  perform cron.unschedule('zygreen_retention');
exception when others then
  null;  -- job didn't exist yet
end $$;

-- Delete rows older than 31 days, once a day at 18:30 UTC (= 00:00 IST).
select cron.schedule(
  'zygreen_retention',
  '30 18 * * *',
  $$ delete from public.air_quality where created_at < now() - interval '31 days'; $$
);

-- Verify
select jobid, jobname, schedule, command from cron.job where jobname = 'zygreen_retention';
