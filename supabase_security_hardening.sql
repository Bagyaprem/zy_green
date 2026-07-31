-- ============================================================================
-- Consolidated, hardened RLS policy set — replaces
-- supabase_customer_scoping.sql, supabase_customer_self_service.sql, and
-- supabase_customer_wifi.sql. Run this ONE file instead of those three.
--
-- Fixes three real bugs found while consolidating:
--   1. The three files above used inconsistent policy names across each
--      other's DROP statements, so re-running them in sequence left
--      redundant/orphaned admin-only policies coexisting with the newer
--      customer-scoped ones on `machines` and `machine_wifi`. Harmless
--      (both were equally restrictive), but sloppy and confusing to debug.
--      This file drops every possible prior name before creating the final
--      set, so the end state is clean regardless of what you'd already run.
--   2. report_requests' insert policy checked that customer_id matched the
--      requester, but never checked that machine_id actually belongs to
--      that customer — a customer could otherwise craft a raw API request
--      referencing someone else's machine. Fixed below.
--   3. CRITICAL: every policy used "current_customer_id() is null" to mean
--      "this caller is the admin". That's true for ANY authenticated
--      identity that doesn't happen to match a customers.email row — not
--      just the real admin. Verified live: a freshly self-signed-up
--      throwaway account (created via the public anon key against
--      /auth/v1/signup, which anyone with the shipped frontend bundle can
--      call) got full read access to every customer's PII and every
--      machine's plaintext WiFi password, because its email obviously
--      isn't in `customers`. Same trap re-triggerable via the app itself:
--      Account Settings' "change email" flow updates customers.email
--      immediately but Supabase doesn't update the auth session's email
--      until the confirmation link is clicked — during that window the
--      customer's own current_customer_id() also returns null.
--      Fixed by replacing every "current_customer_id() is null" admin
--      check with an explicit is_admin() allowlist (see admin_users below)
--      instead of inferring admin-ness from the absence of a customer row.
--
-- Also includes supabase_report_email.sql's column addition, so this one
-- file is everything currently pending. Safe to re-run.
-- ============================================================================

create extension if not exists "pgcrypto";

-- Explicit admin allowlist. Only emails in this table are treated as admin;
-- everyone else (including any not-yet-a-customer authenticated identity)
-- gets zero access by default instead of full access.
create table if not exists public.admin_users (
  email text primary key,
  role text not null default 'admin' check (role in ('admin', 'super_admin'))
);
alter table public.admin_users enable row level security;

drop policy if exists "admin_users_select" on public.admin_users;
create policy "admin_users_select" on public.admin_users for select to authenticated using (
  email = auth.jwt() ->> 'email'
);
-- No insert/update/delete policy for any client role on purpose — admins are
-- managed from the Supabase SQL editor only, never from the app.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admin_users where email = auth.jwt() ->> 'email');
$$;

-- True only for the higher tier. Use this (instead of is_admin()) to gate anything
-- a plain admin shouldn't be able to do, e.g. managing other admin_users rows.
create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admin_users where email = auth.jwt() ->> 'email' and role = 'super_admin');
$$;

-- customers.email has no uniqueness guarantee today, but current_customer_id()
-- below identifies "which customer is this login" purely by email match — a
-- duplicate email would let one customer's login resolve to an arbitrary one
-- of two customer rows (whichever Postgres happens to return first),
-- potentially exposing the wrong customer's data. Verified no duplicates
-- exist in the live data before adding this (checked 2026-07-23).
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'customers_email_unique') then
    alter table public.customers add constraint customers_email_unique unique (email);
  end if;
end $$;

create or replace function public.current_customer_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.customers where email = auth.jwt() ->> 'email' limit 1;
$$;

