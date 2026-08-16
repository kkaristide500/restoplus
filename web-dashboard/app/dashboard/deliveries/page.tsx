'use client';
// Interface Serveur / Livreur — accepter une commande disponible, la faire
// progresser jusqu'à "Récupérée / Livrée". Accessible via le dashboard web
// responsive (pas d'app mobile dédiée, cf. décision de cadrage).
import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { listAvailableOrders, listMyDeliveries, acceptOrder, advanceDeliveryStatus } from '../../../lib/queries/deliveries';
import { ORDER_STATUS_LABELS, NEXT_STATUS, type OrderStatus } from '../../../lib/queries/orders';

export default function DeliveriesPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [available, setAvailable] = useState<any[]>([]);
  const [mine, setMine] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function load(uid: string) {
    setIsLoading(true);
    const [a, m] = await Promise.all([listAvailableOrders(), listMyDeliveries(uid)]);
    setAvailable(a);
    setMine(m);
    setIsLoading(false);
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserId(data.user.id);
        load(data.user.id);
      }
    });
  }, []);

  async function handleAccept(orderId: string) {
    if (!userId) return;
    await acceptOrder(orderId, userId);
    load(userId);
  }

  async function handleAdvance(order: any) {
    const next = NEXT_STATUS[order.status as OrderStatus];
    if (!next || !userId) return;
    await advanceDeliveryStatus(order.id, next);
    load(userId);
  }

  return (
    <div style={{ padding: 24, maxWidth: 640 }}>
      <h1>Mes livraisons</h1>

      <h3 style={{ marginTop: 24 }}>Commandes disponibles</h3>
      {isLoading ? <p>Chargement...</p> : available.length === 0 ? (
        <p style={{ color: '#999' }}>Aucune commande à prendre en charge pour le moment.</p>
      ) : (
        available.map((o) => (
          <div key={o.id} style={card}>
            <div>
              <strong>{o.users?.full_name}</strong>
              <div style={{ fontSize: 12, color: '#666' }}>
                {o.withdrawal_mode === 'livraison_bureau' ? 'Livraison' : 'Retrait resto'} — {o.total_amount.toLocaleString('fr-FR')} FCFA
              </div>
            </div>
            <button onClick={() => handleAccept(o.id)} style={btnPrimary}>Accepter</button>
          </div>
        ))
      )}

      <h3 style={{ marginTop: 24 }}>Mes commandes en cours</h3>
      {mine.length === 0 ? (
        <p style={{ color: '#999' }}>Aucune commande acceptée pour le moment.</p>
      ) : (
        mine.map((o) => {
          const next = NEXT_STATUS[o.status as OrderStatus];
          const delivery = o.delivery_requests?.[0];
          return (
            <div key={o.id} style={{ ...card, flexDirection: 'column', alignItems: 'flex-start' }}>
              <strong>{o.users?.full_name}</strong>
              <div style={{ fontSize: 12, color: '#666', margin: '4px 0' }}>
                Statut : {ORDER_STATUS_LABELS[o.status as OrderStatus]}
              </div>
              {delivery && (
                <div style={{ fontSize: 12, color: '#666' }}>
                  {delivery.batiment} — {delivery.bureau}{delivery.etage ? `, étage ${delivery.etage}` : ''}
                </div>
              )}
              {next && (
                <button onClick={() => handleAdvance(o)} style={{ ...btnPrimary, marginTop: 8 }}>
                  Passer à « {ORDER_STATUS_LABELS[next]} »
                </button>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

const card: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  border: '1px solid #e5e7eb', borderRadius: 10, padding: 14, marginBottom: 10,
};
const btnPrimary: React.CSSProperties = { background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', fontWeight: 600, cursor: 'pointer' };
