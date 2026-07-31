export type MachineAlertType = 'Machine Offline' | 'WiFi Disconnected';

export interface MachineAlert {
  id: string;
  machineId: string;
  machineName: string;
  alertType: MachineAlertType;
  message: string;
  isResolved: boolean;
  resolvedAt: string | null;
  createdAt: string;
}
