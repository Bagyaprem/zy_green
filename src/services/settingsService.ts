import { supabase, assertSupabaseConfigured } from './supabaseClient';
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

// All settings tables below are singleton rows (id = 1) — see supabase_admin_schema.sql.
const SINGLETON_ID = 1;

export const settingsService = {
  async getCompanySettings(): Promise<CompanySettings> {
    assertSupabaseConfigured();
    const { data, error } = await supabase.from('company_settings').select('*').eq('id', SINGLETON_ID).maybeSingle();
    if (error) throw error;
    return {
      companyName: data?.company_name ?? '',
      supportEmail: data?.support_email ?? '',
      supportPhone: data?.support_phone ?? '',
      address: data?.address ?? '',
      timezone: data?.timezone ?? '',
      logoUrl: data?.logo_url ?? '',
    };
  },
  async updateCompanySettings(input: CompanySettings): Promise<CompanySettings> {
    assertSupabaseConfigured();
    const { error } = await supabase.from('company_settings').upsert({
      id: SINGLETON_ID,
      company_name: input.companyName,
      support_email: input.supportEmail,
      support_phone: input.supportPhone,
      address: input.address,
      timezone: input.timezone,
      logo_url: input.logoUrl,
    });
    if (error) throw error;
    return input;
  },

  async getDatabaseSettings(): Promise<DatabaseSettings> {
    assertSupabaseConfigured();
    const { data, error } = await supabase.from('database_settings').select('*').eq('id', SINGLETON_ID).maybeSingle();
    if (error) throw error;
    return {
      provider: data?.provider ?? 'Supabase',
      host: data?.host ?? '',
      retentionDays: data?.retention_days ?? 90,
      autoBackup: data?.auto_backup ?? true,
    };
  },
  async updateDatabaseSettings(input: DatabaseSettings): Promise<DatabaseSettings> {
    assertSupabaseConfigured();
    const { error } = await supabase.from('database_settings').upsert({
      id: SINGLETON_ID,
      provider: input.provider,
      host: input.host,
      retention_days: input.retentionDays,
      auto_backup: input.autoBackup,
    });
    if (error) throw error;
    return input;
  },

  async getSmtpSettings(): Promise<SmtpSettings> {
    assertSupabaseConfigured();
    const { data, error } = await supabase.from('smtp_settings').select('*').eq('id', SINGLETON_ID).maybeSingle();
    if (error) throw error;
    return {
      host: data?.host ?? '',
      port: data?.port ?? 587,
      username: data?.username ?? '',
      fromAddress: data?.from_address ?? '',
      useTls: data?.use_tls ?? true,
    };
  },
  async updateSmtpSettings(input: SmtpSettings): Promise<SmtpSettings> {
    assertSupabaseConfigured();
    const { error } = await supabase.from('smtp_settings').upsert({
      id: SINGLETON_ID,
      host: input.host,
      port: input.port,
      username: input.username,
      from_address: input.fromAddress,
      use_tls: input.useTls,
    });
    if (error) throw error;
    return input;
  },

  async getThresholds(): Promise<ThresholdSetting[]> {
    assertSupabaseConfigured();
    const { data, error } = await supabase.from('thresholds').select('*').order('parameter', { ascending: true });
    if (error) throw error;
    return (data ?? []).map((row) => ({ parameter: row.parameter, unit: row.unit ?? '', warning: row.warning, danger: row.danger }));
  },
  async updateThresholds(input: ThresholdSetting[]): Promise<ThresholdSetting[]> {
    assertSupabaseConfigured();
    const { error } = await supabase.from('thresholds').upsert(
      input.map((t) => ({ parameter: t.parameter, unit: t.unit, warning: t.warning, danger: t.danger })),
      { onConflict: 'parameter' }
    );
    if (error) throw error;
    return input;
  },

  async getApiKeys(): Promise<ApiKey[]> {
    assertSupabaseConfigured();
    const { data, error } = await supabase.from('api_keys').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map((row) => ({
      id: row.id,
      label: row.label,
      keyPreview: row.key_preview,
      createdAt: row.created_at,
      lastUsedAt: row.last_used_at,
      status: row.status,
    }));
  },
  /** Real secret material must be generated server-side — delegates to an Edge Function. */
  async generateApiKey(label: string): Promise<ApiKey> {
    assertSupabaseConfigured();
    const { data, error } = await supabase.functions.invoke('generate-api-key', { body: { label } });
    if (error) throw error;
    return data as ApiKey;
  },
  async revokeApiKey(id: string): Promise<void> {
    assertSupabaseConfigured();
    const { error } = await supabase.from('api_keys').update({ status: 'Revoked' }).eq('id', id);
    if (error) throw error;
  },

  async getWifiDefaults(): Promise<WifiDefaults> {
    assertSupabaseConfigured();
    const { data, error } = await supabase.from('wifi_defaults').select('*').eq('id', SINGLETON_ID).maybeSingle();
    if (error) throw error;
    return {
      defaultSsidPrefix: data?.default_ssid_prefix ?? '',
      autoReconnect: data?.auto_reconnect ?? true,
      preferredBand: data?.preferred_band ?? '2.4GHz',
      connectionTimeoutSec: data?.connection_timeout_sec ?? 30,
    };
  },
  async updateWifiDefaults(input: WifiDefaults): Promise<WifiDefaults> {
    assertSupabaseConfigured();
    const { error } = await supabase.from('wifi_defaults').upsert({
      id: SINGLETON_ID,
      default_ssid_prefix: input.defaultSsidPrefix,
      auto_reconnect: input.autoReconnect,
      preferred_band: input.preferredBand,
      connection_timeout_sec: input.connectionTimeoutSec,
    });
    if (error) throw error;
    return input;
  },

  async getFirmwarePolicy(): Promise<FirmwarePolicy> {
    assertSupabaseConfigured();
    const { data, error } = await supabase.from('firmware_policy').select('*').eq('id', SINGLETON_ID).maybeSingle();
    if (error) throw error;
    return {
      autoUpdate: data?.auto_update ?? false,
      channel: data?.channel ?? 'Stable',
      updateWindowStart: data?.update_window_start ?? '01:00',
      updateWindowEnd: data?.update_window_end ?? '04:00',
    };
  },
  async updateFirmwarePolicy(input: FirmwarePolicy): Promise<FirmwarePolicy> {
    assertSupabaseConfigured();
    const { error } = await supabase.from('firmware_policy').upsert({
      id: SINGLETON_ID,
      auto_update: input.autoUpdate,
      channel: input.channel,
      update_window_start: input.updateWindowStart,
      update_window_end: input.updateWindowEnd,
    });
    if (error) throw error;
    return input;
  },

  async getBackupSettings(): Promise<BackupSettings> {
    assertSupabaseConfigured();
    const { data, error } = await supabase.from('backup_settings').select('*').eq('id', SINGLETON_ID).maybeSingle();
    if (error) throw error;
    return {
      lastBackupAt: data?.last_backup_at ?? null,
      autoBackupEnabled: data?.auto_backup_enabled ?? true,
      backupFrequency: data?.backup_frequency ?? 'Daily',
    };
  },
  /** Triggering an actual backup job is server-side work — delegates to an Edge Function. */
  async runBackupNow(): Promise<BackupSettings> {
    assertSupabaseConfigured();
    const { error: invokeError } = await supabase.functions.invoke('run-backup');
    if (invokeError) throw invokeError;
    const { data, error } = await supabase
      .from('backup_settings')
      .upsert({ id: SINGLETON_ID, last_backup_at: new Date().toISOString() })
      .select('*')
      .single();
    if (error) throw error;
    return {
      lastBackupAt: data.last_backup_at,
      autoBackupEnabled: data.auto_backup_enabled,
      backupFrequency: data.backup_frequency,
    };
  },
  async updateBackupSettings(input: BackupSettings): Promise<BackupSettings> {
    assertSupabaseConfigured();
    const { error } = await supabase.from('backup_settings').upsert({
      id: SINGLETON_ID,
      last_backup_at: input.lastBackupAt,
      auto_backup_enabled: input.autoBackupEnabled,
      backup_frequency: input.backupFrequency,
    });
    if (error) throw error;
    return input;
  },
};
