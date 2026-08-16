// Notifications — générées côté serveur (statut commande, nouveau menu, solde faible)
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useAuth } from '../../lib/auth-context';
import { getMyNotifications, markNotificationAsRead, type NotificationRow } from '../../lib/queries/notifications';

const TYPE_ICONS: Record<string, string> = {
  order_status: '📦',
  new_menu: '🍽️',
  low_balance: '⚠️',
};

export default function NotificationsScreen() {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    getMyNotifications(profile.id).then((data) => {
      setNotifications(data);
      setIsLoading(false);
    });
  }, [profile]);

  async function handlePress(notif: NotificationRow) {
    if (!notif.is_read) {
      await markNotificationAsRead(notif.id);
      setNotifications((prev) => prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n)));
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Notifications</Text>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" />
      ) : (
        <ScrollView style={styles.list}>
          {notifications.length === 0 && <Text style={styles.empty}>Aucune notification.</Text>}
          {notifications.map((notif) => (
            <TouchableOpacity
              key={notif.id}
              onPress={() => handlePress(notif)}
              style={[styles.row, !notif.is_read && styles.rowUnread]}
            >
              <Text style={styles.icon}>{TYPE_ICONS[notif.type] ?? '🔔'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.content}>{notif.content}</Text>
                <Text style={styles.date}>
                  {new Date(notif.created_at).toLocaleDateString('fr-FR')} à{' '}
                  {new Date(notif.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
              {!notif.is_read && <View style={styles.dot} />}
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingTop: 12 },
  title: { fontSize: 20, fontWeight: '700', textAlign: 'center', marginBottom: 16 },
  list: { flex: 1, paddingHorizontal: 16 },
  empty: { textAlign: 'center', color: '#999', marginTop: 40 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 0.5, borderColor: '#eee' },
  rowUnread: { backgroundColor: '#f9fafb' },
  icon: { fontSize: 20, marginRight: 12 },
  content: { fontSize: 13, fontWeight: '500' },
  date: { fontSize: 11, color: '#888', marginTop: 2 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#16a34a', marginLeft: 8 },
});
