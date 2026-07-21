import notificationsData from '@/mock/notifications.json';
import type { AppNotification } from '@/types';
import { wait } from '@/utils/latency';
import { appConfig } from '@/config/config';

let notifications: AppNotification[] = JSON.parse(JSON.stringify(notificationsData)) as AppNotification[];

export const notificationService = {
  async getNotifications(): Promise<AppNotification[]> {
    await wait(appConfig.mockLatency.fast);
    return [...notifications].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async getUnreadCount(): Promise<number> {
    await wait(appConfig.mockLatency.fast);
    return notifications.filter((n) => !n.read).length;
  },

  async markAsRead(id: string): Promise<void> {
    await wait(appConfig.mockLatency.fast);
    notifications = notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
  },

  async markAllAsRead(): Promise<void> {
    await wait(appConfig.mockLatency.fast);
    notifications = notifications.map((n) => ({ ...n, read: true }));
  },
};
