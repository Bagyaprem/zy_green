export type MachineStatus = 'Active' | 'Inactive';

export interface Machine {
  id: string;
  customerId: string;
  customerName: string;
  machineName: string;
  machineCode: string;
  location: string;
  status: MachineStatus;
  wifiStatus: 'Connected' | 'Disconnected' | 'Connecting' | null;
  firmwareVersion: string | null;
  isOnline: boolean;
  sensorStatus: string | null;
  uptimeSeconds: number;
  lastSeen: string | null;
  createdAt: string;
}

export interface CreateMachineInput {
  customerId: string;
  machineName: string;
  machineCode: string;
  location: string;
  status: MachineStatus;
}

export type UpdateMachineInput = Partial<CreateMachineInput>;
