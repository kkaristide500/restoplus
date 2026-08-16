// Détail abonnement — Élève
// "Demander un renouvellement" ne déclenche AUCUN paiement : ça crée juste
// une demande que le staff traite manuellement (voir renew_subscription()).
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useAuth } from '../../lib/auth-context';
import { getMySubscription, requestRenewal, type MySubscription } from '../../lib/queries/subscription';
import { SLOT_STATUS_COLORS } from '../../lib/queries/menus';

const SLOT_LABELS: Record<string, string> = {
  petit_dejeuner: 'Petit-déjeuner', dejeuner: 'Déjeuner', diner: 'Dîner',
};

export default function SubscriptionScreen() {
  const { profile } = useAuth();
  const [subscription, setSubscription] = useState<MySubscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRequesting, setIsRequesting] = useState(false);

  useEffect(() => {
    if (!profile) return;
    getMySubscription(profile.id).then((data) => {
      setSubscription(data);
      setIsLoading(false);
    });
  }, [profile]);

  async function handleRequestRenewal() {
    if (!profile) return;
    setIsRequesting(true);
    try {
      await requestRenewal(profile.id);
      Alert.alert('Demande envoyée', 'Le restaurant a été notifié et traitera ta demande de renouvellement.');
    } catch (e: any) {
      Alert.alert('Erreur', e.message);
    }
    setIsRequesting(false);
  }

  if (isLoading) {
    return <View style={styles.container}><ActivityIndicator size="large" style={{ marginTop: 60 }} /></View>;
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Détail abonnement</Text>

      <View style={styles.card}>
        <Row label="Statut" value={subscription?.isActive ? 'Actif' : 'Inactif'} valueColor={subscription?.isActive ? '#16a34a' : '#dc2626'} />
        <Row label="Formule" value={subscription?.planName ?? '—'} />
        {subscription?.expiresAt && <Row label="Expire le" value={new Date(subscription.expiresAt).toLocaleDateString('fr-FR')} />}
      </View>

      <Text style={styles.sectionTitle}>Repas restants</Text>
      <View style={styles.card}>
        {subscription?.balances.length ? subscription.balances.map((b) => (
          <View key={b.slot} style={styles.balanceRow}>
            <Text style={styles.balanceLabel}>{SLOT_LABELS[b.slot]}</Text>
            <Text style={[styles.balanceValue, b.remaining <= 3 && { color: '#dc2626' }]}>
              {b.remaining} / 30
            </Text>
          </View>
        )) : (
          <Text style={{ color: '#999', fontSize: 13 }}>Aucun abonnement actif pour le moment.</Text>
        )}
      </View>

      <TouchableOpacity
        style={[styles.renewBtn, isRequesting && styles.renewBtnDisabled]}
        onPress={handleRequestRenewal}
        disabled={isRequesting}
      >
        <Text style={styles.renewBtnText}>
          {isRequesting ? 'Envoi...' : 'Demander un renouvellement'}
        </Text>
      </TouchableOpacity>
      <Text style={styles.disclaimer}>
        Aucun paiement n'est traité ici — le règlement se fait directement auprès du restaurant.
      </Text>
    </ScrollView>
  );
}

function Row({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, valueColor && { color: valueColor }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 16 },
  card: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, padding: 14, marginBottom: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  rowLabel: { color: '#666', fontSize: 13 },
  rowValue: { fontWeight: '600', fontSize: 13 },
  sectionTitle: { fontWeight: '700', fontSize: 14, marginBottom: 8 },
  balanceRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  balanceLabel: { fontSize: 13 },
  balanceValue: { fontWeight: '700', fontSize: 13 },
  renewBtn: { backgroundColor: '#16a34a', borderRadius: 10, padding: 14, alignItems: 'center' },
  renewBtnDisabled: { opacity: 0.6 },
  renewBtnText: { color: '#fff', fontWeight: '700' },
  disclaimer: { fontSize: 11, color: '#888', textAlign: 'center', marginTop: 10, marginBottom: 24 },
});
