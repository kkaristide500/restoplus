// Requêtes partagées : statistiques pour le dashboard "Rapports"
import { supabase } from '../supabase';

export async function getDailyMealsServed(days = 14) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const { data, error } = await supabase
    .from('daily_meals_served')
    .select('day, slot, meals_count')
    .gte('day', since.toISOString().slice(0, 10))
    .order('day');
  if (error) throw error;
  return data ?? [];
}

export async function getDailySatisfaction(days = 14) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const { data, error } = await supabase
    .from('daily_satisfaction')
    .select('day, avg_rating, review_count')
    .gte('day', since.toISOString().slice(0, 10))
    .order('day');
  if (error) throw error;
  return data ?? [];
}

export async function getSatisfactionBreakdown() {
  const { data, error } = await supabase.from('satisfaction_breakdown').select('*').single();
  if (error) throw error;
  return data;
}
