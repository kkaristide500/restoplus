// Historique des repas — Élève, avec notation inline (uniquement après consommation)
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useAuth } from '../../lib/auth-context';
import { getMyConsumptionHistory } from '../../lib/queries/subscription';
import { submitMealReview } from '../../lib/queries/reviews';

const SLOT_LABELS: Record<string, string> = {
  petit_dejeuner: 'Petit-déjeuner', dejeuner: 'Déjeuner', diner: 'Dîner',
};

function StarRow({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
      <Text style={{ fontSize: 11, color: '#666', width: 70 }}>{label}</Text>
      <View style={{ flexDirection: 'row', gap: 2 }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <TouchableOpacity key={n} onPress={() => onChange(n)}>
            <Text style={{ fontSize: 16, color: n <= value ? '#f59e0b' : '#e5e7eb' }}>★</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

export default function HistoryScreen() {
  const { profile } = useAuth();
  const [history, setHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [showDetails, setShowDetails] = useState(false);
  const [ratingTaste, setRatingTaste] = useState(0);
  const [ratingQuantity, setRatingQuantity] = useState(0);
  const [ratingService, setRatingService] = useState(0);
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!profile) return;
    getMyConsumptionHistory(profile.id).then((data) => {
      setHistory(data);
      setIsLoading(false);
    });
  }, [profile]);

  function toggleExpand(id: string) {
    setExpandedId(expandedId === id ? null : id);
    setRating(0);
    setComment('');
    setShowDetails(false);
    setRatingTaste(0);
    setRatingQuantity(0);
    setRatingService(0);
  }

  async function handleSubmitReview(mealConsumptionId: string) {
    if (!profile || rating === 0) {
      Alert.alert('Note requise', 'Choisis une note de 1 à 5 étoiles.');
      return;
    }
    try {
      await submitMealReview({
        userId: profile.id, mealConsumptionId, rating, comment,
        ratingTaste: ratingTaste || undefined,
        ratingQuantity: ratingQuantity || undefined,
        ratingService: ratingService || undefined,
      });
      setReviewedIds((prev) => new Set(prev).add(mealConsumptionId));
      setExpandedId(null);
      Alert.alert('Merci !', 'Ton avis a été enregistré.');
    } catch (e: any) {
      Alert.alert('Erreur', e.message);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Historique des repas</Text>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" />
      ) : (
        <ScrollView style={styles.list}>
          {history.length === 0 && <Text style={styles.empty}>Aucun repas consommé pour le moment.</Text>}
          {history.map((entry) => {
            const isExpanded = expandedId === entry.id;
            const isReviewed = reviewedIds.has(entry.id);
            return (
              <View key={entry.id} style={styles.card}>
                <TouchableOpacity style={styles.row} onPress={() => !isReviewed && toggleExpand(entry.id)}>
                  <View>
                    <Text style={styles.slot}>{SLOT_LABELS[entry.slot]}</Text>
                    <Text style={styles.date}>
                      {new Date(entry.created_at).toLocaleDateString('fr-FR')} à{' '}
                      {new Date(entry.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.deduction}>-1 repas</Text>
                    {isReviewed && <Text style={styles.reviewedTag}>Avis envoyé ✓</Text>}
                    {!isReviewed && <Text style={styles.rateLink}>Noter</Text>}
                  </View>
                </TouchableOpacity>

                {isExpanded && !isReviewed && (
                  <View style={styles.reviewForm}>
                    <View style={styles.stars}>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <TouchableOpacity key={n} onPress={() => setRating(n)}>
                          <Text style={[styles.star, n <= rating && styles.starActive]}>★</Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    {!showDetails ? (
                      <TouchableOpacity onPress={() => setShowDetails(true)}>
                        <Text style={styles.detailsLink}>+ Ajouter des critères détaillés (optionnel)</Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.detailsBox}>
                        <StarRow label="Goût" value={ratingTaste} onChange={setRatingTaste} />
                        <StarRow label="Quantité" value={ratingQuantity} onChange={setRatingQuantity} />
                        <StarRow label="Service" value={ratingService} onChange={setRatingService} />
                      </View>
                    )}

                    <TextInput
                      style={styles.commentInput}
                      placeholder="Commentaire (optionnel)"
                      value={comment}
                      onChangeText={setComment}
                      multiline
                    />
                    <TouchableOpacity style={styles.submitBtn} onPress={() => handleSubmitReview(entry.id)}>
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
  slot: { fontWeight: '600', fontSize: 14 },
  date: { fontSize: 11, color: '#888' },
  deduction: { color: '#dc2626', fontWeight: '700', fontSize: 13 },
  reviewedTag: { fontSize: 10, color: '#16a34a', marginTop: 2 },
  rateLink: { fontSize: 11, color: '#2563eb', marginTop: 2, fontWeight: '600' },
  reviewForm: { paddingBottom: 14 },
  stars: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  detailsLink: { fontSize: 11, color: '#2563eb', marginBottom: 8 },
  detailsBox: { backgroundColor: '#f9fafb', borderRadius: 8, padding: 10, marginBottom: 8 },
  star: { fontSize: 24, color: '#e5e7eb' },
  starActive: { color: '#f59e0b' },
  commentInput: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 10, fontSize: 13, minHeight: 50 },
  submitBtn: { backgroundColor: '#16a34a', borderRadius: 8, padding: 10, alignItems: 'center', marginTop: 8 },
  submitBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
});
