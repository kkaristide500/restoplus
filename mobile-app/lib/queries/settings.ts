// Requêtes partagées : paramètres restaurant (heure limite, quantité max, etc.)
import { supabase } from '../supabase';

export interface RestaurantSettings {
  order_cutoff_minutes: number;
  max_quantity_per_item: number;
  low_balance_threshold: number;
}

export async function getRestaurantSettings(): Promise<RestaurantSettings> {
  const { data, error } = await supabase
    .from('restaurant_settings')
    .select('order_cutoff_minutes, max_quantity_per_item, low_balance_threshold')
    .eq('id', 1)
    .single();

  if (error || !data) {
    // Valeurs par défaut si le chargement échoue (ne bloque pas l'affichage)
    return { order_cutoff_minutes: 60, max_quantity_per_item: 5, low_balance_threshold: 5 };
  }
  return data;
}

const SLOT_START_MINUTES: Record<string, number> = {
  petit_dejeuner: 6 * 60 + 30,
  dejeuner: 12 * 60,
  diner: 18 * 60 + 30,
};

/** Vrai si la commande pour ce créneau, à cette date, est encore ouverte. */
export function isOrderingOpen(slot: string, dateISO: string, cutoffMinutes: number): boolean {
  const now = new Date();
  const slotStart = new Date(dateISO);
  slotStart.setHours(0, SLOT_START_MINUTES[slot] ?? 0, 0, 0);
  const cutoffAt = new Date(slotStart.getTime() - cutoffMinutes * 60 * 1000);
  return now < cutoffAt;
}
