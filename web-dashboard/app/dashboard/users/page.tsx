'use client';
// Gestion des utilisateurs — le manager (restaurant_staff) crée des comptes
// Serveur/Livreur (et éventuellement d'autres managers), active/désactive les comptes.
import { useEffect, useState } from 'react';
import { listAllUsers, toggleUserActive, createStaffAccount, type StaffUserRow, type ManagedRole } from '../../../lib/queries/users';

const ROLE_LABELS: Record<string, string> = {
  student: 'Élève',
  staff_admin: 'Administration',
  restaurant_staff: 'Manager restaurant',
  delivery_staff: 'Serveur / Livreur',
};

export default function UsersPage() {
  const [users, setUsers] = useState<StaffUserRow[]>([]);
  const [filter, setFilter] = useState<'tous' | 'staff'>('staff');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ full_name: '', email: '', password: '', role: 'delivery_staff' as ManagedRole });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function load() {
    setIsLoading(true);
    const data = await listAllUsers();
    setUsers(data);
    setIsLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await createStaffAccount(form);
      setForm({ full_name: '', email: '', password: '', role: 'delivery_staff' });
      setShowForm(false);
      load();
    } catch (e: any) {
      setError(e.message);
    }
    setIsSubmitting(false);
  }

  async function handleToggle(u: StaffUserRow) {
    await toggleUserActive(u.id, !u.is_active);
    load();
  }

  const filtered = users.filter((u) =>
    filter === 'tous' ? true : ['restaurant_staff', 'delivery_staff'].includes(u.role)
  );

  return (
    <div style={{ padding: 24, maxWidth: 760 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Gestion des utilisateurs</h1>
        <button onClick={() => setShowForm((v) => !v)} style={btnPrimary}>
          {showForm ? 'Annuler' : '+ Créer un compte Serveur / Livreur'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, margin: '16px 0' }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={label}>Nom complet</label>
              <input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} style={input} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={label}>Rôle</label>
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as ManagedRole })} style={input}>
                <option value="delivery_staff">Serveur / Livreur</option>
                <option value="restaurant_staff">Manager restaurant</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={label}>Email</label>
              <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} style={input} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={label}>Mot de passe temporaire</label>
              <input required type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} style={input} />
            </div>
          </div>
          {error && <p style={{ color: '#dc2626', marginTop: 10 }}>{error}</p>}
          <button type="submit" disabled={isSubmitting} style={{ ...btnPrimary, marginTop: 14 }}>
            {isSubmitting ? 'Création...' : 'Créer le compte'}
          </button>
          <p style={{ fontSize: 12, color: '#888', marginTop: 8 }}>
            Le compte est créé directement actif. Communique le mot de passe temporaire à la personne concernée.
          </p>
        </form>
      )}

      <div style={{ display: 'flex', gap: 8, margin: '16px 0' }}>
        <button onClick={() => setFilter('staff')} style={filter === 'staff' ? tabActive : tab}>Personnel restaurant</button>
        <button onClick={() => setFilter('tous')} style={filter === 'tous' ? tabActive : tab}>Tous les comptes</button>
      </div>

      {isLoading ? <p>Chargement...</p> : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>
              <th style={th}>Nom</th><th style={th}>Email</th><th style={th}>Rôle</th><th style={th}>Statut</th><th style={th}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={td}>{u.full_name}</td>
                <td style={td}>{u.email}</td>
                <td style={td}>{ROLE_LABELS[u.role] ?? u.role}</td>
                <td style={{ ...td, color: u.is_active ? '#16a34a' : '#999' }}>{u.is_active ? 'Actif' : 'Désactivé'}</td>
                <td style={td}>
                  <button onClick={() => handleToggle(u)} style={linkButton}>
                    {u.is_active ? 'Désactiver' : 'Activer'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

const th: React.CSSProperties = { padding: '8px 4px', fontSize: 13, color: '#666' };
const td: React.CSSProperties = { padding: '10px 4px', fontSize: 14 };
const label: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4 };
const input: React.CSSProperties = { width: '100%', padding: 10, borderRadius: 8, border: '1px solid #e5e7eb', boxSizing: 'border-box' };
const btnPrimary: React.CSSProperties = { background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 16px', fontWeight: 600, cursor: 'pointer' };
const linkButton: React.CSSProperties = { background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', padding: 0, fontSize: 13 };
const tab: React.CSSProperties = { padding: '6px 12px', borderRadius: 6, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontSize: 13 };
const tabActive: React.CSSProperties = { ...tab, background: '#111', color: '#fff', borderColor: '#111' };
