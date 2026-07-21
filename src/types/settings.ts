export interface CompanySettings {
  companyName: string;
  supportEmail: string;
  supportPhone: string;
  address: string;
  timezone: string;
  logoUrl: string;
}

export interface DatabaseSettings {
  provider: 'Supabase' | 'Firebase' | 'PostgreSQL';
  host: string;
  retentionDays: number;
  autoBackup: boolean;
}

export interface SmtpSettings {
  host: string;
  port: number;
  username: string;
  fromAddress: string;
  useTls: boolean;
}

export interface ThresholdSetting {
  parameter: string;
  unit: string;
  warning: number;
  danger: number;
}

export interface ApiKey {
  id: string;
  label: string;
  keyPreview: string;
  createdAt: string;
  lastUsedAt: string | null;
  status: 'Active' | 'Revoked';
}

export interface WifiDefaults {
  defaultSsidPrefix: string;
  autoReconnect: boolean;
  preferredBand: '2.4GHz' | '5GHz' | 'Auto';
  connectionTimeoutSec: number;
}

export interface FirmwarePolicy {
  autoUpdate: boolean;
  channel: 'Stable' | 'Beta';
  updateWindowStart: string;
  updateWindowEnd: string;
}

export interface BackupSettings {
  lastBackupAt: string | null;
  autoBackupEnabled: boolean;
  backupFrequency: 'Daily' | 'Weekly' | 'Monthly';
}
