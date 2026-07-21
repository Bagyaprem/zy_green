import firmwareData from '@/mock/firmware.json';
import type { DeviceFirmwareStatus, FirmwareHistoryEntry, FirmwareVersion } from '@/types';
import { wait } from '@/utils/latency';
import { generateId } from '@/utils/id';
import { appConfig } from '@/config/config';

let catalog: FirmwareVersion[] = JSON.parse(JSON.stringify(firmwareData.catalog)) as FirmwareVersion[];
let deviceStatus: DeviceFirmwareStatus[] = JSON.parse(JSON.stringify(firmwareData.deviceStatus)) as DeviceFirmwareStatus[];
let history: FirmwareHistoryEntry[] = JSON.parse(JSON.stringify(firmwareData.history)) as FirmwareHistoryEntry[];

export const firmwareService = {
  async getVersion(deviceId: string): Promise<DeviceFirmwareStatus | undefined> {
    await wait(appConfig.mockLatency.fast);
    return deviceStatus.find((d) => d.deviceId === deviceId);
  },

  async getCatalog(): Promise<FirmwareVersion[]> {
    await wait();
    return [...catalog].sort((a, b) => new Date(b.releasedAt).getTime() - new Date(a.releasedAt).getTime());
  },

  async getDeviceStatuses(): Promise<DeviceFirmwareStatus[]> {
    await wait();
    return deviceStatus;
  },

  async getHistory(): Promise<FirmwareHistoryEntry[]> {
    await wait();
    return [...history].sort((a, b) => new Date(b.performedAt).getTime() - new Date(a.performedAt).getTime());
  },

  async upload(file: { name: string; sizeKb: number; model: string; version: string; notes: string }): Promise<FirmwareVersion> {
    await wait(appConfig.mockLatency.slow);
    const newVersion: FirmwareVersion = {
      id: generateId('FW'),
      version: file.version,
      model: file.model,
      releaseNotes: file.notes || `Uploaded from ${file.name}`,
      releasedAt: new Date().toISOString(),
      sizeKb: file.sizeKb,
      isStable: false,
      deployedDeviceCount: 0,
    };
    catalog = [newVersion, ...catalog];
    return newVersion;
  },

  async deploy(deviceIds: string[], version: string, performedBy = 'Admin'): Promise<void> {
    await wait(appConfig.mockLatency.slow);
    deviceIds.forEach((deviceId) => {
      const idx = deviceStatus.findIndex((d) => d.deviceId === deviceId);
      if (idx !== -1) {
        const from = deviceStatus[idx].currentVersion;
        deviceStatus[idx] = {
          ...deviceStatus[idx],
          currentVersion: version,
          updateAvailable: false,
          deployStatus: 'success',
          deployProgress: 100,
          lastDeployedAt: new Date().toISOString(),
        };
        history = [
          {
            id: generateId('FWH'),
            deviceId,
            deviceName: deviceStatus[idx].deviceName,
            fromVersion: from,
            toVersion: version,
            action: 'Deploy',
            performedBy,
            performedAt: new Date().toISOString(),
            status: 'Success',
          },
          ...history,
        ];
      }
    });
  },

  async rollback(deviceId: string, performedBy = 'Admin'): Promise<DeviceFirmwareStatus> {
    await wait(appConfig.mockLatency.slow);
    const idx = deviceStatus.findIndex((d) => d.deviceId === deviceId);
    if (idx === -1) throw new Error('Device firmware status not found');
    const priorEntry = history.find((h) => h.deviceId === deviceId && h.action === 'Deploy');
    const rollbackTo = priorEntry?.fromVersion ?? deviceStatus[idx].currentVersion;
    const from = deviceStatus[idx].currentVersion;
    deviceStatus[idx] = { ...deviceStatus[idx], currentVersion: rollbackTo, deployStatus: 'success', deployProgress: 100 };
    history = [
      {
        id: generateId('FWH'),
        deviceId,
        deviceName: deviceStatus[idx].deviceName,
        fromVersion: from,
        toVersion: rollbackTo,
        action: 'Rollback',
        performedBy,
        performedAt: new Date().toISOString(),
        status: 'Success',
      },
      ...history,
    ];
    return deviceStatus[idx];
  },
};
