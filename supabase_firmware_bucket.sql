-- ============================================================================
-- "firmware" Storage bucket — confirmed missing entirely (storage.buckets had
-- zero rows for id='firmware'), which is the actual cause of every OTA
-- publish failing at the "Upload firmware to Supabase Storage" step
-- (POST .../storage/v1/object/firmware/$VERSION.bin -> 404, curl -f -> exit 22).
--
-- Public, unlike "reports": checkForOtaUpdate() in the firmware downloads
-- the binary via a plain unauthenticated GET to
-- .../storage/v1/object/public/firmware/<version>.bin - no signed URL, no
-- apikey header - so this bucket must be public for devices to fetch it at
-- all. Uploads only ever come from the ota.yml GitHub Action using the
-- service_role key, which bypasses RLS/storage policies entirely, so no
-- separate write policy is needed here.
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('firmware', 'firmware', true)
on conflict (id) do nothing;