-- IMPORTANT: replace the emails below with your real admin login email(s)
-- before running this file, or you will lock yourself out of the admin
-- console. Add one line per admin. Only these emails (plus whichever ones
-- you insert later, manually, from the SQL editor) will ever be treated as
-- admin/super_admin — everyone else gets zero access by default.
insert into public.admin_users (email, role) values ('admin@zygreen.com', 'admin') on conflict (email) do update set role = excluded.role;
insert into public.admin_users (email, role) values ('REPLACE_WITH_SUPER_ADMIN_EMAIL@example.com', 'super_admin') on conflict (email) do update set role = excluded.role;

-- ============================================================================
-- customers — admin sees/creates/deletes all; a customer sees and can update
-- only their own row (Account Settings).
-- ============================================================================
drop policy if exists "authenticated_full_access" on public.customers;
drop policy if exists "customers_select" on public.customers;
drop policy if exists "customers_write" on public.customers;
drop policy if exists "customers_insert_admin" on public.customers;
drop policy if exists "customers_update_own" on public.customers;
drop policy if exists "customers_delete_admin" on public.customers;

create policy "customers_select" on public.customers for select to authenticated using (
  public.is_admin() or id = public.current_customer_id()
);
create policy "customers_insert_admin" on public.customers for insert to authenticated with check (
  public.is_admin()
);
create policy "customers_update_own" on public.customers for update to authenticated using (
  public.is_admin() or id = public.current_customer_id()
) with check (
  public.is_admin() or id = public.current_customer_id()
);
create policy "customers_delete_admin" on public.customers for delete to authenticated using (
  public.is_admin()
);

-- ============================================================================
-- machines — admin sees/writes all; a customer sees only their own machines
-- but cannot create/edit/delete them (Machine Management stays admin-only).
-- ============================================================================
drop policy if exists "authenticated_full_access" on public.machines;
drop policy if exists "machines_select" on public.machines;
drop policy if exists "machines_write" on public.machines;
drop policy if exists "machines_insert_admin" on public.machines;
drop policy if exists "machines_update_own" on public.machines;
drop policy if exists "machines_delete_admin" on public.machines;
drop policy if exists "machines_admin_write" on public.machines;

create policy "machines_select" on public.machines for select to authenticated using (
  public.is_admin() or customer_id = public.current_customer_id()
);
create policy "machines_admin_write" on public.machines for all to authenticated using (
  public.is_admin()
) with check (
  public.is_admin()
);

-- ============================================================================
-- machine_wifi — admin sees/writes all; a customer sees and can update
-- (insert/update, not delete) the WiFi config for their own machine, from
-- the Account Settings > WiFi tab.
-- ============================================================================
drop policy if exists "authenticated_full_access" on public.machine_wifi;
drop policy if exists "machine_wifi_select" on public.machine_wifi;
drop policy if exists "machine_wifi_write" on public.machine_wifi;
drop policy if exists "machine_wifi_admin_write" on public.machine_wifi;
drop policy if exists "machine_wifi_customer_upsert" on public.machine_wifi;
drop policy if exists "machine_wifi_customer_insert" on public.machine_wifi;
drop policy if exists "machine_wifi_customer_update" on public.machine_wifi;

create policy "machine_wifi_select" on public.machine_wifi for select to authenticated using (
  public.is_admin()
  or machine_id in (select id from public.machines where customer_id = public.current_customer_id())
);
create policy "machine_wifi_admin_write" on public.machine_wifi for all to authenticated using (
  public.is_admin()
) with check (
  public.is_admin()
);
create policy "machine_wifi_customer_insert" on public.machine_wifi for insert to authenticated with check (
  machine_id in (select id from public.machines where customer_id = public.current_customer_id())
);
create policy "machine_wifi_customer_update" on public.machine_wifi for update to authenticated using (
  machine_id in (select id from public.machines where customer_id = public.current_customer_id())
) with check (
  machine_id in (select id from public.machines where customer_id = public.current_customer_id())
);

-- ============================================================================
-- Remaining satellite tables keyed by machine_id — admin sees/writes all; a
-- customer can only read rows for their own machines (view-only).
-- ============================================================================
do $$
declare
  t text;
