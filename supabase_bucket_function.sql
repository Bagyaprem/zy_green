-- ─────────────────────────────────────────────────────────────
-- ZyGreen: server-side time-bucketed averaging for the chart.
--
-- WHY: the air_quality table logs every ~10s (185k+ rows). PostgREST
-- caps every request at 1000 rows, so the browser can never fetch a
-- week/month of raw data to average. This function does the GROUP BY
-- in Postgres and returns a handful of bucket rows instead.
--
-- Buckets are aligned to IST (Asia/Kolkata) wall-clock so a "day"
-- means an Indian calendar day, not a UTC day.
--
-- Run this once in the Supabase SQL editor.
-- ─────────────────────────────────────────────────────────────

create or replace function public.bucket_air_quality(
  p_from   timestamptz,
  p_to     timestamptz,
  p_bucket text            -- 'hour' or 'day'
)
returns table (
  bucket      timestamptz,
  co2         numeric,
  pm1         numeric,
  pm25        numeric,
  pm4         numeric,
  pm10        numeric,
  temperature numeric,
  humidity    numeric,
  n           bigint
)
language sql
stable
as $$
  select
    -- truncate in IST, then return as an absolute instant (timestamptz)
    (date_trunc(p_bucket, (created_at at time zone 'Asia/Kolkata'))
        at time zone 'Asia/Kolkata')                       as bucket,
    round(avg(co2)::numeric, 1)                             as co2,
    round(avg(pm1)::numeric, 1)                             as pm1,
    round(avg(pm25)::numeric, 1)                            as pm25,
    round(avg(pm4)::numeric, 1)                             as pm4,
    round(avg(pm10)::numeric, 1)                            as pm10,
    round(avg(temperature)::numeric, 1)                     as temperature,
    round(avg(humidity)::numeric, 1)                        as humidity,
    count(*)                                                as n
  from public.air_quality
  where created_at >= p_from
    and created_at <= p_to
    and p_bucket in ('hour', 'day')   -- guard against arbitrary input
  group by 1
  order by 1;
$$;

-- allow the dashboard's anon role to call it
grant execute on function public.bucket_air_quality(timestamptz, timestamptz, text) to anon, authenticated;
