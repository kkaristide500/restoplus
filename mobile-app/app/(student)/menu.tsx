// Menu du jour — Élève (lecture seule, pas de commande)
// Style aligné sur la maquette : badge de statut + photo du plat à droite.
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Image, ActivityIndicator,
} from 'react-native';
import { useAuth } from '../../lib/auth-context';
import {
  getMenusForDate, getStudentIncludedSlots, getNext7Days,
  getSlotStatus, SLOT_STATUS_LABELS, SLOT_STATUS_COLORS,
  type MenuWithItems, type MealSlot,
} from '../../lib/queries/menus';

const SLOT_TIMES: Record<MealSlot, string> = {
  petit_dejeuner: '06h30 - 08h00',
  dejeuner: '12h00 - 14h00',
  diner: '18h30 - 20h30',
};
const SLOT_TITLES: Record<MealSlot, string> = {
  petit_dejeuner: 'Petit-déjeuner',
  dejeuner: 'Déjeuner',
  diner: 'Dîner',
};

export default function StudentMenuScreen() {
  const { profile } = useAuth();
  const days = getNext7Days();
  const [selectedDate, setSelectedDate] = useState(days[0].date);
  const [menus, setMenus] = useState<MenuWithItems[]>([]);
  const [includedSlots, setIncludedSlots] = useState<MealSlot[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!profile) return;
    setIsLoading(true);
    const [menuData, slots] = await Promise.all([
      getMenusForDate(selectedDate, 'eleve'),
      includedSlots === null ? getStudentIncludedSlots(profile.id) : Promise.resolve(includedSlots),
    ]);
    setMenus(menuData);
    if (slots) setIncludedSlots(slots);
    setIsLoading(false);
  }, [selectedDate, profile]);

  useEffect(() => { loadData(); }, [selectedDate, profile]);

  const visibleMenus = includedSlots ? menus.filter((m) => includedSlots.includes(m.slot)) : menus;

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
          {visibleMenus.length === 0 && <Text style={styles.empty}>Aucun menu publié pour cette date.</Text>}

          {visibleMenus.map((menu) => {
            const status = getSlotStatus(menu.slot);
            const colors = SLOT_STATUS_COLORS[status];
            const cover = menu.items.find((it) => it.photo_url)?.photo_url;
            return (
              <View key={menu.id} style={[styles.menuCard, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                <View style={styles.cardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.slotTitle}>{SLOT_TITLES[menu.slot]}</Text>
                    <Text style={styles.slotTime}>{SLOT_TIMES[menu.slot]}</Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: colors.text }]}>
                    <Text style={styles.badgeText}>{SLOT_STATUS_LABELS[status]}</Text>
                  </View>
                </View>

                <View style={styles.cardBody}>
                  <View style={{ flex: 1 }}>
                    {menu.items.map((item) => (
                      <Text key={item.id} style={styles.itemName}>• {item.name}</Text>
                    ))}
                  </View>
                  {cover && <Image source={{ uri: cover }} style={styles.cardImage} />}
                </View>
              </View>
            );
          })}

          {includedSlots && includedSlots.length < 3 && (
            <Text style={styles.hint}>ℹ️ Ta formule d'abonnement n'inclut pas tous les repas de la journée.</Text>
          )}
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
  dayChipSelected: { backgroundColor: '#16a34a', borderColor: '#16a34a' },
  dayLabel: { fontSize: 12, color: '#666' },
  dayNumber: { fontSize: 16, fontWeight: '700' },
  dayLabelSelected: { color: '#fff' },
  list: { flex: 1, padding: 16 },
  empty: { textAlign: 'center', color: '#999', marginTop: 40 },
  menuCard: { borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 14 },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  slotTitle: { fontWeight: '700', fontSize: 15 },
  slotTime: { fontSize: 11, color: '#888' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  cardBody: { flexDirection: 'row', alignItems: 'center' },
  itemName: { fontSize: 13, color: '#333', marginBottom: 2 },
  cardImage: { width: 72, height: 72, borderRadius: 10, marginLeft: 10 },
  hint: { textAlign: 'center', color: '#666', fontSize: 12, marginTop: 8, marginBottom: 24 },
});
