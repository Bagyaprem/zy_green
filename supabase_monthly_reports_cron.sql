-- ============================================================================
-- Monthly per-machine report emails - cron schedule
-- ============================================================================
-- Schedules the send-monthly-reports Edge Function to run at 00:05 UTC on
-- the 1st of every month. Requires pg_cron and pg_net (both standard
-- Supabase extensions, usually already available - the `create extension`
-- lines below are safe/no-op if already enabled).
--
-- BEFORE RUNNING THIS:
--   1. Deploy the function: supabase functions deploy send-monthly-reports
--   2. Set its secrets (RESEND_API_KEY should already exist from
--      send-report-email; CRON_SECRET is new - generate any random string):
--        supabase secrets set CRON_SECRET=<a-long-random-string-you-make-up>
--   3. Replace the two placeholders below:
--        <YOUR_ANON_KEY>    - Project Settings -> API -> anon/publishable key
--        <YOUR_CRON_SECRET> - the exact same value you set in step 2
--
-- The anon key and cron secret end up stored in plain text in the
-- cron.job table (visible to anyone with SQL access to this project, i.e.
-- you/admins only - not exposed to anon/customers). For tighter security
-- later, move both into Supabase Vault and reference them via
-- `vault.decrypted_secrets` instead of inlining here.
-- ============================================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Target: 00:00 IST on the 1st of each month.
--
-- pg_cron runs in UTC, and 00:00 IST is 18:30 UTC on the PREVIOUS day —
-- i.e. the last day of the previous month, which standard cron can't
-- express (there's no "last day of month" syntax, and it varies 28-31).
-- So this fires daily at 18:30 UTC (= 00:00 IST every day) and the function
-- itself checks whether it is actually the 1st in IST, exiting immediately
-- on the other ~30 days. That in-function guard is also why the month
-- arithmetic there is done in IST: at 18:30 UTC on 31 Aug it is already
-- 1 Sep in IST, so "previous month" must resolve to August, not July.
select cron.unschedule('monthly-machine-reports')
where exists (select 1 from cron.job where jobname = 'monthly-machine-reports');

select cron.schedule(
  'monthly-machine-reports',
  '30 18 * * *',  -- 18:30 UTC daily = 00:00 IST; the function runs only on the 1st
  $$
  select net.http_post(
    url := 'https://pbnisugqyvvltseahqyi.supabase.co/functions/v1/send-monthly-reports',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', '<YOUR_ANON_KEY>',
      'Authorization', 'Bearer <YOUR_ANON_KEY>',
      'x-cron-secret', '<YOUR_CRON_SECRET>'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- To check it's registered: select * from cron.job where jobname = 'monthly-machine-reports';
-- To remove it later: select cron.unschedule('monthly-machine-reports');
