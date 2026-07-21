-- ============================================================================
-- ZYGREEN Admin Console — schema for the new enterprise admin frontend
-- (branch: feature/enterprise-admin-frontend)
--
-- This is a NEW, separate schema from the existing supabase_schema.sql /
-- supabase_monthly_report.sql / supabase_retention_31days.sql /
-- supabase_bucket_function.sql files in this repo, which belong to the old
-- customer-facing dashboard app (air_quality table, etc). Nothing here
-- modifies or depends on those.
--
-- This file is NOT auto-executed. Run it against your own admin Supabase
-- project (SQL editor, or `supabase db push`) when you're ready to wire the
-- admin console (src/services/*.ts) up to a real backend. Until then, the
-- app runs against placeholder VITE_ADMIN_SUPABASE_* env vars and every
-- page shows its loading/empty/error states honestly instead of fake data.
--
-- Conventions:
--   - Primary keys are human-readable text ids (e.g. 'ZYG-AP-001') to match
--     the existing UI, generated client-side (src/utils/id.ts) on insert.
--   - Singleton settings tables use a single row with id = 1.
--   - Row Level Security is enabled everywhere; policies here are permissive
--     ("authenticated users can do everything") as a starting point — tighten
--     per-role before going to production.
-- ============================================================================

-- Extensions ------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- ============================================================================
-- Customers
-- ============================================================================
create table if not exists public.customers (
  id text primary key,
  name text not null,
  contact_name text not null,
  email text not null,
  phone text,
  address text,
  status text not null default 'Active' check (status in ('Active', 'Inactive')),
  plan text not null default 'Starter' check (plan in ('Starter', 'Professional', 'Enterprise')),
  created_at timestamptz not null default now()
);

-- ============================================================================
-- Profiles (admin console users; id matches auth.users.id when created via
-- Supabase Auth). Role-based access control lives here.
-- ============================================================================
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  role text not null default 'Viewer' check (role in ('Super Admin', 'Admin', 'Operator', 'Viewer')),
  status text not null default 'Active' check (status in ('Active', 'Inactive')),
  customer_id text references public.customers (id) on delete set null,
  last_login timestamptz,
  created_at timestamptz not null default now(),
  avatar_color text not null default '#2E7D32'
);

-- ============================================================================
-- Devices
-- ============================================================================
create table if not exists public.devices (
  id text primary key,
  name text not null,
  customer_id text references public.customers (id) on delete set null,
  customer_name text, -- denormalized for list/table display
  location text,
  model text not null,
  serial_number text,
  mac_address text,
  firmware_version text,
  wifi_ssid text,
  wifi_signal integer default 0,
  status text not null default 'Disconnected' check (status in ('Online', 'Offline', 'Maintenance', 'Disconnected')),
  health integer not null default 0 check (health between 0 and 100),
  last_sync timestamptz,
  timezone text default '(GMT+05:30) India Standard Time',
  upload_interval_sec integer not null default 60,
  auto_restart boolean not null default true,
  installed_at timestamptz not null default now(),
  tags text[] not null default '{}',
  -- latest telemetry snapshot (Live Monitoring / Overview poll this directly)
  aqi numeric,
  pm25 numeric,
  pm10 numeric,
  co2 numeric,
  temperature numeric,
  humidity numeric,
  tvoc numeric,
  pressure numeric,
  light numeric,
  noise numeric
);

create index if not exists devices_customer_id_idx on public.devices (customer_id);
create index if not exists devices_status_idx on public.devices (status);

-- Device event/system logs (Device Details > Logs tab)
create table if not exists public.device_logs (
  id bigint generated always as identity primary key,
  device_id text not null references public.devices (id) on delete cascade,
  timestamp timestamptz not null default now(),
  level text not null default 'info' check (level in ('info', 'warning', 'error')),
  message text not null
);

create index if not exists device_logs_device_id_idx on public.device_logs (device_id, timestamp desc);

-- Historical sensor readings (Analytics / Data History / Dashboard trend charts)
create table if not exists public.device_readings (
  id bigint generated always as identity primary key,
  device_id text not null references public.devices (id) on delete cascade,
  recorded_at timestamptz not null default now(),
  aqi numeric,
  pm25 numeric,
  pm10 numeric,
  co2 numeric,
  temperature numeric,
  humidity numeric,
  tvoc numeric,
  pressure numeric,
  light numeric,
  noise numeric
);

create index if not exists device_readings_device_time_idx on public.device_readings (device_id, recorded_at desc);

-- ============================================================================
-- WiFi configuration per device (WiFi Panel / Settings > WiFi Defaults)
-- Note: WiFi *scanning* is a live radio operation performed by the device
-- itself, not a table query — src/services/wifiService.ts calls a Supabase
-- Edge Function (`wifi-scan`) for that rather than reading a "networks" table.
-- ============================================================================
create table if not exists public.wifi_configs (
  device_id text primary key references public.devices (id) on delete cascade,
  ssid text,
  connected boolean not null default false,
  ip_address text,
  signal integer default 0,
  last_connected_at timestamptz
);

-- ============================================================================
-- Alerts
-- ============================================================================
create table if not exists public.alerts (
  id text primary key,
  device_id text not null references public.devices (id) on delete cascade,
  message text not null,
  severity text not null check (severity in ('Critical', 'High', 'Medium', 'Low', 'Info')),
  status text not null default 'Active' check (status in ('Active', 'Acknowledged', 'Resolved')),
  parameter text,
  value numeric,
  threshold numeric,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists alerts_device_id_idx on public.alerts (device_id);
create index if not exists alerts_status_idx on public.alerts (status);
create index if not exists alerts_severity_idx on public.alerts (severity);

-- ============================================================================
-- Firmware
-- ============================================================================
create table if not exists public.firmware_versions (
  id text primary key,
  version text not null,
  model text not null,
  release_notes text,
  released_at timestamptz not null default now(),
  size_kb integer default 0,
  is_stable boolean not null default false,
  storage_path text -- Supabase Storage object path in the 'firmware-binaries' bucket
);

create table if not exists public.device_firmware_status (
  device_id text primary key references public.devices (id) on delete cascade,
  device_name text,
  model text,
  current_version text,
  latest_version text,
  update_available boolean not null default false,
  last_deployed_at timestamptz,
  deploy_progress integer,
  deploy_status text not null default 'idle' check (deploy_status in ('idle', 'deploying', 'success', 'failed'))
);

create table if not exists public.firmware_history (
  id text primary key,
  device_id text not null references public.devices (id) on delete cascade,
  device_name text,
  from_version text,
  to_version text,
  action text not null check (action in ('Deploy', 'Rollback')),
  performed_by text,
  performed_at timestamptz not null default now(),
  status text not null default 'Success' check (status in ('Success', 'Failed'))
);

create index if not exists firmware_history_device_id_idx on public.firmware_history (device_id, performed_at desc);

-- ============================================================================
-- Reports
-- ============================================================================
create table if not exists public.generated_reports (
  id text primary key,
  name text not null,
  type text not null check (type in ('Daily', 'Weekly', 'Monthly', 'Custom')),
  device_scope text,
  device_ids text[] not null default '{}',
  format text not null default 'PDF' check (format in ('PDF', 'CSV')),
  generated_at timestamptz not null default now(),
  generated_by text,
  size_kb integer default 0,
  status text not null default 'Generating' check (status in ('Ready', 'Generating', 'Failed')),
  file_path text -- Supabase Storage object path once generation completes
);

-- ============================================================================
-- Notifications (topbar bell)
-- ============================================================================
create table if not exists public.notifications (
  id text primary key,
  title text not null,
  message text not null,
  severity text not null check (severity in ('Critical', 'High', 'Medium', 'Low', 'Info')),
  read boolean not null default false,
  created_at timestamptz not null default now(),
  link text
);

-- ============================================================================
-- Activity Logs (audit trail)
-- ============================================================================
create table if not exists public.activity_logs (
  id text primary key,
  actor text not null,
  actor_role text,
  action text not null,
  entity_type text not null check (entity_type in ('Device', 'Customer', 'User', 'Firmware', 'Alert', 'Settings', 'Report', 'Auth')),
  entity_name text,
  timestamp timestamptz not null default now(),
  details text,
  ip text
);

create index if not exists activity_logs_timestamp_idx on public.activity_logs (timestamp desc);

-- ============================================================================
-- Settings (singleton tables, row id = 1)
-- ============================================================================
create table if not exists public.company_settings (
  id int primary key default 1,
  company_name text,
  support_email text,
  support_phone text,
  address text,
  timezone text,
  logo_url text,
  constraint company_settings_singleton check (id = 1)
);

create table if not exists public.database_settings (
  id int primary key default 1,
  provider text not null default 'Supabase' check (provider in ('Supabase', 'Firebase', 'PostgreSQL')),
  host text,
  retention_days integer not null default 90,
  auto_backup boolean not null default true,
  constraint database_settings_singleton check (id = 1)
);

create table if not exists public.smtp_settings (
  id int primary key default 1,
  host text,
  port integer default 587,
  username text,
  from_address text,
  use_tls boolean not null default true,
  constraint smtp_settings_singleton check (id = 1)
);

create table if not exists public.wifi_defaults (
  id int primary key default 1,
  default_ssid_prefix text,
  auto_reconnect boolean not null default true,
  preferred_band text not null default '2.4GHz' check (preferred_band in ('2.4GHz', '5GHz', 'Auto')),
  connection_timeout_sec integer not null default 30,
  constraint wifi_defaults_singleton check (id = 1)
);

create table if not exists public.firmware_policy (
  id int primary key default 1,
  auto_update boolean not null default false,
  channel text not null default 'Stable' check (channel in ('Stable', 'Beta')),
  update_window_start text default '01:00',
  update_window_end text default '04:00',
  constraint firmware_policy_singleton check (id = 1)
);

create table if not exists public.backup_settings (
  id int primary key default 1,
  last_backup_at timestamptz,
  auto_backup_enabled boolean not null default true,
  backup_frequency text not null default 'Daily' check (backup_frequency in ('Daily', 'Weekly', 'Monthly')),
  constraint backup_settings_singleton check (id = 1)
);

create table if not exists public.thresholds (
  parameter text primary key,
  unit text,
  warning numeric not null,
  danger numeric not null
);

create table if not exists public.api_keys (
  id text primary key,
  label text not null,
  key_preview text not null,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  status text not null default 'Active' check (status in ('Active', 'Revoked'))
);

create table if not exists public.role_permissions (
  role text primary key check (role in ('Super Admin', 'Admin', 'Operator', 'Viewer')),
  description text,
  permissions jsonb not null default '[]'::jsonb
);

-- ============================================================================
-- Derived views / RPCs used by src/services/analyticsService.ts
-- ============================================================================

-- Customers with live device/user counts (customerService.getCustomers)
create or replace view public.customers_with_counts as
select
  c.*,
  (select count(*) from public.devices d where d.customer_id = c.id) as device_count,
  (select count(*) from public.profiles p where p.customer_id = c.id) as user_count
from public.customers c;

-- Fleet-wide KPI summary (Dashboard KPI tiles)
create or replace view public.dashboard_kpis as
select
  (select count(*) from public.devices) as total_devices,
  (select count(*) from public.devices where status = 'Online') as online_devices,
  (select count(*) from public.devices where status = 'Offline') as offline_devices,
  (select count(*) from public.devices where status = 'Disconnected') as disconnected_devices,
  (select count(*) from public.devices where status = 'Maintenance') as maintenance_devices,
  (select count(*) from public.alerts where status = 'Active') as active_alerts,
  (select count(*) from public.customers) as total_customers,
  (select count(*) from public.profiles) as total_users,
  coalesce((select round(avg(health)) from public.devices), 0) as avg_device_health;

-- Device status breakdown (Dashboard doughnut chart)
create or replace function public.get_device_status_breakdown()
returns table (status text, count bigint)
language sql
stable
as $$
  select status, count(*) from public.devices group by status;
$$;

-- ============================================================================
-- Row Level Security — permissive "authenticated can do everything" starting
-- point. Tighten per-role (Super Admin / Admin / Operator / Viewer) before
-- production use.
-- ============================================================================
do $$
declare
  t text;
begin
  for t in
    select unnest(array[
      'customers', 'profiles', 'devices', 'device_logs', 'device_readings',
      'wifi_configs', 'alerts', 'firmware_versions', 'device_firmware_status',
      'firmware_history', 'generated_reports', 'notifications', 'activity_logs',
      'company_settings', 'database_settings', 'smtp_settings', 'wifi_defaults',
      'firmware_policy', 'backup_settings', 'thresholds', 'api_keys', 'role_permissions'
    ])
  loop
    execute format('alter table public.%I enable row level security;', t);
    execute format(
      'create policy "authenticated_full_access" on public.%I for all to authenticated using (true) with check (true);',
      t
    );
  end loop;
end $$;

-- ============================================================================
-- Seed data — fixed reference config only (role descriptions/permission
-- matrix and default alert thresholds). No devices/customers/telemetry are
-- seeded here; that's real operational data the admin creates via the UI.
-- ============================================================================
insert into public.thresholds (parameter, unit, warning, danger) values
  ('AQI', '', 100, 150),
  ('PM2.5', 'ug/m3', 35, 55),
  ('PM10', 'ug/m3', 100, 150),
  ('CO2', 'ppm', 1000, 1500),
  ('Temperature', 'C', 30, 35),
  ('Humidity', '%', 70, 85),
  ('TVOC', 'ppm', 0.5, 1.0),
  ('Pressure', 'hPa', 1030, 1040)
on conflict (parameter) do nothing;

insert into public.role_permissions (role, description, permissions) values
  ('Super Admin', 'Full platform access across all customers, devices, and system settings. Can manage billing, API keys, and firmware rollouts.',
    '[{"key":"devices.manage","label":"Manage devices (create/edit/delete/restart)","allowed":true},
      {"key":"customers.manage","label":"Manage customers & credentials","allowed":true},
      {"key":"users.manage","label":"Manage users & roles","allowed":true},
      {"key":"firmware.deploy","label":"Deploy & rollback firmware","allowed":true},
      {"key":"settings.manage","label":"Modify system settings","allowed":true},
      {"key":"reports.generate","label":"Generate & export reports","allowed":true},
      {"key":"alerts.manage","label":"Acknowledge & resolve alerts","allowed":true},
      {"key":"logs.view","label":"View activity logs","allowed":true}]'::jsonb),
  ('Admin', 'Manages devices, customers, and users for their assigned scope. Cannot modify global system settings or API keys.',
    '[{"key":"devices.manage","label":"Manage devices (create/edit/delete/restart)","allowed":true},
      {"key":"customers.manage","label":"Manage customers & credentials","allowed":true},
      {"key":"users.manage","label":"Manage users & roles","allowed":true},
      {"key":"firmware.deploy","label":"Deploy & rollback firmware","allowed":true},
      {"key":"settings.manage","label":"Modify system settings","allowed":false},
      {"key":"reports.generate","label":"Generate & export reports","allowed":true},
      {"key":"alerts.manage","label":"Acknowledge & resolve alerts","allowed":true},
      {"key":"logs.view","label":"View activity logs","allowed":true}]'::jsonb),
  ('Operator', 'Day-to-day monitoring and response. Can acknowledge alerts and restart devices, but cannot delete records or manage users.',
    '[{"key":"devices.manage","label":"Manage devices (create/edit/delete/restart)","allowed":false},
      {"key":"customers.manage","label":"Manage customers & credentials","allowed":false},
      {"key":"users.manage","label":"Manage users & roles","allowed":false},
      {"key":"firmware.deploy","label":"Deploy & rollback firmware","allowed":false},
      {"key":"settings.manage","label":"Modify system settings","allowed":false},
      {"key":"reports.generate","label":"Generate & export reports","allowed":true},
      {"key":"alerts.manage","label":"Acknowledge & resolve alerts","allowed":true},
      {"key":"logs.view","label":"View activity logs","allowed":true}]'::jsonb),
  ('Viewer', 'Read-only access to dashboards, analytics, and reports. Cannot make any changes to devices, users, or settings.',
    '[{"key":"devices.manage","label":"Manage devices (create/edit/delete/restart)","allowed":false},
      {"key":"customers.manage","label":"Manage customers & credentials","allowed":false},
      {"key":"users.manage","label":"Manage users & roles","allowed":false},
      {"key":"firmware.deploy","label":"Deploy & rollback firmware","allowed":false},
      {"key":"settings.manage","label":"Modify system settings","allowed":false},
      {"key":"reports.generate","label":"Generate & export reports","allowed":false},
      {"key":"alerts.manage","label":"Acknowledge & resolve alerts","allowed":false},
      {"key":"logs.view","label":"View activity logs","allowed":true}]'::jsonb)
on conflict (role) do nothing;

insert into public.company_settings (id) values (1) on conflict (id) do nothing;
insert into public.database_settings (id) values (1) on conflict (id) do nothing;
insert into public.smtp_settings (id) values (1) on conflict (id) do nothing;
insert into public.wifi_defaults (id) values (1) on conflict (id) do nothing;
insert into public.firmware_policy (id) values (1) on conflict (id) do nothing;
insert into public.backup_settings (id) values (1) on conflict (id) do nothing;

-- ============================================================================
-- Edge Functions referenced by the service layer (not created by this SQL
-- file — deploy separately with `supabase functions deploy <name>`):
--   wifi-scan                    — src/services/wifiService.ts (live radio scan)
--   provision-device-wifi        — src/services/wifiService.ts (push SSID/password to device)
--   generate-customer-credentials — src/services/customerService.ts
--   reset-customer-password      — src/services/customerService.ts
--   send-customer-invitation     — src/services/customerService.ts
--   generate-api-key             — src/services/settingsService.ts
--   run-backup                   — src/services/settingsService.ts
--   generate-report              — src/services/reportService.ts (async job; flips
--                                   generated_reports.status from 'Generating' to 'Ready')
-- These represent operations that must happen server-side (secrets, device
-- commands, long-running jobs) rather than as a plain table read/write.
-- ============================================================================
