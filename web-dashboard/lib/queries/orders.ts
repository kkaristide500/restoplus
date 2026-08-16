// Requêtes partagées : gestion des commandes (dashboard staff)
import { supabase } from '../supabase';

export type OrderStatus = 'nouvelle' | 'confirmee' | 'en_preparation' | 'prete' | 'recuperee_livree' | 'annulee';

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  nouvelle: 'Nouvelle',
  confirmee: 'Confirmée',
  en_preparation: 'En préparation',
  prete: 'Prête',
  recuperee_livree: 'Récupérée / Livrée',
  annulee: 'Annulée',
};

export const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  nouvelle: 'confirmee',
  confirmee: 'en_preparation',
  en_preparation: 'prete',
  prete: 'recuperee_livree',
};

export async function listOrders(statusFilter?: OrderStatus) {
  let query = supabase
    .from('orders')
    .select('id, status, withdrawal_mode, declared_payment_mode, total_amount, created_at, users(full_name)')
    .order('created_at', { ascending: false });

  if (statusFilter) query = query.eq('status', statusFilter);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getOrderDetail(orderId: string) {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      id, status, withdrawal_mode, declared_payment_mode, total_amount, created_at,
      users(full_name, email),
      order_items(id, quantity, unit_price, menu_items(name)),
      delivery_requests(batiment, bureau, etage, note)
    `)
    .eq('id', orderId)
    .single();

  if (error) throw error;
  return data;
}

export async function updateOrderStatus(orderId: string, status: OrderStatus) {
  const { error } = await supabase.from('orders').update({ status }).eq('id', orderId);
  if (error) throw error;
}
