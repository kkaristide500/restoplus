'use client';
// Liste des commandes (staff) — temps réel, filtrable par statut.
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../../lib/supabase';
import { listOrders, ORDER_STATUS_LABELS, type OrderStatus } from '../../../lib/queries/orders';
import { exportToCsv } from '../../../lib/csv-export';

const STATUS_COLORS: Record<OrderStatus, string> = {
  nouvelle: '#2563eb', confirmee: '#7c3aed', en_preparation: '#d97706',
  prete: '#16a34a', recuperee_livree: '#6b7280', annulee: '#dc2626',
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | ''>('');
  const [isLoading, setIsLoading] = useState(true);

  async function load() {
    setIsLoading(true);
    const data = await listOrders((statusFilter || undefined) as OrderStatus | undefined);
    setOrders(data);
    setIsLoading(false);
  }

  useEffect(() => {
    load();

    // Rafraîchissement en temps réel : toute nouvelle commande ou changement de statut
    const channel = supabase
      .channel('orders-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => load())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [statusFilter]);

  return (
    <div style={{ padding: 24 }}>
      <h1>Commandes</h1>

      <button
        onClick={() => exportToCsv('commandes.csv', orders.map((o) => ({
          client: o.users?.full_name, retrait: o.withdrawal_mode, total: o.total_amount,
          statut: o.status, heure: o.created_at,
        })))}
        style={{ background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 8, padding: '6px 12px', fontSize: 12, cursor: 'pointer', marginBottom: 8 }}
      >
        Exporter CSV
      </button>
      <br />

      <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as OrderStatus | '')} style={inputStyle}>
        <option value="">Tous les statuts</option>
        {Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => (
          <option key={value} value={value}>{label}</option>
        ))}
      </select>

      {isLoading ? <p>Chargement...</p> : (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 16 }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>
              <th style={th}>Client</th><th style={th}>Retrait</th><th style={th}>Total</th><th style={th}>Statut</th><th style={th}>Heure</th><th style={th}></th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={td}>{order.users?.full_name}</td>
                <td style={td}>{order.withdrawal_mode === 'livraison_bureau' ? 'Livraison' : 'Retrait resto'}</td>
                <td style={td}>{order.total_amount.toLocaleString('fr-FR')} FCFA</td>
                <td style={td}>
                  <span style={{ color: STATUS_COLORS[order.status as OrderStatus], fontWeight: 600 }}>
                    {ORDER_STATUS_LABELS[order.status as OrderStatus]}
                  </span>
                </td>
                <td style={td}>{new Date(order.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</td>
                <td style={td}><Link href={`/dashboard/orders/${order.id}`}>Voir</Link></td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr><td colSpan={6} style={{ ...td, textAlign: 'center', color: '#999' }}>Aucune commande.</td></tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}

const th: React.CSSProperties = { padding: '8px 4px', fontSize: 13, color: '#666' };
const td: React.CSSProperties = { padding: '10px 4px', fontSize: 14 };
const inputStyle: React.CSSProperties = { padding: 8, borderRadius: 6, border: '1px solid #e5e7eb', marginTop: 12 };
