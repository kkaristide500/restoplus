// Menu du jour — Membre de l'administration
// Même style que le menu élève (badge de statut + photo), + bouton "Commander".
import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Image, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import {
  getMenusForDate, getNext7Days, getSlotStatus, SLOT_STATUS_LABELS, SLOT_STATUS_COLORS,
  type MenuWithItems, type MealSlot,
} from '../../lib/queries/menus';

const SLOT_TITLES: Record<MealSlot, string> = {
  petit_dejeuner: 'Petit-déjeuner', dejeuner: 'Déjeuner', diner: 'Dîner',
};

export default function AdminMenuScreen() {
  const days = getNext7Days();
  const [selectedDate, setSelectedDate] = useState(days[0].date);
  const [menus, setMenus] = useState<MenuWithItems[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    getMenusForDate(selectedDate, 'administration').then((data) => {
      setMenus(data);
      setIsLoading(false);
    });
  }, [selectedDate]);

  function handleOrder(itemId: string) {
    router.push({ pathname: '/(admin)/new-order', params: { preselectedItemId: itemId } });
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Menu du jour</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateSelector}>
        {days.map((day) => (
          <TouchableOpacity
            key={day.date}
            style={[styles.dayChip, selectedDate === day.date && styles.dayChipSelected]}
            onPress={() => setSelectedDate(day.date)}
          >
            <Text style={[styles.dayLabel, selectedDate === day.date && styles.dayLabelSelected]}>{day.label}</Text>
            <Text style={[styles.dayNumber, selectedDate === day.date && styles.dayLabelSelected]}>{day.dayNumber}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" />
      ) : (
        <ScrollView style={styles.list}>
          {menus.length === 0 && <Text style={styles.empty}>Aucun menu publié pour cette date.</Text>}

          {menus.map((menu) => {
            const status = getSlotStatus(menu.slot);
            const colors = SLOT_STATUS_COLORS[status];
            return (
              <View key={menu.id} style={[styles.menuCard, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                <View style={styles.cardTop}>
                  <View>
                    <Text style={styles.slotTitle}>{SLOT_TITLES[menu.slot]}</Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: colors.text }]}>
                    <Text style={styles.badgeText}>{SLOT_STATUS_LABELS[status]}</Text>
                  </View>
                </View>

                {menu.items.map((item) => (
                  <View key={item.id} style={styles.itemRow}>
                    {item.photo_url && <Image source={{ uri: item.photo_url }} style={styles.itemImage} />}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemName}>{item.name}</Text>
                      <Text style={styles.itemPrice}>{item.price.toLocaleString('fr-FR')} FCFA</Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.orderButton, !item.is_available && styles.orderButtonDisabled]}
                      disabled={!item.is_available}
                      onPress={() => handleOrder(item.id)}
                    >
                      <Text style={styles.orderButtonText}>{item.is_available ? 'Commander' : 'Indisponible'}</Text>
                    </TouchableOpacity>
                  </View>
                ))}
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
  title: { fontSize: 20, fontWeight: '700', textAlign: 'center', marginBottom: 12 },
  dateSelector: { paddingHorizontal: 12, marginBottom: 8, flexGrow: 0 },
  dayChip: { width: 56, height: 64, borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', justifyContent: 'center', alignItems: 'center', marginRight: 8, backgroundColor: '#fff' },
  dayChipSelected: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  dayLabel: { fontSize: 12, color: '#666' },
  dayNumber: { fontSize: 16, fontWeight: '700' },
  dayLabelSelected: { color: '#fff' },
  list: { flex: 1, padding: 16 },
  empty: { textAlign: 'center', color: '#999', marginTop: 40 },
  menuCard: { borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 14 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  slotTitle: { fontWeight: '700', fontSize: 15 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  itemRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  itemImage: { width: 56, height: 56, borderRadius: 10, marginRight: 10 },
  itemName: { fontSize: 14, fontWeight: '600' },
  itemPrice: { fontSize: 12, color: '#666' },
  orderButton: { backgroundColor: '#2563eb', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12 },
  orderButtonDisabled: { backgroundColor: '#d1d5db' },
  orderButtonText: { color: '#fff', fontWeight: '600', fontSize: 12 },
});
