// Requêtes partagées : notifications (générées côté serveur uniquement)
import { supabase } from '../supabase';

export interface NotificationRow {
  id: string;
  type: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

export async function getMyNotifications(userId: string): Promise<NotificationRow[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('id, type, content, is_read, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return data ?? [];
}

export async function markNotificationAsRead(notificationId: string) {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId);
  if (error) throw error;
}

export async function getUnreadCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false);
  if (error) return 0;
  return count ?? 0;
}

/** Écoute en temps réel les nouvelles notifications de l'utilisateur. */
export function subscribeToNotifications(userId: string, onNew: () => void) {
  const channel = supabase
    .channel(`notifications-${userId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
      () => onNew()
    )
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}
