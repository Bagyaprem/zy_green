export interface WifiNetwork {
  ssid: string;
  signal: number; // percent
  secure: boolean;
  frequencyGHz: 2.4 | 5;
}

export interface WifiConfig {
  deviceId: string;
  ssid: string;
  connected: boolean;
  ipAddress: string;
  signal: number;
  lastConnectedAt: string | null;
}

export interface SaveWifiConfigInput {
  deviceId: string;
  ssid: string;
  password: string;
}
