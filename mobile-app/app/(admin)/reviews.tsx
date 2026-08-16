// Mes avis — Membre de l'administration : noter une commande livrée
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useAuth } from '../../lib/auth-context';
import { getReviewableOrders, submitOrderReview } from '../../lib/queries/reviews';

export default function ReviewsScreen() {
  const { profile } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  async function load() {
    if (!profile) return;
    const data = await getReviewableOrders(profile.id);
    setOrders(data);
    setIsLoading(false);
  }

  useEffect(() => { load(); }, [profile]);

  function toggleExpand(id: string) {
    setExpandedId(expandedId === id ? null : id);
    setRating(0);
    setComment('');
  }

  async function handleSubmit(orderId: string) {
    if (!profile || rating === 0) {
      Alert.alert('Note requise', 'Choisis une note de 1 à 5 étoiles.');
      return;
    }
    try {
      await submitOrderReview({ userId: profile.id, orderId, rating, comment });
      setExpandedId(null);
      load();
    } catch (e: any) {
      Alert.alert('Erreur', e.message);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mes avis</Text>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" />
      ) : (
        <ScrollView style={styles.list}>
          {orders.length === 0 && <Text style={styles.empty}>Aucune commande livrée pour le moment.</Text>}
          {orders.map((order) => {
            const existingReview = order.reviews?.[0];
            const isExpanded = expandedId === order.id;
            return (
              <View key={order.id} style={styles.card}>
                <TouchableOpacity
                  style={styles.row}
                  onPress={() => !existingReview && toggleExpand(order.id)}
                  disabled={!!existingReview}
                >
                  <View>
                    <Text style={styles.orderDate}>{new Date(order.created_at).toLocaleDateString('fr-FR')}</Text>
                    <Text style={styles.orderTotal}>{order.total_amount.toLocaleString('fr-FR')} FCFA</Text>
                  </View>
                  {existingReview ? (
                    <Text style={styles.existingRating}>{'★'.repeat(existingReview.rating)}{'☆'.repeat(5 - existingReview.rating)}</Text>
                  ) : (
                    <Text style={styles.rateLink}>Noter</Text>
                  )}
                </TouchableOpacity>

                {isExpanded && !existingReview && (
                  <View style={styles.reviewForm}>
                    <View style={styles.stars}>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <TouchableOpacity key={n} onPress={() => setRating(n)}>
                          <Text style={[styles.star, n <= rating && styles.starActive]}>★</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <TextInput
                      style={styles.commentInput}
                      placeholder="Commentaire (optionnel)"
                      value={comment}
                      onChangeText={setComment}
                      multiline
                    />
                    <TouchableOpacity style={styles.submitBtn} onPress={() => handleSubmit(order.id)}>
                      <Text style={styles.submitBtnText}>Envoyer</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })}
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
  card: { borderBottomWidth: 0.5, borderColor: '#eee' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  orderDate: { fontSize: 12, color: '#666' },
  orderTotal: { fontWeight: '700', fontSize: 14 },
  existingRating: { color: '#f59e0b', fontSize: 15 },
  rateLink: { fontSize: 12, color: '#2563eb', fontWeight: '600' },
  reviewForm: { paddingBottom: 14 },
  stars: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  star: { fontSize: 24, color: '#e5e7eb' },
  starActive: { color: '#f59e0b' },
  commentInput: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 10, fontSize: 13, minHeight: 50 },
  submitBtn: { backgroundColor: '#16a34a', borderRadius: 8, padding: 10, alignItems: 'center', marginTop: 8 },
  submitBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
});
