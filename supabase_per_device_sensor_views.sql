-- ============================================================================
-- Per-device sensor_data views (aqm001_sensor_data / aqm002_sensor_data)
-- ============================================================================
-- Requested: separate named "tables" per device in the Supabase Table
-- Editor, e.g. to compare AQM-001 vs AQM-002 readings side by side, without
-- the downsides of an actual separate physical table per device (every
-- insert/query/report/chart in the app is built around one shared
-- sensor_data table filtered by machine_id - duplicating that per device
-- would mean rewriting all of it, and needing a new table for every future
-- device forever).
--
-- A view is the right tool here: it looks and queries exactly like a table
-- (open it in Table Editor, filter, export CSV, etc.) but it's just a saved
-- filter over the real sensor_data table - no data is duplicated, and
-- nothing in the app needs to change.
--
-- security_invoker = true (Postgres 15+, which Supabase runs) makes the
-- view enforce sensor_data's existing RLS policies as whoever is actually
-- querying it, not as the view's owner - without this, a view can
-- accidentally bypass RLS and expose rows a customer shouldn't see.
--
-- Update the two machine_id values below if these ever change (they're the
-- machines.id UUIDs for AQM-001 and AQM-002, not the machine_code strings).

create or replace view public.aqm001_sensor_data
with (security_invoker = true) as
select * from public.sensor_data where machine_id = 'd623ae9f-3bc8-4751-af00-50b8e1d8f31f';

create or replace view public.aqm002_sensor_data
with (security_invoker = true) as
select * from public.sensor_data where machine_id = '5c250f61-6241-43d7-842b-519f78028332';
