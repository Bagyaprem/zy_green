-- ============================================================================
-- ⛔ DISABLED — DO NOT RUN. Kept only as a record of what it used to do.
-- ============================================================================
-- This script used to grant, on all 12 tables:
--
--     create policy "authenticated_full_access" ... for all to authenticated
--       using (true) with check (true)
--
-- That was written back when the problem was "logged-in users get 403 on
-- every write", and it did fix that — by giving *every authenticated
-- identity unrestricted read/write on every table*, with no tenant scoping
-- whatsoever.
--
-- Why that is dangerous now: supabase_security_hardening.sql later replaced
-- that blanket policy with per-tenant policies (customers_select,
-- machines_select, ... all gated on is_admin() / current_customer_id()).
-- Postgres RLS policies are permissive and OR'd together, so re-adding
-- authenticated_full_access does not "repair" anything — it silently
-- reopens everything the hardening closed, and the scoped policies become
-- meaningless. Since public signup is enabled, that means any throwaway
-- account could read every customer's PII and every machine_wifi row
-- (which stores WiFi passwords in plaintext), and write anywhere.
--
-- Getting a 403 on writes AFTER the hardening usually means the policies are
-- working as intended and the account simply isn't an admin — the fix is to
-- add that email to the admin_users table, not to reopen the database.
--
-- If you genuinely need to re-apply RLS from scratch, run these instead:
--   1. supabase_security_hardening.sql   (the scoped policies)
--   2. supabase_tenant_isolation.sql     (verification + drift guard)
-- ============================================================================

do $$
begin
  raise exception using
    message = 'supabase_admin_schema_repair.sql is disabled: it would grant every authenticated user full access to every table and undo tenant isolation.',
    hint    = 'Run supabase_security_hardening.sql then supabase_tenant_isolation.sql instead. If a real admin is hitting 403s, add their email to admin_users.';
end $$;
