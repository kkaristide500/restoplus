// Mes commandes — onglets Toutes / En cours / Terminées
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../lib/auth-context';
import { getMyOrders, ORDER_STATUS_LABELS, type OrderStatus } from '../../lib/queries/orders';

type FilterTab = 'toutes' | 'en_cours' | 'terminees';

const IN_PROGRESS: OrderStatus[] = ['nouvelle', 'confirmee', 'en_preparation', 'prete'];
const DONE: OrderStatus[] = ['recuperee_livree', 'annulee'];

export default function OrdersScreen() {
  const { profile } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [tab, setTab] = useState<FilterTab>('toutes');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    getMyOrders(profile.id).then((data) => {
      setOrders(data);
      setIsLoading(false);
    });
  }, [profile]);

  const filtered = orders.filter((o) => {
    if (tab === 'en_cours') return IN_PROGRESS.includes(o.status);
    if (tab === 'terminees') return DONE.includes(o.status);
    return true;
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mes commandes</Text>

      <View style={styles.tabs}>
        {(['toutes', 'en_cours', 'terminees'] as FilterTab[]).map((t) => (
          <TouchableOpacity key={t} onPress={() => setTab(t)} style={[styles.tab, tab === t && styles.tabActive]}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'toutes' ? 'Toutes' : t === 'en_cours' ? 'En cours' : 'Terminées'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" />
      ) : (
        <ScrollView style={styles.list}>
          {filtered.length === 0 && <Text style={styles.empty}>Aucune commande.</Text>}
          {filtered.map((order) => (
            <TouchableOpacity
              key={order.id}
              style={styles.orderCard}
              onPress={() => router.push({ pathname: '/(admin)/order-tracking', params: { orderId: order.id } })}
            >
              <View style={styles.orderRow}>
                <Text style={styles.orderDate}>
                  {new Date(order.created_at).toLocaleDateString('fr-FR')} - {new Date(order.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </Text>
                <Text style={styles.orderStatus}>{ORDER_STATUS_LABELS[order.status as OrderStatus]}</Text>
              </View>
              <Text style={styles.orderTotal}>{order.total_amount.toLocaleString('fr-FR')} FCFA</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingTop: 12 },
  title: { fontSize: 20, fontWeight: '700', textAlign: 'center', marginBottom: 12 },
  tabs: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 12 },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center', backgroundColor: '#f3f4f6' },
  tabActive: { backgroundColor: '#16a34a' },
  tabText: { fontSize: 12, color: '#666', fontWeight: '600' },
  tabTextActive: { color: '#fff' },
  list: { flex: 1, paddingHorizontal: 16 },
  empty: { textAlign: 'center', color: '#999', marginTop: 40 },
  orderCard: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, padding: 14, marginBottom: 10 },
  orderRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  orderDate: { fontSize: 12, color: '#666' },
  orderStatus: { fontSize: 12, fontWeight: '700', color: '#16a34a' },
  orderTotal: { fontSize: 15, fontWeight: '700' },
});
