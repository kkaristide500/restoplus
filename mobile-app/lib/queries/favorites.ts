// Requêtes partagées : plats favoris (Administration uniquement — calculés)
import { supabase } from '../supabase';

export interface FavoriteMeal {
  name: string;
  order_count: number;
}

export async function getMyFavoriteMeals(userId: string): Promise<FavoriteMeal[]> {
  const { data, error } = await supabase
    .from('admin_favorite_meals')
    .select('name, order_count')
    .eq('user_id', userId)
    .order('order_count', { ascending: false })
    .limit(5);

  if (error) {
    console.warn('[Favorites] Erreur :', error.message);
    return [];
  }
  return data ?? [];
}
