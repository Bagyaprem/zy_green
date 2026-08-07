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

select cron.schedule(
  'monthly-machine-reports',
  '5 0 1 * *',  -- 00:05 UTC on the 1st of every month
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
