-- ============================================================================
-- ZYGREEN Admin Console — schema for the enterprise admin frontend
-- (branch: feature/enterprise-admin-frontend)
--
-- This is a NEW, separate schema from the existing supabase_schema.sql /
-- supabase_monthly_report.sql / supabase_retention_31days.sql /
-- supabase_bucket_function.sql files in this repo, which belong to the old
-- customer-facing dashboard app (air_quality table, etc). Nothing here
-- modifies or depends on those.
--
-- Scope: this defines ONLY the 11 tables the frontend actually queries.
-- There is no profiles table, no notifications table, no views
-- (customers_with_counts / machines_with_details / dashboard_kpis) — the
-- frontend computes joins and counts with plain queries and PostgREST's
-- embedded-resource syntax instead, so nothing extra needs to exist in the
-- database. Authentication uses Supabase Auth directly (session id/email);
-- there is no separate users/roles table.
--
-- Run this against your Supabase project's SQL editor (or `supabase db
-- push`). It's written with IF NOT EXISTS / idempotent RLS setup so it's
-- safe to re-run.
--
-- Conventions:
--   - Business-entity tables (customers, machines, machine_alerts,
--     report_requests, machine_reports) use uuid primary keys, generated
--     server-side — the frontend never generates or displays a raw uuid; it
--     always resolves a customer/machine to its name via a dropdown.
--   - High-volume/append-only tables (sensor_data, machine_logs,
--     machine_commands) use bigint identity primary keys.
--   - "Satellite" tables that hold exactly one row per machine (machine_wifi,
--     machine_status, machine_settings, machine_firmware) use machine_id
--     itself as the primary key.
--   - Row Level Security is enabled everywhere; policies here are permissive
--     ("authenticated users can do everything") as a starting point — tighten
--     per-role before going to production.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ============================================================================
-- Customers
-- ============================================================================
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  company_name text,
  email text not null,
  phone text,
  address text,
  status text not null default 'Active' check (status in ('Active', 'Inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- Machines
-- ============================================================================
create table if not exists public.machines (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers (id) on delete set null,
  machine_name text not null,
  machine_code text not null unique,
  location text,
  status text not null default 'Disconnected' check (status in ('Online', 'Offline', 'Maintenance', 'Disconnected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists machines_customer_id_idx on public.machines (customer_id);
create index if not exists machines_status_idx on public.machines (status);

-- ============================================================================
-- WiFi configuration per machine
-- ============================================================================
create table if not exists public.machine_wifi (
  machine_id uuid primary key references public.machines (id) on delete cascade,
  ssid text,
  password text,
  connection_status text not null default 'Disconnected' check (connection_status in ('Connected', 'Disconnected', 'Connecting')),
  ip_address text,
  mac_address text,
  last_connected_at timestamptz
);

-- ============================================================================
-- Sensor data — append-only telemetry history reported by each machine's ESP32
-- ============================================================================
create table if not exists public.sensor_data (
  id bigint generated always as identity primary key,
  machine_id uuid not null references public.machines (id) on delete cascade,
  recorded_at timestamptz not null default now(),
  co2 numeric,
  temperature numeric,
  humidity numeric,
  pm1_0 numeric,
  pm2_5 numeric,
  pm4_0 numeric,
  pm10 numeric,
  aqi numeric
);

create index if not exists sensor_data_machine_time_idx on public.sensor_data (machine_id, recorded_at desc);

-- ============================================================================
-- Machine live status — only the latest snapshot is stored
-- ============================================================================
create table if not exists public.machine_status (
  machine_id uuid primary key references public.machines (id) on delete cascade,
  is_online boolean not null default false,
  sensor_status text,
  last_seen timestamptz,
  uptime_seconds bigint default 0
);

-- ============================================================================
-- Machine settings
-- ============================================================================
create table if not exists public.machine_settings (
  machine_id uuid primary key references public.machines (id) on delete cascade,
  upload_interval integer not null default 60,
  report_interval integer not null default 86400
);

-- ============================================================================
-- Machine firmware
-- ============================================================================
create table if not exists public.machine_firmware (
  machine_id uuid primary key references public.machines (id) on delete cascade,
  current_version text,
  latest_version text,
  update_status text not null default 'idle' check (update_status in ('idle', 'updating', 'success', 'failed')),
  last_updated timestamptz
);

-- ============================================================================
-- Machine commands — issued from Admin (Command Center)
-- ============================================================================
create table if not exists public.machine_commands (
  id bigint generated always as identity primary key,
  machine_id uuid not null references public.machines (id) on delete cascade,
  command_type text not null check (command_type in ('Restart', 'Update WiFi', 'OTA Update')),
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'Pending' check (status in ('Pending', 'Sent', 'Success', 'Failed')),
  created_at timestamptz not null default now(),
  executed_at timestamptz
);

create index if not exists machine_commands_machine_id_idx on public.machine_commands (machine_id, created_at desc);

-- ============================================================================
-- Machine alerts
-- ============================================================================
create table if not exists public.machine_alerts (
  id uuid primary key default gen_random_uuid(),
  machine_id uuid not null references public.machines (id) on delete cascade,
  alert_type text not null check (alert_type in ('Machine Offline', 'WiFi Disconnected')),
  message text not null,
  is_resolved boolean not null default false,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists machine_alerts_machine_id_idx on public.machine_alerts (machine_id);
create index if not exists machine_alerts_is_resolved_idx on public.machine_alerts (is_resolved);

-- ============================================================================
-- Report requests + generated reports
-- ============================================================================
create table if not exists public.report_requests (
  id uuid primary key default gen_random_uuid(),
  machine_id uuid references public.machines (id) on delete cascade,
  customer_id uuid references public.customers (id) on delete cascade,
  report_type text not null check (report_type in ('PDF', 'CSV', 'Excel')),
  report_from timestamptz not null,
  report_to timestamptz not null,
  status text not null default 'Pending' check (status in ('Pending', 'Generating', 'Ready', 'Failed')),
  requested_at timestamptz not null default now()
);

create table if not exists public.machine_reports (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.report_requests (id) on delete cascade,
  file_name text not null,
  file_url text, -- Supabase Storage object path once generation completes
  generated_at timestamptz not null default now(),
  emailed_to text,
  emailed_at timestamptz
);

-- ============================================================================
-- Machine logs — audit/event history for a specific machine
-- (WiFi Updated, Restarted, OTA Started, OTA Completed, Report Generated...)
-- ============================================================================
create table if not exists public.machine_logs (
  id bigint generated always as identity primary key,
  machine_id uuid not null references public.machines (id) on delete cascade,
  log_type text not null,
  description text not null,
  created_at timestamptz not null default now()
);

create index if not exists machine_logs_machine_id_idx on public.machine_logs (machine_id, created_at desc);

-- ============================================================================
-- Row Level Security — permissive "authenticated can do everything" starting
-- point. Tighten per-role before production use. Safe to re-run: skips
-- policies that already exist.
-- ============================================================================
do $$
declare
  t text;
begin
  for t in
    select unnest(array[
      'customers', 'machines', 'machine_wifi', 'sensor_data',
      'machine_status', 'machine_settings', 'machine_firmware', 'machine_commands',
      'machine_alerts', 'report_requests', 'machine_reports', 'machine_logs'
    ])
  loop
    execute format('alter table public.%I enable row level security;', t);
    if not exists (
      select 1 from pg_policies where schemaname = 'public' and tablename = t and policyname = 'authenticated_full_access'
    ) then
      execute format(
        'create policy "authenticated_full_access" on public.%I for all to authenticated using (true) with check (true);',
        t
      );
    end if;
  end loop;
end $$;

-- ============================================================================
-- Not created by this SQL file — build in a later phase once needed:
--   Edge Functions for anything that must run server-side (OTA push,
--   WiFi provisioning to the physical ESP32, PDF/report generation, email).
--   A Storage bucket for firmware binaries and generated report files.
-- ============================================================================