begin
  for t in
    select unnest(array[
      'sensor_data', 'machine_status', 'machine_settings',
      'machine_firmware', 'machine_commands', 'machine_alerts', 'machine_logs'
    ])
  loop
    execute format('drop policy if exists "authenticated_full_access" on public.%I;', t);
    execute format('drop policy if exists "%I_select" on public.%I;', t, t);
    execute format('drop policy if exists "%I_write" on public.%I;', t, t);

    execute format(
      'create policy "%I_select" on public.%I for select to authenticated using (
         public.is_admin()
         or machine_id in (select id from public.machines where customer_id = public.current_customer_id())
       );',
      t, t
    );
    execute format(
      'create policy "%I_write" on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin());',
      t, t
    );
  end loop;
end $$;

-- ============================================================================
-- report_requests — admin sees/manages all; a customer sees their own and
-- can request a report only for a machine that's actually theirs (fixed:
-- previously only checked customer_id, not machine_id ownership).
-- ============================================================================
drop policy if exists "authenticated_full_access" on public.report_requests;
drop policy if exists "report_requests_select" on public.report_requests;
drop policy if exists "report_requests_insert" on public.report_requests;
drop policy if exists "report_requests_admin_write" on public.report_requests;
drop policy if exists "report_requests_update" on public.report_requests;
drop policy if exists "report_requests_delete" on public.report_requests;

create policy "report_requests_select" on public.report_requests for select to authenticated using (
  public.is_admin() or customer_id = public.current_customer_id()
);
create policy "report_requests_insert" on public.report_requests for insert to authenticated with check (
  public.is_admin()
  or (
    customer_id = public.current_customer_id()
    and (machine_id is null or machine_id in (select id from public.machines where customer_id = public.current_customer_id()))
  )
);
create policy "report_requests_update" on public.report_requests for update to authenticated using (
  public.is_admin()
) with check (
  public.is_admin()
);
create policy "report_requests_delete" on public.report_requests for delete to authenticated using (
  public.is_admin()
);

-- ============================================================================
-- machine_reports — scoped via its parent report_requests row.
-- ============================================================================
drop policy if exists "authenticated_full_access" on public.machine_reports;
drop policy if exists "machine_reports_select" on public.machine_reports;
drop policy if exists "machine_reports_write" on public.machine_reports;

create policy "machine_reports_select" on public.machine_reports for select to authenticated using (
  public.is_admin()
  or request_id in (select id from public.report_requests where customer_id = public.current_customer_id())
);
create policy "machine_reports_write" on public.machine_reports for all to authenticated using (
  public.is_admin()
) with check (
  public.is_admin()
);

-- ============================================================================
-- Missing column for the report-request email-delivery feature.
-- ============================================================================
alter table public.report_requests add column if not exists email_to text;

