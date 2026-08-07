-- ============================================================================
-- machine_status.sensor_status CHECK constraint fix
-- ============================================================================
-- Live testing on 2026-08-07 turned up a firmware/DB mismatch that had
-- apparently existed since this constraint was first added directly via the
-- SQL editor (never committed to any repo file, hence this file): firmware's
-- reportMachineHeartbeat() sends "OK" or "Degraded" (see main.cpp loop(),
-- `reportMachineHeartbeat(co2 > 0 ? "OK" : "Degraded")`), but the live
-- constraint only allowed 'OK'/'Error', so every heartbeat during a sensor
-- outage failed with a 400 (check constraint violation) instead of just
-- reporting a degraded status. This was silent in production - the UI has
-- no special-cased handling for any particular value (CustomerDashboardPage
-- just renders sensorStatus as plain text), so widening the constraint is
-- the correct fix rather than dumbing down firmware's 3-state reporting.
-- ============================================================================

alter table machine_status drop constraint if exists machine_status_sensor_status_check;
alter table machine_status add constraint machine_status_sensor_status_check
  check (sensor_status = any (array['OK'::text, 'Degraded'::text, 'Error'::text]));
