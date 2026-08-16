// Nouvelle commande — Membre de l'administration
// Panier → Retrait/Livraison → Mode de paiement déclaré (avec disclaimer) → Confirmation
import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../lib/auth-context';
import { getMenusForDate, getNext7Days } from '../../lib/queries/menus';
import {
  createOrder, type CartLine, type WithdrawalMode, type DeclaredPaymentMode,
} from '../../lib/queries/orders';
import { getRestaurantSettings, isOrderingOpen, type RestaurantSettings } from '../../lib/queries/settings';

export default function NewOrderScreen() {
  const { profile } = useAuth();
  const { preselectedItemId } = useLocalSearchParams<{ preselectedItemId?: string }>();
  const today = getNext7Days()[0].date;

  const [cart, setCart] = useState<Record<string, CartLine>>({});
  const [withdrawalMode, setWithdrawalMode] = useState<WithdrawalMode>('retrait_restaurant');
  const [batiment, setBatiment] = useState('');
  const [bureau, setBureau] = useState('');
  const [paymentMode, setPaymentMode] = useState<DeclaredPaymentMode>('especes');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [settings, setSettings] = useState<RestaurantSettings | null>(null);
  const [availableItems, setAvailableItems] = useState<
    { id: string; name: string; price: number; slot: string }[]
  >([]);

  useEffect(() => {
    getRestaurantSettings().then(setSettings);
    getMenusForDate(today, 'administration').then((menus) => {
      const items = menus.flatMap((m) =>
        m.items.filter((i) => i.is_available).map((i) => ({ ...i, slot: m.slot }))
      );
      setAvailableItems(items);
      if (preselectedItemId) {
        const preItem = items.find((i) => i.id === preselectedItemId);
        if (preItem) {
          setCart({ [preItem.id]: { menu_item_id: preItem.id, name: preItem.name, unit_price: preItem.price, quantity: 1 } });
        }
      }
    });
  }, []);

  function updateQuantity(item: { id: string; name: string; price: number }, delta: number) {
    const maxQty = settings?.max_quantity_per_item ?? 5;
    setCart((prev) => {
      const current = prev[item.id]?.quantity ?? 0;
      const next = Math.min(maxQty, Math.max(0, current + delta));
      const copy = { ...prev };
      if (next === 0) {
        delete copy[item.id];
      } else {
        copy[item.id] = { menu_item_id: item.id, name: item.name, unit_price: item.price, quantity: next };
      }
      return copy;
    });
  }

  const lines = Object.values(cart);
  const total = lines.reduce((sum, l) => sum + l.unit_price * l.quantity, 0);

  async function handleSubmit() {
    if (!profile) return;
    if (lines.length === 0) {
      Alert.alert('Panier vide', 'Choisis au moins un plat.');
      return;
    }
    if (withdrawalMode === 'livraison_bureau' && (!batiment || !bureau)) {
      Alert.alert('Livraison incomplète', 'Renseigne le bâtiment et le bureau.');
      return;
    }

    setIsSubmitting(true);
    try {
      const order = await createOrder({
        userId: profile.id,
        lines,
        withdrawalMode,
        deliveryInfo: withdrawalMode === 'livraison_bureau' ? { batiment, bureau } : null,
        declaredPaymentMode: paymentMode,
      });
      router.replace({ pathname: '/(admin)/order-tracking', params: { orderId: order.id } });
    } catch (e: any) {
      Alert.alert('Erreur', e.message);
    }
    setIsSubmitting(false);
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Nouvelle commande</Text>

      <Text style={styles.section}>Choisissez vos plats</Text>
      {availableItems.map((item) => {
        const qty = cart[item.id]?.quantity ?? 0;
        const isOpen = settings ? isOrderingOpen(item.slot, today, settings.order_cutoff_minutes) : true;
        return (
          <View key={item.id} style={styles.itemRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemPrice}>{item.price.toLocaleString('fr-FR')} FCFA</Text>
              {!isOpen && <Text style={styles.closedLabel}>Commande fermée pour ce créneau</Text>}
            </View>
            <View style={styles.stepper}>
              <TouchableOpacity onPress={() => updateQuantity(item, -1)} disabled={!isOpen} style={styles.stepBtn}>
                <Text style={styles.stepBtnText}>-</Text>
              </TouchableOpacity>
              <Text style={styles.stepValue}>{qty}</Text>
              <TouchableOpacity onPress={() => updateQuantity(item, 1)} disabled={!isOpen} style={styles.stepBtn}>
                <Text style={styles.stepBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      })}
      {settings && (
        <Text style={styles.cutoffHint}>
          ℹ️ Les commandes ferment {settings.order_cutoff_minutes} min avant le début de chaque créneau.
          Quantité maximale par plat : {settings.max_quantity_per_item}.
        </Text>
      )}

      <Text style={styles.section}>Mode de retrait</Text>
      <View style={styles.radioGroup}>
        <RadioOption
          label="Consommer au restaurant"
          selected={withdrawalMode === 'retrait_restaurant'}
          onPress={() => setWithdrawalMode('retrait_restaurant')}
        />
        <RadioOption
          label="Livraison au bureau"
          selected={withdrawalMode === 'livraison_bureau'}
          onPress={() => setWithdrawalMode('livraison_bureau')}
        />
      </View>

      {withdrawalMode === 'livraison_bureau' && (
        <View style={styles.deliveryForm}>
          <Text style={styles.label}>Bâtiment</Text>
          <TextInput style={styles.input} value={batiment} onChangeText={setBatiment} placeholder="Bâtiment Administratif" />
          <Text style={styles.label}>Bureau</Text>
          <TextInput style={styles.input} value={bureau} onChangeText={setBureau} placeholder="Bureau du Directeur Général" />
        </View>
      )}

      <Text style={styles.section}>Mode de paiement</Text>
      <View style={styles.radioGroup}>
        <RadioOption label="Espèces" selected={paymentMode === 'especes'} onPress={() => setPaymentMode('especes')} />
        <RadioOption label="Wave" selected={paymentMode === 'wave'} onPress={() => setPaymentMode('wave')} />
        <RadioOption label="Orange Money" selected={paymentMode === 'orange_money'} onPress={() => setPaymentMode('orange_money')} />
      </View>
      <Text style={styles.disclaimer}>
        ⚠️ Ceci n'est pas un paiement en ligne — juste une indication transmise au restaurant.
        Le règlement se fait directement sur place ou à la livraison.
      </Text>

      <View style={styles.summary}>
        <Text style={styles.summaryLabel}>Total</Text>
        <Text style={styles.summaryValue}>{total.toLocaleString('fr-FR')} FCFA</Text>
      </View>

      <TouchableOpacity
        style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
        onPress={handleSubmit}
        disabled={isSubmitting}
      >
        <Text style={styles.submitBtnText}>
          {isSubmitting ? 'Envoi...' : 'Valider la commande'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function RadioOption({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.radioOption, selected && styles.radioOptionSelected]}>
      <View style={[styles.radioDot, selected && styles.radioDotSelected]} />
      <Text style={styles.radioLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 16 },
  section: { fontSize: 14, fontWeight: '700', marginTop: 20, marginBottom: 10 },
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 0.5, borderColor: '#eee' },
  itemName: { fontSize: 14, fontWeight: '600' },
  itemPrice: { fontSize: 12, color: '#666' },
  stepper: { flexDirection: 'row', alignItems: 'center' },
  stepBtn: { width: 28, height: 28, borderRadius: 6, borderWidth: 1, borderColor: '#e5e7eb', justifyContent: 'center', alignItems: 'center' },
  stepBtnText: { fontSize: 16, fontWeight: '700' },
  stepValue: { width: 28, textAlign: 'center', fontWeight: '700' },
  radioGroup: { gap: 8 },
  radioOption: { flexDirection: 'row', alignItems: 'center', padding: 12, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, marginBottom: 8 },
  radioOptionSelected: { borderColor: '#16a34a', backgroundColor: '#f0fdf4' },
  radioDot: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: '#ccc', marginRight: 10 },
  radioDotSelected: { borderColor: '#16a34a', backgroundColor: '#16a34a' },
  radioLabel: { fontSize: 14 },
  deliveryForm: { marginTop: 4 },
  label: { fontWeight: '600', fontSize: 13, marginBottom: 4, marginTop: 8 },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 12, fontSize: 14 },
  disclaimer: { fontSize: 11, color: '#b45309', backgroundColor: '#fffbeb', padding: 10, borderRadius: 8, marginTop: 8 },
  closedLabel: { fontSize: 10, color: '#dc2626', marginTop: 2 },
  cutoffHint: { fontSize: 11, color: '#888', marginTop: 8 },
  summary: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 24, padding: 14, backgroundColor: '#f9fafb', borderRadius: 10 },
  summaryLabel: { fontSize: 14, fontWeight: '600' },
  summaryValue: { fontSize: 16, fontWeight: '700' },
  submitBtn: { backgroundColor: '#16a34a', borderRadius: 10, padding: 16, alignItems: 'center', marginVertical: 24 },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
