-- ============================================================================
-- Tenant isolation: verify + enforce
-- ============================================================================
-- Run this AFTER supabase_security_hardening.sql. It does two things:
--
--   1. Removes any lingering "authenticated_full_access" policy. That policy
--      grants every authenticated identity unrestricted read/write on every
--      table, and because Postgres RLS policies are permissive (OR'd), its
--      mere presence nullifies all the scoped policies the hardening script
--      creates. supabase_admin_schema_repair.sql used to add it; that script
--      is now disabled, but an older run may have left it behind.
--
--   2. Reports, per table, whether RLS is enabled and how many policies
--      exist — so you can SEE the live state instead of assuming the
--      committed SQL matches it. This schema has silently drifted from the
--      repo at least three times (see the project-schema-drift notes), so
--      "the file says so" is not evidence.
--
-- Safe and idempotent: re-running changes nothing once clean.
-- ============================================================================

-- ── 1. Drop the blanket-access policy everywhere it still exists ────────────
do $$
declare
  r record;
  dropped int := 0;
begin
  for r in
    select schemaname, tablename
    from pg_policies
    where schemaname = 'public' and policyname = 'authenticated_full_access'
  loop
    execute format('drop policy if exists "authenticated_full_access" on %I.%I;', r.schemaname, r.tablename);
    dropped := dropped + 1;
    raise notice 'Dropped authenticated_full_access on %.%', r.schemaname, r.tablename;
  end loop;

  if dropped = 0 then
    raise notice 'Clean: no authenticated_full_access policy found.';
  else
    raise notice 'Removed % blanket-access policy/policies. Tenant isolation is now enforced by the scoped policies.', dropped;
  end if;
end $$;

-- ── 2. Show the live RLS state for every app table ──────────────────────────
-- rls_enabled must be true everywhere. policy_count must be > 0 everywhere:
-- RLS enabled with ZERO policies denies all access (a silent outage), and RLS
-- disabled means the table is wide open regardless of any policy.
select
  c.relname                                    as table_name,
  c.relrowsecurity                             as rls_enabled,
  count(p.policyname)                          as policy_count,
  coalesce(string_agg(p.policyname, ', ' order by p.policyname), '(none)') as policies
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
left join pg_policies p on p.schemaname = n.nspname and p.tablename = c.relname
where n.nspname = 'public'
  and c.relkind = 'r'
  and c.relname in (
    'customers', 'machines', 'machine_wifi', 'sensor_data', 'machine_status',
    'machine_settings', 'machine_firmware', 'machine_commands', 'machine_alerts',
    'report_requests', 'machine_reports', 'machine_logs', 'admin_users'
  )
group by c.relname, c.relrowsecurity
order by c.relrowsecurity, c.relname;
