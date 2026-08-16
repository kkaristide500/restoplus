'use client';
// Détail élève — soldes par créneau, historique, renouvellement manuel (fonction serveur)
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  getStudentDetail, listSubscriptionPlans, renewStudentSubscription,
} from '../../../../lib/queries/students';

const SLOT_LABELS: Record<string, string> = {
  petit_dejeuner: 'Petit-déjeuner', dejeuner: 'Déjeuner', diner: 'Dîner',
};

export default function StudentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [detail, setDetail] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRenewing, setIsRenewing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    setIsLoading(true);
    const [detailData, plansData] = await Promise.all([getStudentDetail(id), listSubscriptionPlans()]);
    setDetail(detailData);
    setPlans(plansData);
    if (plansData.length > 0 && !selectedPlanId) setSelectedPlanId(plansData[0].id);
    setIsLoading(false);
  }

  useEffect(() => { load(); }, [id]);

  async function handleRenew() {
    if (!selectedPlanId) return;
    setIsRenewing(true);
    setMessage(null);
    try {
      const result = await renewStudentSubscription(id, selectedPlanId);
      setMessage(`Abonnement renouvelé — expire le ${new Date(result.expires_at).toLocaleDateString('fr-FR')}`);
      load();
    } catch (e: any) {
      setMessage(`Erreur : ${e.message}`);
    }
    setIsRenewing(false);
  }

  if (isLoading || !detail) return <div style={{ padding: 24 }}>Chargement...</div>;

  return (
    <div style={{ padding: 24, maxWidth: 640 }}>
      <button onClick={() => router.push('/dashboard/students')} style={linkButton}>← Retour</button>

      <h1>{detail.student.full_name}</h1>
      <p style={{ color: '#666' }}>
        {detail.student.email} — Matricule : {detail.student.student_profiles?.matricule}
      </p>

      <h3>Solde actuel</h3>
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        {detail.balances.length === 0 && <p style={{ color: '#999' }}>Aucun abonnement actif.</p>}
        {detail.balances.map((b: any) => (
          <div key={b.slot} style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: 12, minWidth: 100 }}>
            <div style={{ fontSize: 12, color: '#666' }}>{SLOT_LABELS[b.slot]}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: b.remaining <= 5 ? '#dc2626' : '#111' }}>{b.remaining}</div>
          </div>
        ))}
      </div>

      <h3>Renouvellement manuel</h3>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <select value={selectedPlanId} onChange={(e) => setSelectedPlanId(e.target.value)} style={inputStyle}>
          {plans.map((p) => (
            <option key={p.id} value={p.id}>{p.name} — {p.price.toLocaleString('fr-FR')} FCFA</option>
          ))}
        </select>
        <button onClick={handleRenew} disabled={isRenewing} style={btnPrimary}>
          {isRenewing ? 'Renouvellement...' : 'Renouveler'}
        </button>
      </div>
      <p style={{ fontSize: 12, color: '#888', marginTop: 6 }}>
        Aucun paiement n'est traité ici — à faire encaisser séparément par le restaurant.
      </p>
      {message && <p style={{ color: message.startsWith('Erreur') ? '#dc2626' : '#16a34a', marginTop: 8 }}>{message}</p>}

      <h3 style={{ marginTop: 24 }}>Historique des repas</h3>
      {detail.history.map((h: any) => (
        <div key={h.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f3f4f6', fontSize: 13 }}>
          <span>{SLOT_LABELS[h.slot]}</span>
          <span style={{ color: '#666' }}>{new Date(h.created_at).toLocaleString('fr-FR')}</span>
        </div>
      ))}
      {detail.history.length === 0 && <p style={{ color: '#999' }}>Aucun repas consommé.</p>}
    </div>
  );
}

const inputStyle: React.CSSProperties = { padding: 10, borderRadius: 8, border: '1px solid #e5e7eb', flex: 1 };
const btnPrimary: React.CSSProperties = { background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 16px', fontWeight: 600, cursor: 'pointer' };
const linkButton: React.CSSProperties = { background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', padding: 0, marginBottom: 12 };