-- ============================================================================
-- ESP32 device access — the firmware only ever holds the public anon key (it
-- never logs in, so it's never `authenticated`). Every policy above is
-- `to authenticated`, which correctly locks the admin console down but also
-- means a real device currently can't resolve its own machine_id or report
-- any data at all (verified live: anon GET on machines returns nothing, anon
-- POST on sensor_data/machine_status fails with 42501). This section grants
-- the minimum the device actually needs, nothing more:
--   1. Resolve machine_code -> machine_id via a narrow function instead of a
--      blanket "anon can read machines" policy, which would otherwise expose
--      every machine's customer_id/location to anyone holding the anon key.
--   2. Insert sensor_data rows, only for a machine_id that actually exists.
--   3. Insert/update its own machine_status row, same constraint.
-- ============================================================================

create or replace function public.resolve_machine_id(code text)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.machines where machine_code = code limit 1;
$$;
grant execute on function public.resolve_machine_id(text) to anon;

-- A plain "exists (select 1 from machines where id = ...)" inside a WITH CHECK
-- clause would be evaluated AS the connecting role (anon) — and anon has no
-- select policy on machines at all, so that subquery would always see zero
-- rows and the check would always fail, regardless of whether the machine
-- really exists. security definer sidesteps that, same trick as is_admin()/
-- current_customer_id() above.
create or replace function public.machine_exists(mid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.machines where id = mid);
$$;
grant execute on function public.machine_exists(uuid) to anon;

drop policy if exists "sensor_data_device_insert" on public.sensor_data;
create policy "sensor_data_device_insert" on public.sensor_data for insert to anon with check (
  public.machine_exists(machine_id)
);

drop policy if exists "machine_status_device_insert" on public.machine_status;
drop policy if exists "machine_status_device_update" on public.machine_status;
create policy "machine_status_device_insert" on public.machine_status for insert to anon with check (
  public.machine_exists(machine_id)
);
create policy "machine_status_device_update" on public.machine_status for update to anon using (
  public.machine_exists(machine_id)
) with check (
  public.machine_exists(machine_id)
);

-- ============================================================================
-- "reports" Storage bucket — confirmed missing entirely (storage.buckets had
-- zero rows for id='reports'), which is the actual cause of every report
-- generate/download 400 seen live. reportService.ts uploads generated PDF/
-- CSV/Excel files to `${customer_id}/${request_id}.<ext>` and reads them back
-- via a short-lived signed URL (never a public link), so this bucket is
-- private and access is gated the same way report_requests/machine_reports
-- already are: admin full access, a customer scoped to their own folder
-- (the first path segment is always their customer_id).
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('reports', 'reports', false)
on conflict (id) do nothing;

drop policy if exists "reports_admin_all" on storage.objects;
drop policy if exists "reports_customer_read" on storage.objects;

create policy "reports_admin_all" on storage.objects for all to authenticated using (
  bucket_id = 'reports' and public.is_admin()
) with check (
  bucket_id = 'reports' and public.is_admin()
);

create policy "reports_customer_read" on storage.objects for select to authenticated using (
  bucket_id = 'reports'
  and (storage.foldername(name))[1] = public.current_customer_id()::text
);

-- ============================================================================
-- report_requests.status check constraint — confirmed drifted from what the
-- app actually uses. The live constraint only allowed the OLD vocabulary
-- ('Pending', 'Approved', 'Rejected', 'Completed'), while reportService.ts /
-- ReportsPage.tsx have always used ('Pending', 'Generating', 'Ready',
-- 'Failed'). Every generateReport() call was therefore silently unable to
-- ever mark a request 'Ready' (or even 'Failed') - confirmed live via
-- 23514 check-constraint-violation errors on the exact PATCH the app sends.
-- The file (upload + machine_reports row) was still generated successfully
-- in the meantime, since that step doesn't touch this column - only the
-- status flip failed - which is also why the email step never fired: it's
-- gated on status = 'Ready', which could never actually be reached.
-- ============================================================================
update public.report_requests set status = 'Ready' where status in ('Approved', 'Completed');
update public.report_requests set status = 'Failed' where status = 'Rejected';

alter table public.report_requests drop constraint if exists report_requests_status_check;
alter table public.report_requests add constraint report_requests_status_check
  check (status in ('Pending', 'Generating', 'Ready', 'Failed'));

-- ============================================================================
-- report_requests.data_selection — new column for the "how many of each
-- hour's ~720 readings to include" report option (All / High / Low / Median),
-- applied independently per sensor. Defaults to 'All' so every existing row
-- (and any insert that doesn't set it) keeps today's full-data behavior.
-- ============================================================================
alter table public.report_requests add column if not exists data_selection text not null default 'All';

alter table public.report_requests drop constraint if exists report_requests_data_selection_check;
alter table public.report_requests add constraint report_requests_data_selection_check
  check (data_selection in ('All', 'High', 'Low', 'Median'));
