// Plats favoris — Membre de l'administration
// Calculés automatiquement à partir de l'historique de commandes, jamais saisis.
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useAuth } from '../../lib/auth-context';
import { getMyFavoriteMeals, type FavoriteMeal } from '../../lib/queries/favorites';

export default function FavoritesScreen() {
  const { profile } = useAuth();
  const [favorites, setFavorites] = useState<FavoriteMeal[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    getMyFavoriteMeals(profile.id).then((data) => {
      setFavorites(data);
      setIsLoading(false);
    });
  }, [profile]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mes plats favoris</Text>
      <Text style={styles.subtitle}>Calculés à partir de tes commandes passées</Text>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" />
      ) : (
        <ScrollView style={styles.list}>
          {favorites.length === 0 && (
            <Text style={styles.empty}>Passe quelques commandes pour voir apparaître tes favoris ici.</Text>
          )}
          {favorites.map((fav, index) => (
            <View key={fav.name} style={styles.row}>
              <Text style={styles.rank}>{index + 1}</Text>
              <Text style={styles.name}>{fav.name}</Text>
              <Text style={styles.count}>{fav.order_count}× commandé</Text>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingTop: 12 },
  title: { fontSize: 20, fontWeight: '700', textAlign: 'center' },
  subtitle: { fontSize: 12, color: '#888', textAlign: 'center', marginBottom: 16 },
  list: { flex: 1, paddingHorizontal: 16 },
  empty: { textAlign: 'center', color: '#999', marginTop: 40, paddingHorizontal: 20 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 0.5, borderColor: '#eee' },
  rank: { width: 24, fontWeight: '700', color: '#2563eb' },
  name: { flex: 1, fontSize: 14, fontWeight: '600' },
  count: { fontSize: 12, color: '#888' },
});
