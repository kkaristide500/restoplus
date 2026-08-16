// Requêtes partagées : commandes disponibles / attribuées (Serveur / Livreur)
import { supabase } from '../supabase';
import type { OrderStatus } from './orders';

export async function listAvailableOrders() {
  // Commandes confirmées, pas encore prises en charge par un serveur.
  const { data, error } = await supabase
    .from('orders')
    .select('id, status, withdrawal_mode, total_amount, created_at, assigned_to, users(full_name)')
    .is('assigned_to', null)
    .in('status', ['confirmee', 'en_preparation', 'prete'])
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function listMyDeliveries(userId: string) {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      id, status, withdrawal_mode, total_amount, created_at,
      users(full_name),
      delivery_requests(batiment, bureau, etage, note)
    `)
    .eq('assigned_to', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function acceptOrder(orderId: string, userId: string) {
  const { error } = await supabase
    .from('orders')
    .update({ assigned_to: userId })
    .eq('id', orderId)
    .is('assigned_to', null); // évite qu'un autre serveur ne l'ait déjà pris
  if (error) throw error;
}

export async function advanceDeliveryStatus(orderId: string, nextStatus: OrderStatus) {
  const { error } = await supabase.from('orders').update({ status: nextStatus }).eq('id', orderId);
  if (error) throw error;
}
