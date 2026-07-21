import wifiData from '@/mock/wifi.json';
import type { SaveWifiConfigInput, WifiConfig, WifiNetwork } from '@/types';
import { wait } from '@/utils/latency';
import { appConfig } from '@/config/config';

let configs: WifiConfig[] = JSON.parse(JSON.stringify(wifiData.configs)) as WifiConfig[];
const scanPool: WifiNetwork[] = wifiData.scanPool as WifiNetwork[];

export const wifiService = {
  async getConfig(deviceId: string): Promise<WifiConfig | undefined> {
    await wait(appConfig.mockLatency.fast);
    return configs.find((c) => c.deviceId === deviceId);
  },

  async scanNetworks(): Promise<WifiNetwork[]> {
    await wait(appConfig.mockLatency.slow);
    return scanPool
      .map((n) => ({ ...n, signal: Math.max(20, Math.min(100, n.signal ?? Math.floor(Math.random() * 60) + 35)) }))
      .sort((a, b) => b.signal - a.signal);
  },

  async connect(deviceId: string, ssid: string): Promise<WifiConfig> {
    await wait(appConfig.mockLatency.slow);
    const idx = configs.findIndex((c) => c.deviceId === deviceId);
    const updated: WifiConfig = {
      deviceId,
      ssid,
      connected: true,
      ipAddress: `192.168.${Math.floor(Math.random() * 20) + 1}.${Math.floor(Math.random() * 250) + 2}`,
      signal: Math.floor(Math.random() * 40) + 55,
      lastConnectedAt: new Date().toISOString(),
    };
    if (idx === -1) configs.push(updated);
    else configs[idx] = updated;
    return updated;
  },

  async disconnect(deviceId: string): Promise<WifiConfig> {
    await wait();
    const idx = configs.findIndex((c) => c.deviceId === deviceId);
    if (idx === -1) throw new Error('WiFi config not found');
    configs[idx] = { ...configs[idx], connected: false, signal: 0 };
    return configs[idx];
  },

  async saveConfiguration(input: SaveWifiConfigInput): Promise<WifiConfig> {
    await wait(appConfig.mockLatency.slow);
    return this.connect(input.deviceId, input.ssid);
  },
};
