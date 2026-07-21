import { PageHeader } from '@/components/shared/PageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CompanySettingsForm } from '@/features/settings/CompanySettingsForm';
import { DatabaseSettingsForm } from '@/features/settings/DatabaseSettingsForm';
import { SmtpSettingsForm } from '@/features/settings/SmtpSettingsForm';
import { ThresholdsForm } from '@/features/settings/ThresholdsForm';
import { ApiKeysPanel } from '@/features/settings/ApiKeysPanel';
import { WifiDefaultsForm } from '@/features/settings/WifiDefaultsForm';
import { FirmwarePolicyForm } from '@/features/settings/FirmwarePolicyForm';
import { BackupSettingsForm } from '@/features/settings/BackupSettingsForm';

const TABS = [
  { value: 'company', label: 'Company' },
  { value: 'database', label: 'Database' },
  { value: 'smtp', label: 'SMTP' },
  { value: 'thresholds', label: 'Thresholds' },
  { value: 'api-keys', label: 'API Keys' },
  { value: 'wifi', label: 'WiFi Defaults' },
  { value: 'firmware', label: 'Firmware' },
  { value: 'backup', label: 'Backup' },
];

export function SettingsPage() {
  return (
    <div className="space-y-5">
      <PageHeader title="Settings" description="Configure platform-wide behavior for ZYGREEN admin console." />

      <Tabs defaultValue="company">
        <TabsList className="flex-wrap h-auto">
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="company">
          <CompanySettingsForm />
        </TabsContent>
        <TabsContent value="database">
          <DatabaseSettingsForm />
        </TabsContent>
        <TabsContent value="smtp">
          <SmtpSettingsForm />
        </TabsContent>
        <TabsContent value="thresholds">
          <ThresholdsForm />
        </TabsContent>
        <TabsContent value="api-keys">
          <ApiKeysPanel />
        </TabsContent>
        <TabsContent value="wifi">
          <WifiDefaultsForm />
        </TabsContent>
        <TabsContent value="firmware">
          <FirmwarePolicyForm />
        </TabsContent>
        <TabsContent value="backup">
          <BackupSettingsForm />
        </TabsContent>
      </Tabs>
    </div>
  );
}
