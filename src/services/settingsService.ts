import settingsData from '@/mock/settings.json';
import analyticsMeta from '@/mock/analytics.json';
import type {
  ApiKey,
  BackupSettings,
  CompanySettings,
  DatabaseSettings,
  FirmwarePolicy,
  SmtpSettings,
  ThresholdSetting,
  WifiDefaults,
} from '@/types';
import { wait } from '@/utils/latency';
import { generateId } from '@/utils/id';
import { appConfig } from '@/config/config';

let company: CompanySettings = { ...settingsData.company };
let database: DatabaseSettings = { ...(settingsData.database as DatabaseSettings) };
let smtp: SmtpSettings = { ...settingsData.smtp };
let wifiDefaults: WifiDefaults = { ...(settingsData.wifiDefaults as WifiDefaults) };
let firmwarePolicy: FirmwarePolicy = { ...(settingsData.firmwarePolicy as FirmwarePolicy) };
let backup: BackupSettings = { ...settingsData.backup };
let apiKeys: ApiKey[] = JSON.parse(JSON.stringify(settingsData.apiKeys)) as ApiKey[];
let thresholds: ThresholdSetting[] = JSON.parse(JSON.stringify(analyticsMeta.defaultThresholds)) as ThresholdSetting[];

export const settingsService = {
  async getCompanySettings(): Promise<CompanySettings> {
    await wait(appConfig.mockLatency.fast);
    return company;
  },
  async updateCompanySettings(input: CompanySettings): Promise<CompanySettings> {
    await wait();
    company = { ...input };
    return company;
  },

  async getDatabaseSettings(): Promise<DatabaseSettings> {
    await wait(appConfig.mockLatency.fast);
    return database;
  },
  async updateDatabaseSettings(input: DatabaseSettings): Promise<DatabaseSettings> {
    await wait();
    database = { ...input };
    return database;
  },

  async getSmtpSettings(): Promise<SmtpSettings> {
    await wait(appConfig.mockLatency.fast);
    return smtp;
  },
  async updateSmtpSettings(input: SmtpSettings): Promise<SmtpSettings> {
    await wait();
    smtp = { ...input };
    return smtp;
  },

  async getThresholds(): Promise<ThresholdSetting[]> {
    await wait(appConfig.mockLatency.fast);
    return thresholds;
  },
  async updateThresholds(input: ThresholdSetting[]): Promise<ThresholdSetting[]> {
    await wait();
    thresholds = input;
    return thresholds;
  },

  async getApiKeys(): Promise<ApiKey[]> {
    await wait(appConfig.mockLatency.fast);
    return apiKeys;
  },
  async generateApiKey(label: string): Promise<ApiKey> {
    await wait(appConfig.mockLatency.slow);
    const key: ApiKey = {
      id: generateId('KEY'),
      label,
      keyPreview: `zyg_live_••••••••${Math.random().toString(16).slice(2, 6)}`,
      createdAt: new Date().toISOString(),
      lastUsedAt: null,
      status: 'Active',
    };
    apiKeys = [key, ...apiKeys];
    return key;
  },
  async revokeApiKey(id: string): Promise<void> {
    await wait();
    apiKeys = apiKeys.map((k) => (k.id === id ? { ...k, status: 'Revoked' } : k));
  },

  async getWifiDefaults(): Promise<WifiDefaults> {
    await wait(appConfig.mockLatency.fast);
    return wifiDefaults;
  },
  async updateWifiDefaults(input: WifiDefaults): Promise<WifiDefaults> {
    await wait();
    wifiDefaults = { ...input };
    return wifiDefaults;
  },

  async getFirmwarePolicy(): Promise<FirmwarePolicy> {
    await wait(appConfig.mockLatency.fast);
    return firmwarePolicy;
  },
  async updateFirmwarePolicy(input: FirmwarePolicy): Promise<FirmwarePolicy> {
    await wait();
    firmwarePolicy = { ...input };
    return firmwarePolicy;
  },

  async getBackupSettings(): Promise<BackupSettings> {
    await wait(appConfig.mockLatency.fast);
    return backup;
  },
  async runBackupNow(): Promise<BackupSettings> {
    await wait(appConfig.mockLatency.slow);
    backup = { ...backup, lastBackupAt: new Date().toISOString() };
    return backup;
  },
  async updateBackupSettings(input: BackupSettings): Promise<BackupSettings> {
    await wait();
    backup = { ...input };
    return backup;
  },
};
