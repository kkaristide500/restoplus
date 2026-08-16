// Requêtes partagées : modération des avis (dashboard staff)
import { supabase } from '../supabase';

export async function listAllReviews() {
  const { data, error } = await supabase
    .from('reviews')
    .select('id, rating, comment, is_hidden, created_at, users(full_name)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function toggleReviewVisibility(reviewId: string, isHidden: boolean) {
  const { error } = await supabase.from('reviews').update({ is_hidden: isHidden }).eq('id', reviewId);
  if (error) throw error;
}
