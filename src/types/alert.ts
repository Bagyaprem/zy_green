export type AlertSeverity = 'Critical' | 'High' | 'Medium' | 'Low' | 'Info';
export type AlertStatus = 'Active' | 'Acknowledged' | 'Resolved';

export interface DeviceAlert {
  id: string;
  deviceId: string;
  deviceName: string;
  customerName: string;
  message: string;
  severity: AlertSeverity;
  status: AlertStatus;
  parameter: string;
  value: number | null;
  threshold: number | null;
  createdAt: string;
  resolvedAt: string | null;
}
