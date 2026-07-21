import { supabase, assertSupabaseConfigured } from './supabaseClient';
import type { AppNotification } from '@/types';

interface NotificationRow {
  id: string;
  title: string;
  message: string;
  severity: AppNotification['severity'];
  read: boolean;
  created_at: string;
  link: string | null;
}

function mapNotification(row: NotificationRow): AppNotification {
  return {
    id: row.id,
    title: row.title,
    message: row.message,
    severity: row.severity,
    read: row.read,
    createdAt: row.created_at,
    link: row.link ?? undefined,
  };
}

export const notificationService = {
  async getNotifications(): Promise<AppNotification[]> {
    assertSupabaseConfigured();
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    return (data as NotificationRow[]).map(mapNotification);
  },

  async getUnreadCount(): Promise<number> {
    assertSupabaseConfigured();
    const { count, error } = await supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('read', false);
    if (error) throw error;
    return count ?? 0;
  },

  async markAsRead(id: string): Promise<void> {
    assertSupabaseConfigured();
    const { error } = await supabase.from('notifications').update({ read: true }).eq('id', id);
    if (error) throw error;
  },

  async markAllAsRead(): Promise<void> {
    assertSupabaseConfigured();
    const { error } = await supabase.from('notifications').update({ read: true }).eq('read', false);
    if (error) throw error;
  },
};
