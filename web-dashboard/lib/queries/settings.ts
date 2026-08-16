// Requêtes partagées : paramètres restaurant (dashboard staff)
import { supabase } from '../supabase';

export interface RestaurantSettings {
  order_cutoff_minutes: number;
  max_quantity_per_item: number;
  low_balance_threshold: number;
  opening_hours: Record<string, string>;
}

export async function getSettings(): Promise<RestaurantSettings> {
  const { data, error } = await supabase.from('restaurant_settings').select('*').eq('id', 1).single();
  if (error) throw error;
  return data;
}

export async function updateSettings(patch: Partial<RestaurantSettings>) {
  const { error } = await supabase.from('restaurant_settings').update(patch).eq('id', 1);
  if (error) throw error;
}
