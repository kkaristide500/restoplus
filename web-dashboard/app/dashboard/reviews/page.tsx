'use client';
// Avis — note moyenne globale + modération (masquer un avis)
import { useEffect, useState } from 'react';
import { listAllReviews, toggleReviewVisibility } from '../../../lib/queries/reviews';

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function load() {
    setIsLoading(true);
    const data = await listAllReviews();
    setReviews(data);
    setIsLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleToggle(review: any) {
    await toggleReviewVisibility(review.id, !review.is_hidden);
    load();
  }

  const visibleReviews = reviews.filter((r) => !r.is_hidden);
  const average = visibleReviews.length
    ? (visibleReviews.reduce((sum, r) => sum + r.rating, 0) / visibleReviews.length).toFixed(1)
    : '—';

  return (
    <div style={{ padding: 24, maxWidth: 700 }}>
      <h1>Avis</h1>

      <div style={{ display: 'flex', gap: 24, margin: '16px 0 24px' }}>
        <div style={statCard}>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{average} ★</div>
          <div style={{ fontSize: 12, color: '#666' }}>Note moyenne</div>
        </div>
        <div style={statCard}>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{reviews.length}</div>
          <div style={{ fontSize: 12, color: '#666' }}>Avis reçus</div>
        </div>
      </div>

      {isLoading ? <p>Chargement...</p> : (
        reviews.map((r) => (
          <div key={r.id} style={{ ...reviewCard, opacity: r.is_hidden ? 0.5 : 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <strong>{r.users?.full_name}</strong>
                <div style={{ color: '#f59e0b' }}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</div>
              </div>
              <button onClick={() => handleToggle(r)} style={linkButton}>
                {r.is_hidden ? 'Réafficher' : 'Masquer'}
              </button>
            </div>
            {r.comment && <p style={{ fontSize: 13, color: '#555', marginTop: 6 }}>{r.comment}</p>}
            <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>
              {new Date(r.created_at).toLocaleDateString('fr-FR')}
            </div>
          </div>
        ))
      )}
      {!isLoading && reviews.length === 0 && <p style={{ color: '#999' }}>Aucun avis pour le moment.</p>}
    </div>
  );
}

const statCard: React.CSSProperties = { border: '1px solid #e5e7eb', borderRadius: 10, padding: 16, minWidth: 120, textAlign: 'center' };
const reviewCard: React.CSSProperties = { border: '1px solid #e5e7eb', borderRadius: 10, padding: 14, marginBottom: 10 };
const linkButton: React.CSSProperties = { background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', padding: 0, fontSize: 13 };
