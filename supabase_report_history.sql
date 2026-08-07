-- ============================================================================
-- report_history — audit trail for the scheduled monthly report job
-- ============================================================================
-- Without this, a failed monthly run is completely silent: the cron fires at
-- 00:00 IST on the 1st, the Edge Function errors, and nothing anywhere
-- records that it happened. You'd only find out when someone asks where
-- their report went. One row is written per customer per run — including
-- failures and skips — so "did last month's reports actually go out?" is a
-- query rather than a guess.
--
-- Written by send-monthly-reports using the service-role key, which bypasses
-- RLS, so no insert policy is needed for the function itself.
-- ============================================================================

create table if not exists public.report_history (
  id uuid primary key default gen_random_uuid(),
  run_at timestamptz not null default now(),

  -- Reporting period this run covered (IST calendar month).
  period_label text not null,          -- e.g. 'July 2026', for display
  period_from  timestamptz not null,
  period_to    timestamptz not null,

  -- customer_id is `on delete set null` and customer_name is denormalised on
  -- purpose. Every other table in this schema cascades from customers, which
  -- is right for operational data but wrong for an audit log: deleting a
  -- customer must not erase the record that reports were sent to them.
  customer_id   uuid references public.customers (id) on delete set null,
  customer_name text not null,

  machine_count int  not null default 0,
  row_count     int  not null default 0,
  recipient     text,
  file_name     text,

  status text not null check (status in ('Sent', 'Failed', 'Skipped')),
  error  text
);

create index if not exists report_history_run_at_idx      on public.report_history (run_at desc);
create index if not exists report_history_customer_id_idx on public.report_history (customer_id);

-- ── RLS: admin-only visibility ─────────────────────────────────────────────
-- This is operational/audit data about the whole fleet, not customer-facing.
alter table public.report_history enable row level security;

drop policy if exists "authenticated_full_access" on public.report_history;
drop policy if exists "report_history_admin_select" on public.report_history;

create policy "report_history_admin_select" on public.report_history
  for select to authenticated using (public.is_admin());

-- ── Handy queries ──────────────────────────────────────────────────────────
-- Did last month's run go out cleanly?
--   select period_label, customer_name, status, row_count, recipient, error
--   from report_history order by run_at desc limit 20;
--
-- Anything failing?
--   select * from report_history where status = 'Failed' order by run_at desc;
