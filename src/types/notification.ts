export interface AppNotification {
  id: string;
  title: string;
  message: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low' | 'Info';
  read: boolean;
  createdAt: string;
  link?: string;
}
