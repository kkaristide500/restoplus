'use client';
// Liste des élèves — soldes, filtre "solde faible", demandes de renouvellement en attente
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { listStudents, listPendingRenewalRequests, type StudentRow } from '../../../lib/queries/students';
import { exportToCsv } from '../../../lib/csv-export';

const LOW_BALANCE_THRESHOLD = 5;

export default function StudentsPage() {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [lowBalanceOnly, setLowBalanceOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  async function load() {
    setIsLoading(true);
    const [studentsData, requestsData] = await Promise.all([listStudents(), listPendingRenewalRequests()]);
    setStudents(studentsData);
    setPendingRequests(requestsData);
    setIsLoading(false);
  }

  useEffect(() => { load(); }, []);

  const filtered = students.filter((s) => {
    const matchesSearch = s.full_name.toLowerCase().includes(search.toLowerCase()) || s.matricule.toLowerCase().includes(search.toLowerCase());
    const matchesBalance = !lowBalanceOnly || s.total_remaining <= LOW_BALANCE_THRESHOLD;
    return matchesSearch && matchesBalance;
  });

  return (
    <div style={{ padding: 24 }}>
      <h1>Élèves / Crédits</h1>
      <button
        onClick={() => exportToCsv('eleves.csv', students.map((s) => ({
          nom: s.full_name, matricule: s.matricule, email: s.email, solde: s.total_remaining,
        })))}
        style={{ background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 8, padding: '6px 12px', fontSize: 12, cursor: 'pointer' }}
      >
        Exporter CSV
      </button>

      {pendingRequests.length > 0 && (
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: 12, margin: '16px 0' }}>
          <strong>{pendingRequests.length} demande(s) de renouvellement en attente</strong>
          <ul style={{ margin: '8px 0 0', paddingLeft: 18 }}>
            {pendingRequests.map((r) => (
              <li key={r.id}>
                <Link href={`/dashboard/students/${r.student_id}`}>{r.users?.full_name}</Link>
                {' '}— {new Date(r.created_at).toLocaleDateString('fr-FR')}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, margin: '16px 0' }}>
        <input
          placeholder="Rechercher (nom, matricule)..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={inputStyle}
        />
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
          <input type="checkbox" checked={lowBalanceOnly} onChange={(e) => setLowBalanceOnly(e.target.checked)} />
          Solde faible uniquement (≤ {LOW_BALANCE_THRESHOLD})
        </label>
      </div>

      {isLoading ? <p>Chargement...</p> : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>
              <th style={th}>Nom</th><th style={th}>Matricule</th><th style={th}>Solde total</th><th style={th}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <tr key={s.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={td}>{s.full_name} {s.has_pending_renewal && <span style={pendingTag}>Renouvellement demandé</span>}</td>
                <td style={td}>{s.matricule}</td>
                <td style={{ ...td, color: s.total_remaining <= LOW_BALANCE_THRESHOLD ? '#dc2626' : '#111', fontWeight: 600 }}>
                  {s.total_remaining} repas
                </td>
                <td style={td}><Link href={`/dashboard/students/${s.id}`}>Voir</Link></td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={4} style={{ ...td, textAlign: 'center', color: '#999' }}>Aucun élève.</td></tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}

const th: React.CSSProperties = { padding: '8px 4px', fontSize: 13, color: '#666' };
const td: React.CSSProperties = { padding: '10px 4px', fontSize: 14 };
const inputStyle: React.CSSProperties = { padding: 8, borderRadius: 6, border: '1px solid #e5e7eb', flex: 1 };
const pendingTag: React.CSSProperties = { fontSize: 10, background: '#fef3c7', color: '#b45309', padding: '2px 8px', borderRadius: 20, marginLeft: 8 };
