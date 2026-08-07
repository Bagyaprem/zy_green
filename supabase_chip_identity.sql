-- ============================================================================
-- Chip-ID based machine identity
-- ============================================================================
-- Lets firmware resolve its own machines.id row using the ESP32's own unique
-- hardware MAC (burned into the chip, immutable) instead of a compile-time
-- MACHINE_CODE constant. That means the exact same compiled firmware binary
-- is correct on every physical board - no more per-board source
-- differences, which is required for a single OTA push to safely update
-- more than one device at once. See resolve_machine_id_by_chip() below and
-- initChipId()/resolveMachineId() in the firmware's DeviceConfig.cpp.
--
-- One-time provisioning per physical board: flash the chip-ID-aware
-- firmware once over USB, read the "Chip ID: ..." line from Serial Monitor
-- at boot, then run:
--   update public.machines set chip_id = '<value from Serial>' where machine_code = '<AQM-00x>';
-- After that, this board can receive every future firmware update via OTA -
-- no more manual reflash for code-only changes.
--
-- resolve_machine_id(code) is left in place (not dropped) - it's still used
-- by admin tooling/manual provisioning to look a machine up by its
-- human-assigned code, it's just no longer what the firmware itself calls.

alter table public.machines add column if not exists chip_id text unique;

create or replace function public.resolve_machine_id_by_chip(p_chip_id text)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.machines where chip_id = p_chip_id limit 1;
$$;
grant execute on function public.resolve_machine_id_by_chip(text) to anon;
