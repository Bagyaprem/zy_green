export interface ActivityLogEntry {
  id: string;
  actor: string;
  actorRole: string;
  action: string;
  entityType: 'Device' | 'Customer' | 'User' | 'Firmware' | 'Alert' | 'Settings' | 'Report' | 'Auth';
  entityName: string;
  timestamp: string;
  details: string;
  ip: string;
}
