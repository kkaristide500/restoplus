// Requêtes partagées : abonnement, solde de repas, historique, QR Code (Élève)
import { supabase } from '../supabase';
import type { MealSlot } from './menus';

export interface SubscriptionBalance {
  meal_account_id: string;
  expires_at: string;
  plan_name: string;
  slot: MealSlot;
  remaining: number;
}

export interface MySubscription {
  isActive: boolean;
  planName: string | null;
  expiresAt: string | null;
  balances: SubscriptionBalance[];
}

/** Récupère l'abonnement actif de l'élève + le solde restant par créneau. */
export async function getMySubscription(studentId: string): Promise<MySubscription> {
  const { data, error } = await supabase
    .from('student_meal_balances')
    .select('meal_account_id, expires_at, plan_name, slot, remaining')
    .eq('student_id', studentId)
    .order('expires_at', { ascending: false });

  if (error) {
    console.warn('[Subscription] Erreur :', error.message);
    return { isActive: false, planName: null, expiresAt: null, balances: [] };
  }
  if (!data || data.length === 0) {
    return { isActive: false, planName: null, expiresAt: null, balances: [] };
  }

  // Toutes les lignes du compte le plus récent partagent le même expires_at/plan_name.
  const latestAccountId = data[0].meal_account_id;
  const balances = data.filter((row) => row.meal_account_id === latestAccountId);
  const isActive = new Date(balances[0].expires_at) >= new Date(new Date().toDateString());

  return {
    isActive,
    planName: balances[0].plan_name,
    expiresAt: balances[0].expires_at,
    balances,
  };
}

export async function getMyConsumptionHistory(studentId: string) {
  const { data, error } = await supabase
    .from('meal_consumptions')
    .select('id, slot, created_at')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw error;
  return data ?? [];
}

export async function getMyQrCode(studentId: string) {
  const { data, error } = await supabase
    .from('qr_codes')
    .select('code_value, is_active')
    .eq('user_id', studentId)
    .single();

  if (error) throw error;
  return data;
}

/** Envoie une demande de renouvellement au staff. Aucun paiement n'est traité ici. */
export async function requestRenewal(studentId: string) {
  // Évite les doublons : une seule demande en attente à la fois.
  const { data: existing } = await supabase
    .from('renewal_requests')
    .select('id')
    .eq('student_id', studentId)
    .eq('status', 'en_attente')
    .maybeSingle();

  if (existing) return existing;

  const { data, error } = await supabase
    .from('renewal_requests')
    .insert({ student_id: studentId })
    .select()
    .single();

  if (error) throw error;
  return data;
}
