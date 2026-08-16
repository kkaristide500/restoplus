'use client';
// Détail commande — changement de statut par le staff
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  getOrderDetail, updateOrderStatus, ORDER_STATUS_LABELS, NEXT_STATUS, type OrderStatus,
} from '../../../../lib/queries/orders';

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function load() {
    setIsLoading(true);
    const data = await getOrderDetail(id);
    setOrder(data);
    setIsLoading(false);
  }

  useEffect(() => { load(); }, [id]);

  async function advanceStatus() {
    const next = NEXT_STATUS[order.status as OrderStatus];
    if (!next) return;
    await updateOrderStatus(id, next);
    load();
  }

  async function cancelOrderAsStaff() {
    if (!confirm('Annuler cette commande ?')) return;
    await updateOrderStatus(id, 'annulee');
    load();
  }

  if (isLoading) return <div style={{ padding: 24 }}>Chargement...</div>;
  if (!order) return <div style={{ padding: 24 }}>Commande introuvable.</div>;

  const nextStatus = NEXT_STATUS[order.status as OrderStatus];
  const delivery = order.delivery_requests?.[0];

  return (
    <div style={{ padding: 24, maxWidth: 600 }}>
      <button onClick={() => router.push('/dashboard/orders')} style={linkButton}>← Retour</button>

      <h1>Commande de {order.users?.full_name}</h1>
      <p style={{ color: '#666' }}>{order.users?.email}</p>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '16px 0' }}>
        <span style={{ fontWeight: 700 }}>Statut : {ORDER_STATUS_LABELS[order.status as OrderStatus]}</span>
        {nextStatus && (
          <button onClick={advanceStatus} style={btnPrimary}>
            Passer à « {ORDER_STATUS_LABELS[nextStatus]} »
          </button>
        )}
        {order.status !== 'annulee' && order.status !== 'recuperee_livree' && (
          <button onClick={cancelOrderAsStaff} style={btnDanger}>Annuler</button>
        )}
      </div>

      <h3>Plats commandés</h3>
      {order.order_items.map((item: any) => (
        <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
          <span>{item.quantity}× {item.menu_items.name}</span>
          <span>{(item.quantity * item.unit_price).toLocaleString('fr-FR')} FCFA</span>
        </div>
      ))}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, borderTop: '1px solid #e5e7eb', paddingTop: 8, marginTop: 8 }}>
        <span>Total</span>
        <span>{order.total_amount.toLocaleString('fr-FR')} FCFA</span>
      </div>

      <h3 style={{ marginTop: 24 }}>Retrait</h3>
      <p>
        {order.withdrawal_mode === 'livraison_bureau'
          ? `Livraison — ${delivery?.batiment}, ${delivery?.bureau}${delivery?.etage ? `, étage ${delivery.etage}` : ''}`
          : 'Retrait au restaurant'}
      </p>

      <h3>Mode de paiement déclaré</h3>
      <p>{order.declared_payment_mode} <span style={{ color: '#999', fontSize: 12 }}>(indicatif, pas un paiement traité par l'app)</span></p>
    </div>
  );
}

const btnPrimary: React.CSSProperties = { background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontWeight: 600 };
const btnDanger: React.CSSProperties = { background: 'none', color: '#dc2626', border: '1px solid #dc2626', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontWeight: 600 };
const linkButton: React.CSSProperties = { background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', padding: 0, marginBottom: 12 };
