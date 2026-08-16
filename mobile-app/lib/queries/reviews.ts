// Requêtes partagées : avis (Élève : sur un repas consommé, Admin : sur une commande)
import { supabase } from '../supabase';

export async function submitMealReview(params: {
  userId: string; mealConsumptionId: string; rating: number; comment?: string;
  ratingTaste?: number; ratingQuantity?: number; ratingService?: number;
}) {
  const { error } = await supabase.from('reviews').insert({
    user_id: params.userId,
    meal_consumption_id: params.mealConsumptionId,
    rating: params.rating,
    comment: params.comment || null,
    rating_taste: params.ratingTaste || null,
    rating_quantity: params.ratingQuantity || null,
    rating_service: params.ratingService || null,
  });
  if (error) throw error;
}

export async function submitOrderReview(params: {
  userId: string; orderId: string; rating: number; comment?: string;
  ratingTaste?: number; ratingQuantity?: number; ratingService?: number;
}) {
  const { error } = await supabase.from('reviews').insert({
    user_id: params.userId,
    order_id: params.orderId,
    rating: params.rating,
    comment: params.comment || null,
    rating_taste: params.ratingTaste || null,
    rating_quantity: params.ratingQuantity || null,
    rating_service: params.ratingService || null,
  });
  if (error) throw error;
}

/** Commandes livrées de l'utilisateur, avec l'avis déjà soumis (le cas échéant). */
export async function getReviewableOrders(userId: string) {
  const { data, error } = await supabase
    .from('orders')
    .select('id, total_amount, created_at, reviews(id, rating, comment)')
    .eq('user_id', userId)
    .eq('status', 'recuperee_livree')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}
