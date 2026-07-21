export interface FirmwareVersion {
  id: string;
  version: string;
  model: string;
  releaseNotes: string;
  releasedAt: string;
  sizeKb: number;
  isStable: boolean;
  deployedDeviceCount: number;
}

export interface DeviceFirmwareStatus {
  deviceId: string;
  deviceName: string;
  model: string;
  currentVersion: string;
  latestVersion: string;
  updateAvailable: boolean;
  lastDeployedAt: string | null;
  deployProgress: number | null; // null when idle
  deployStatus: 'idle' | 'deploying' | 'success' | 'failed';
}

export interface FirmwareHistoryEntry {
  id: string;
  deviceId: string;
  deviceName: string;
  fromVersion: string;
  toVersion: string;
  action: 'Deploy' | 'Rollback';
  performedBy: string;
  performedAt: string;
  status: 'Success' | 'Failed';
}
