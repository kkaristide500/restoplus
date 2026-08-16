// Suivi de commande — statut en temps réel (Supabase Realtime)
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import {
  getOrderDetail, cancelOrder, ORDER_STATUS_LABELS, ORDER_STATUS_STEPS, type OrderStatus,
} from '../../lib/queries/orders';

export default function OrderTrackingScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const [order, setOrder] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function load() {
    const data = await getOrderDetail(orderId);
    setOrder(data);
    setIsLoading(false);
  }

  useEffect(() => {
    load();

    // Écoute en temps réel des changements de statut sur cette commande
    const channel = supabase
      .channel(`order-${orderId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${orderId}` },
        () => load()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [orderId]);

  async function handleCancel() {
    Alert.alert('Annuler la commande', 'Confirmer l\'annulation ?', [
      { text: 'Non', style: 'cancel' },
      {
        text: 'Oui, annuler', style: 'destructive', onPress: async () => {
          await cancelOrder(orderId);
          load();
        },
      },
    ]);
  }

  if (isLoading || !order) {
    return <View style={styles.container}><Text>Chargement...</Text></View>;
  }

  const currentStepIndex = ORDER_STATUS_STEPS.indexOf(order.status as OrderStatus);
  const isCancelled = order.status === 'annulee';

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Suivi de commande</Text>

      {!isCancelled ? (
        <View style={styles.timeline}>
          {ORDER_STATUS_STEPS.map((step, i) => (
            <View key={step} style={styles.timelineRow}>
              <View style={[styles.dot, i <= currentStepIndex && styles.dotActive]} />
              <Text style={[styles.stepLabel, i <= currentStepIndex && styles.stepLabelActive]}>
                {ORDER_STATUS_LABELS[step]}
              </Text>
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.cancelledLabel}>Commande annulée</Text>
      )}

      <View style={styles.summary}>
        {order.order_items.map((item: any) => (
          <View key={item.id} style={styles.itemRow}>
            <Text>{item.quantity}× {item.menu_items.name}</Text>
            <Text>{(item.quantity * item.unit_price).toLocaleString('fr-FR')} FCFA</Text>
          </View>
        ))}
        <View style={[styles.itemRow, styles.totalRow]}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalLabel}>{order.total_amount.toLocaleString('fr-FR')} FCFA</Text>
        </View>
      </View>

      {order.delivery_requests?.[0] && (
        <View style={styles.deliveryBox}>
          <Text style={styles.deliveryTitle}>Livraison</Text>
          <Text style={styles.deliveryText}>
            {order.delivery_requests[0].batiment} — {order.delivery_requests[0].bureau}
          </Text>
        </View>
      )}

      {order.status === 'nouvelle' && (
        <TouchableOpacity onPress={handleCancel} style={styles.cancelBtn}>
          <Text style={styles.cancelBtnText}>Annuler la commande</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity onPress={() => router.replace('/(admin)/home')} style={styles.homeBtn}>
        <Text style={styles.homeBtnText}>Retour à l'accueil</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 20 },
  timeline: { marginBottom: 24 },
  timelineRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  dot: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#e5e7eb', marginRight: 12 },
  dotActive: { backgroundColor: '#16a34a' },
  stepLabel: { fontSize: 14, color: '#999' },
  stepLabelActive: { color: '#111', fontWeight: '600' },
  cancelledLabel: { fontSize: 15, color: '#dc2626', fontWeight: '700', marginBottom: 20 },
  summary: { backgroundColor: '#f9fafb', borderRadius: 10, padding: 14, marginBottom: 16 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  totalRow: { borderTopWidth: 0.5, borderColor: '#ddd', marginTop: 6, paddingTop: 8 },
  totalLabel: { fontWeight: '700' },
  deliveryBox: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 12, marginBottom: 16 },
  deliveryTitle: { fontWeight: '700', fontSize: 13, marginBottom: 4 },
  deliveryText: { fontSize: 13, color: '#555' },
  cancelBtn: { borderWidth: 1, borderColor: '#dc2626', borderRadius: 10, padding: 14, alignItems: 'center', marginBottom: 12 },
  cancelBtnText: { color: '#dc2626', fontWeight: '700' },
  homeBtn: { backgroundColor: '#16a34a', borderRadius: 10, padding: 14, alignItems: 'center', marginBottom: 24 },
  homeBtnText: { color: '#fff', fontWeight: '700' },
});
