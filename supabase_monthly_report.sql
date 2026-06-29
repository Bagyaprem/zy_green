-- ─────────────────────────────────────────────────────────────
-- ZyGreen: email a 30-day air-quality report (CSV of daily summaries)
-- to the team on the 1st of every month, via Resend — pure SQL, no
-- Edge Function. Recipients:
--     prembagya822@gmail.com
--     zygreeninnovations@gmail.com
--
-- ─────────────── ONE-TIME SETUP (do these first) ───────────────
--
-- 1. Resend account → https://resend.com → create an API key (starts "re_").
--    For a real sender address, verify a domain in Resend and use e.g.
--    'ZyGreen <reports@yourdomain.com>'. For quick testing you can use the
--    built-in 'onboarding@resend.dev' (Resend's test sender).
--
-- 2. Enable extensions in Supabase: Database → Extensions → enable
--    `pg_cron`, `pg_net`, and `vault` (Supabase Vault).
--
-- 3. Store the API key in Vault (so it isn't hard-coded):
--       select vault.create_secret('re_PASTE_YOUR_KEY_HERE', 'RESEND_API_KEY');
--    (To rotate later: delete from vault.secrets where name='RESEND_API_KEY';
--     then run create_secret again.)
--
-- 4. Run everything below.
-- ─────────────────────────────────────────────────────────────

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- ── The report builder + sender ──────────────────────────────
create or replace function public.send_monthly_air_quality_report()
returns void
language plpgsql
security definer
as $$
declare
  v_api_key text;
  v_from    text := 'ZyGreen Reports <onboarding@resend.dev>';  -- replace with your verified sender
  v_csv     text;
  v_b64     text;
  v_html    text;
  v_filename text;
  v_from_d  date := ((now() at time zone 'Asia/Kolkata')::date - 30);
  v_to_d    date := ((now() at time zone 'Asia/Kolkata')::date - 1);
begin
  -- API key from Vault
  select decrypted_secret into v_api_key
  from vault.decrypted_secrets
  where name = 'RESEND_API_KEY';

  if v_api_key is null then
    raise exception 'RESEND_API_KEY not found in Vault — run vault.create_secret(...) first';
  end if;

  -- Per-IST-day summary for the last 30 days
  with daily as (
    select
      (created_at at time zone 'Asia/Kolkata')::date              as day,
      count(*)                                                    as n,
      round(avg(co2)::numeric, 1)                                 as co2_avg,
      min(co2)                                                    as co2_min,
      max(co2)                                                    as co2_max,
      round(avg(pm25::numeric), 1)                                as pm25_avg,
      min(pm25::numeric)                                          as pm25_min,
      max(pm25::numeric)                                          as pm25_max,
      round(avg(pm1::numeric), 1)                                 as pm1_avg,
      round(avg(pm4::numeric), 1)                                 as pm4_avg,
      round(avg(pm10::numeric), 1)                                as pm10_avg,
      round(avg(temperature)::numeric, 1)                         as temp_avg,
      round(avg(humidity)::numeric, 1)                            as hum_avg
    from public.air_quality
    where created_at >= (now() - interval '30 days')
    group by 1
    order by 1
  )
  select
    'Date,Readings,CO2 avg (ppm),CO2 min,CO2 max,'
      || 'PM2.5 avg,PM2.5 min,PM2.5 max,PM1.0 avg,PM4.0 avg,PM10 avg,Temp avg (C),Humidity avg (%)'
      || chr(10)
      || coalesce(string_agg(
           day::text || ',' || n || ',' ||
           coalesce(co2_avg::text,'')  || ',' || coalesce(co2_min::text,'')  || ',' || coalesce(co2_max::text,'')  || ',' ||
           coalesce(pm25_avg::text,'') || ',' || coalesce(pm25_min::text,'') || ',' || coalesce(pm25_max::text,'') || ',' ||
           coalesce(pm1_avg::text,'')  || ',' || coalesce(pm4_avg::text,'')  || ',' || coalesce(pm10_avg::text,'') || ',' ||
           coalesce(temp_avg::text,'') || ',' || coalesce(hum_avg::text,''),
           chr(10) order by day), '')
  into v_csv
  from daily;

  -- base64 attachment for Resend (strip the line breaks PG inserts)
  v_b64 := replace(encode(convert_to(coalesce(v_csv, 'No data'), 'UTF8'), 'base64'), chr(10), '');
  v_filename := 'zygreen_report_' || to_char(v_from_d, 'YYYY-MM-DD') || '_to_' || to_char(v_to_d, 'YYYY-MM-DD') || '.csv';

  v_html :=
    '<div style="font-family:Arial,sans-serif;color:#0f172a">'
    || '<h2 style="color:#16a34a">ZyGreen — Monthly Air Quality Report</h2>'
    || '<p>Attached is the daily-summary report (CSV) for <b>'
    || to_char(v_from_d, 'DD Mon YYYY') || '</b> to <b>' || to_char(v_to_d, 'DD Mon YYYY')
    || '</b> — 30 days, one row per day (averages, plus CO₂ &amp; PM2.5 min/max).</p>'
    || '<p style="color:#64748b;font-size:12px">Device: Machine 1 · Generated automatically by ZyGreen.</p>'
    || '</div>';

  -- send via Resend
  perform net.http_post(
    url     := 'https://api.resend.com/emails',
    headers := jsonb_build_object(
                 'Authorization', 'Bearer ' || v_api_key,
                 'Content-Type',  'application/json'
               ),
    body    := jsonb_build_object(
                 'from',    v_from,
                 'to',      jsonb_build_array('prembagya822@gmail.com', 'zygreeninnovations@gmail.com'),
                 'subject', 'ZyGreen Air Quality Report — ' || to_char(v_to_d, 'Mon YYYY'),
                 'html',    v_html,
                 'attachments', jsonb_build_array(
                   jsonb_build_object('filename', v_filename, 'content', v_b64)
                 )
               )
  );
end;
$$;

-- ── Schedule: 1st of every month at 00:30 UTC (= 06:00 IST on the 1st),
--    covering the previous 30 days. ──
do $$
begin
  perform cron.unschedule('zygreen_monthly_report');
exception when others then null;
end $$;

select cron.schedule(
  'zygreen_monthly_report',
  '30 0 1 * *',
  $$ select public.send_monthly_air_quality_report(); $$
);

-- ── Verify / test ──
-- See the scheduled job:
--   select jobid, jobname, schedule, command from cron.job where jobname='zygreen_monthly_report';
-- Send one right now to test (check both inboxes + spam):
--   select public.send_monthly_air_quality_report();
-- Inspect pg_net delivery (status 200 = accepted by Resend):
--   select id, status_code, content from net._http_response order by id desc limit 5;
