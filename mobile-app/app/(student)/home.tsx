// Accueil — Élève : carte abonnement (solde réel) + menu du jour + raccourcis
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../lib/auth-context';
import { getMySubscription, type MySubscription } from '../../lib/queries/subscription';
import {
  getMenusForDate, getStudentIncludedSlots, getNext7Days,
  getSlotStatus, SLOT_STATUS_LABELS, SLOT_STATUS_COLORS,
  type MenuWithItems, type MealSlot,
} from '../../lib/queries/menus';

const SLOT_TITLES: Record<MealSlot, string> = {
  petit_dejeuner: 'Petit-déjeuner', dejeuner: 'Déjeuner', diner: 'Dîner',
};

export default function StudentHomeScreen() {
  const { profile } = useAuth();
  const [subscription, setSubscription] = useState<MySubscription | null>(null);
  const [menus, setMenus] = useState<MenuWithItems[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    const today = getNext7Days()[0].date;
    Promise.all([
      getMySubscription(profile.id),
      getStudentIncludedSlots(profile.id),
      getMenusForDate(today, 'eleve'),
    ]).then(([sub, slots, menuData]) => {
      setSubscription(sub);
      setMenus(slots ? menuData.filter((m) => slots.includes(m.slot)) : menuData);
      setIsLoading(false);
    });
  }, [profile]);

  const totalRemaining = subscription?.balances.reduce((sum, b) => sum + b.remaining, 0) ?? 0;
  const totalIncluded = (subscription?.balances.length ?? 0) * 30; // approx. affichage "sur X repas"

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Bonjour,</Text>
          <Text style={styles.name}>{profile?.full_name ?? '...'} 👋</Text>
          <Text style={styles.role}>Étudiant</Text>
        </View>
      </View>

      <View style={styles.subCard}>
        <View style={styles.subCardTop}>
          <Text style={styles.subCardLabel}>Mon abonnement</Text>
          <View style={[styles.statusPill, { backgroundColor: subscription?.isActive ? '#dcfce7' : '#fee2e2' }]}>
            <Text style={{ color: subscription?.isActive ? '#16a34a' : '#dc2626', fontSize: 11, fontWeight: '700' }}>
              {subscription?.isActive ? 'Actif' : 'Inactif'}
            </Text>
          </View>
        </View>

        {isLoading ? (
          <ActivityIndicator style={{ marginVertical: 12 }} />
        ) : subscription?.isActive ? (
          <View style={styles.subCardBody}>
            <View>
              <Text style={styles.subDetail}>{subscription.planName}</Text>
              <Text style={styles.subDetail}>Expire le {new Date(subscription.expiresAt!).toLocaleDateString('fr-FR')}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.remainingNumber}>{totalRemaining}</Text>
              <Text style={styles.remainingLabel}>repas restants</Text>
            </View>
          </View>
        ) : (
          <Text style={{ color: '#dc2626', fontSize: 13, marginTop: 8 }}>
            Aucun abonnement actif — demande un renouvellement auprès du restaurant.
          </Text>
        )}

        <TouchableOpacity style={styles.subLink} onPress={() => router.push('/(student)/subscription')}>
          <Text style={styles.subLinkText}>Voir le détail de mon abonnement</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Menu du jour</Text>
          <Text style={styles.sectionLink} onPress={() => router.push('/(student)/menu')}>Voir tout</Text>
        </View>

        {menus.map((menu) => {
          const status = getSlotStatus(menu.slot);
          const colors = SLOT_STATUS_COLORS[status];
          const cover = menu.items.find((it) => it.photo_url)?.photo_url;
          return (
            <View key={menu.id} style={[styles.menuCard, { backgroundColor: colors.bg }]}>
              <View style={{ flex: 1 }}>
                <View style={styles.menuCardTop}>
                  <Text style={styles.menuSlotTitle}>{SLOT_TITLES[menu.slot]}</Text>
                  <Text style={[styles.menuBadge, { color: colors.text }]}>{SLOT_STATUS_LABELS[status]}</Text>
                </View>
                <Text style={styles.menuItems}>{menu.items.map((i) => i.name).join(', ')}</Text>
              </View>
              {cover && <Image source={{ uri: cover }} style={styles.menuImage} />}
            </View>
          );
        })}
      </View>

      <View style={styles.quickActions}>
        <QuickAction label="Mes commandes" onPress={() => {}} />
        <QuickAction label="Mon QR Code" onPress={() => router.push('/(student)/qrcode')} />
        <QuickAction label="Historique des repas" onPress={() => router.push('/(student)/history')} />
        <QuickAction label="Demander un renouvellement" onPress={() => router.push('/(student)/subscription')} />
      </View>
    </ScrollView>
  );
}

function QuickAction({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.quickAction} onPress={onPress}>
      <Text style={styles.quickActionText}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { backgroundColor: '#16a34a', padding: 20, paddingBottom: 44, borderRadius: 0 },
  greeting: { color: '#dcfce7', fontSize: 12 },
  name: { color: '#fff', fontWeight: '700', fontSize: 18 },
  role: { color: '#dcfce7', fontSize: 12 },
  subCard: { backgroundColor: '#fff', marginHorizontal: 16, marginTop: -28, borderRadius: 14, padding: 16, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  subCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  subCardLabel: { fontWeight: '700', fontSize: 14 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  subCardBody: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, alignItems: 'flex-end' },
  subDetail: { fontSize: 12, color: '#666' },
  remainingNumber: { fontSize: 26, fontWeight: '800', color: '#111' },
  remainingLabel: { fontSize: 10, color: '#888' },
  subLink: { backgroundColor: '#f0fdf4', borderRadius: 8, padding: 10, marginTop: 12, alignItems: 'center' },
  subLinkText: { color: '#16a34a', fontWeight: '700', fontSize: 13 },
  section: { padding: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  sectionTitle: { fontWeight: '700', fontSize: 15 },
  sectionLink: { color: '#16a34a', fontSize: 13, fontWeight: '600' },
  menuCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: 12, marginBottom: 10 },
  menuCardTop: { flexDirection: 'row', justifyContent: 'space-between' },
  menuSlotTitle: { fontWeight: '700', fontSize: 13 },
  menuBadge: { fontSize: 11, fontWeight: '700' },
  menuItems: { fontSize: 12, color: '#555', marginTop: 4 },
  menuImage: { width: 56, height: 56, borderRadius: 10, marginLeft: 10 },
  quickActions: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 10, marginBottom: 30 },
  quickAction: { flexBasis: '47%', backgroundColor: '#f9fafb', borderRadius: 10, padding: 14, alignItems: 'center' },
  quickActionText: { fontSize: 12, fontWeight: '600', textAlign: 'center' },
});
