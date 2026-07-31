export type WifiConnectionStatus = 'Connected' | 'Disconnected' | 'Connecting';

export interface MachineWifi {
  machineId: string;
  ssid: string;
  password: string;
  connectionStatus: WifiConnectionStatus;
  ipAddress: string;
  macAddress: string;
  lastConnectedAt: string | null;
}

export interface SaveWifiInput {
  ssid: string;
  password: string;
}
