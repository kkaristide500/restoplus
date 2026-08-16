// Requêtes partagées : création et suivi de commande (Admin)
import { supabase } from '../supabase';

export type OrderStatus = 'nouvelle' | 'confirmee' | 'en_preparation' | 'prete' | 'recuperee_livree' | 'annulee';
export type WithdrawalMode = 'retrait_restaurant' | 'livraison_bureau';
export type DeclaredPaymentMode = 'especes' | 'wave' | 'orange_money';

export interface CartLine {
  menu_item_id: string;
  name: string;
  unit_price: number;
  quantity: number;
}

export interface DeliveryInfo {
  batiment: string;
  bureau: string;
  etage?: string;
  note?: string;
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  nouvelle: 'Nouvelle',
  confirmee: 'Confirmée',
  en_preparation: 'En préparation',
  prete: 'Prête',
  recuperee_livree: 'Récupérée / Livrée',
  annulee: 'Annulée',
};

export const ORDER_STATUS_STEPS: OrderStatus[] = [
  'nouvelle', 'confirmee', 'en_preparation', 'prete', 'recuperee_livree',
];

export async function createOrder(params: {
  userId: string;
  lines: CartLine[];
  withdrawalMode: WithdrawalMode;
  deliveryInfo: DeliveryInfo | null;
  declaredPaymentMode: DeclaredPaymentMode;
}) {
  const totalAmount = params.lines.reduce((sum, l) => sum + l.unit_price * l.quantity, 0);

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      user_id: params.userId,
      status: 'nouvelle',
      withdrawal_mode: params.withdrawalMode,
      declared_payment_mode: params.declaredPaymentMode,
      total_amount: totalAmount,
    })
    .select()
    .single();

  if (orderError) throw orderError;

  const { error: itemsError } = await supabase.from('order_items').insert(
    params.lines.map((l) => ({
      order_id: order.id,
      menu_item_id: l.menu_item_id,
      quantity: l.quantity,
      unit_price: l.unit_price,
    }))
  );
  if (itemsError) throw itemsError;

  if (params.withdrawalMode === 'livraison_bureau' && params.deliveryInfo) {
    const { error: deliveryError } = await supabase.from('delivery_requests').insert({
      order_id: order.id,
      batiment: params.deliveryInfo.batiment,
      bureau: params.deliveryInfo.bureau,
      etage: params.deliveryInfo.etage || null,
      note: params.deliveryInfo.note || null,
    });
    if (deliveryError) throw deliveryError;
  }

  return order;
}

export async function getMyOrders(userId: string) {
  const { data, error } = await supabase
    .from('orders')
    .select('id, status, withdrawal_mode, declared_payment_mode, total_amount, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getOrderDetail(orderId: string) {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      id, status, withdrawal_mode, declared_payment_mode, total_amount, created_at,
      order_items(id, quantity, unit_price, menu_items(name)),
      delivery_requests(batiment, bureau, etage, note)
    `)
    .eq('id', orderId)
    .single();

  if (error) throw error;
  return data;
}

export async function cancelOrder(orderId: string) {
  const { error } = await supabase
    .from('orders')
    .update({ status: 'annulee' })
    .eq('id', orderId);
  if (error) throw error;
}
