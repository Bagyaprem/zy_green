import { supabase, assertSupabaseConfigured } from './supabaseClient';
import type { DeviceFirmwareStatus, FirmwareHistoryEntry, FirmwareVersion } from '@/types';
import { generateId } from '@/utils/id';

interface FirmwareVersionRow {
  id: string;
  version: string;
  model: string;
  release_notes: string | null;
  released_at: string;
  size_kb: number | null;
  is_stable: boolean;
}

interface DeviceFirmwareStatusRow {
  device_id: string;
  device_name: string | null;
  model: string | null;
  current_version: string | null;
  latest_version: string | null;
  update_available: boolean;
  last_deployed_at: string | null;
  deploy_progress: number | null;
  deploy_status: DeviceFirmwareStatus['deployStatus'];
}

interface FirmwareHistoryRow {
  id: string;
  device_id: string;
  device_name: string | null;
  from_version: string | null;
  to_version: string | null;
  action: FirmwareHistoryEntry['action'];
  performed_by: string | null;
  performed_at: string;
  status: FirmwareHistoryEntry['status'];
}

function mapVersion(row: FirmwareVersionRow, deployedDeviceCount = 0): FirmwareVersion {
  return {
    id: row.id,
    version: row.version,
    model: row.model,
    releaseNotes: row.release_notes ?? '',
    releasedAt: row.released_at,
    sizeKb: row.size_kb ?? 0,
    isStable: row.is_stable,
    deployedDeviceCount,
  };
}

function mapDeviceStatus(row: DeviceFirmwareStatusRow): DeviceFirmwareStatus {
  return {
    deviceId: row.device_id,
    deviceName: row.device_name ?? '',
    model: row.model ?? '',
    currentVersion: row.current_version ?? '',
    latestVersion: row.latest_version ?? '',
    updateAvailable: row.update_available,
    lastDeployedAt: row.last_deployed_at,
    deployProgress: row.deploy_progress,
    deployStatus: row.deploy_status,
  };
}

function mapHistory(row: FirmwareHistoryRow): FirmwareHistoryEntry {
  return {
    id: row.id,
    deviceId: row.device_id,
    deviceName: row.device_name ?? '',
    fromVersion: row.from_version ?? '',
    toVersion: row.to_version ?? '',
    action: row.action,
    performedBy: row.performed_by ?? '',
    performedAt: row.performed_at,
    status: row.status,
  };
}

export const firmwareService = {
  async getVersion(deviceId: string): Promise<DeviceFirmwareStatus | undefined> {
    assertSupabaseConfigured();
    const { data, error } = await supabase.from('device_firmware_status').select('*').eq('device_id', deviceId).maybeSingle();
    if (error) throw error;
    return data ? mapDeviceStatus(data as DeviceFirmwareStatusRow) : undefined;
  },

  async getCatalog(): Promise<FirmwareVersion[]> {
    assertSupabaseConfigured();
    const { data, error } = await supabase.from('firmware_versions').select('*').order('released_at', { ascending: false });
    if (error) throw error;

    const versions = data as FirmwareVersionRow[];
    const counts = await Promise.all(
      versions.map((v) => supabase.from('device_firmware_status').select('*', { count: 'exact', head: true }).eq('current_version', v.version))
    );
    return versions.map((row, i) => mapVersion(row, counts[i].count ?? 0));
  },

  async getDeviceStatuses(): Promise<DeviceFirmwareStatus[]> {
    assertSupabaseConfigured();
    const { data, error } = await supabase.from('device_firmware_status').select('*');
    if (error) throw error;
    return (data as DeviceFirmwareStatusRow[]).map(mapDeviceStatus);
  },

  async getHistory(): Promise<FirmwareHistoryEntry[]> {
    assertSupabaseConfigured();
    const { data, error } = await supabase.from('firmware_history').select('*').order('performed_at', { ascending: false });
    if (error) throw error;
    return (data as FirmwareHistoryRow[]).map(mapHistory);
  },

  async upload(file: { name: string; sizeKb: number; model: string; version: string; notes: string }): Promise<FirmwareVersion> {
    assertSupabaseConfigured();
    const { data, error } = await supabase
      .from('firmware_versions')
      .insert({
        id: generateId('FW'),
        version: file.version,
        model: file.model,
        release_notes: file.notes || `Uploaded from ${file.name}`,
        size_kb: file.sizeKb,
        is_stable: false,
      })
      .select('*')
      .single();
    if (error) throw error;
    return mapVersion(data as FirmwareVersionRow, 0);
  },

  async deploy(deviceIds: string[], version: string, performedBy = 'Admin'): Promise<void> {
    assertSupabaseConfigured();
    for (const deviceId of deviceIds) {
      const { data: current, error: fetchError } = await supabase
        .from('device_firmware_status')
        .select('*')
        .eq('device_id', deviceId)
        .maybeSingle();
      if (fetchError) throw fetchError;
      const fromVersion = current?.current_version ?? '';

      const { error: updateError } = await supabase
        .from('device_firmware_status')
        .update({
          current_version: version,
          update_available: false,
          deploy_status: 'success',
          deploy_progress: 100,
          last_deployed_at: new Date().toISOString(),
        })
        .eq('device_id', deviceId);
      if (updateError) throw updateError;

      await supabase.from('devices').update({ firmware_version: version }).eq('id', deviceId);

      const { error: historyError } = await supabase.from('firmware_history').insert({
        id: generateId('FWH'),
        device_id: deviceId,
        device_name: current?.device_name ?? deviceId,
        from_version: fromVersion,
        to_version: version,
        action: 'Deploy',
        performed_by: performedBy,
        status: 'Success',
      });
      if (historyError) throw historyError;
    }
  },

  async rollback(deviceId: string, performedBy = 'Admin'): Promise<DeviceFirmwareStatus> {
    assertSupabaseConfigured();
    const { data: current, error: fetchError } = await supabase
      .from('device_firmware_status')
      .select('*')
      .eq('device_id', deviceId)
      .single();
    if (fetchError) throw fetchError;

    const { data: lastDeploy } = await supabase
      .from('firmware_history')
      .select('from_version')
      .eq('device_id', deviceId)
      .eq('action', 'Deploy')
      .order('performed_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const rollbackTo = lastDeploy?.from_version ?? current.current_version;
    const fromVersion = current.current_version;

    const { data, error } = await supabase
      .from('device_firmware_status')
      .update({ current_version: rollbackTo, deploy_status: 'success', deploy_progress: 100 })
      .eq('device_id', deviceId)
      .select('*')
      .single();
    if (error) throw error;

    await supabase.from('devices').update({ firmware_version: rollbackTo }).eq('id', deviceId);

    await supabase.from('firmware_history').insert({
      id: generateId('FWH'),
      device_id: deviceId,
      device_name: current.device_name ?? deviceId,
      from_version: fromVersion,
      to_version: rollbackTo,
      action: 'Rollback',
      performed_by: performedBy,
      status: 'Success',
    });

    return mapDeviceStatus(data as DeviceFirmwareStatusRow);
  },
};
