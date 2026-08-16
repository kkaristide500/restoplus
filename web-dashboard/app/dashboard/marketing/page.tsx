'use client';
// Marketing — campagnes ciblées par segment (rôle), fréquence limitée.
// La diffusion réelle (insertion dans `notifications`) est un job à programmer
// séparément (Edge Function planifiée / cron) — cette page gère la définition
// et l'activation des campagnes.
import { useEffect, useState } from 'react';
import { listCampaigns, createCampaign, toggleCampaignActive, deleteCampaign, type Campaign } from '../../../lib/queries/marketing';

const ROLE_LABELS: Record<string, string> = {
  student: 'Élèves', staff_admin: 'Administration',
};

export default function MarketingPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', target_role: 'student', message: '', max_frequency_per_week: 1, is_active: true });
  const [isLoading, setIsLoading] = useState(true);

  async function load() {
    setIsLoading(true);
    setCampaigns(await listCampaigns());
    setIsLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    await createCampaign(form as any);
    setForm({ name: '', target_role: 'student', message: '', max_frequency_per_week: 1, is_active: true });
    setShowForm(false);
    load();
  }

  async function handleToggle(c: Campaign) {
    await toggleCampaignActive(c.id, !c.is_active);
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer cette campagne ?')) return;
    await deleteCampaign(id);
    load();
  }

  return (
    <div style={{ padding: 24, maxWidth: 700 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Marketing</h1>
        <button onClick={() => setShowForm((v) => !v)} style={btnPrimary}>
          {showForm ? 'Annuler' : '+ Nouvelle campagne'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, margin: '16px 0' }}>
          <label style={label}>Nom de la campagne</label>
          <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={input} />

          <label style={label}>Cible</label>
          <select value={form.target_role} onChange={(e) => setForm({ ...form, target_role: e.target.value })} style={input}>
            <option value="student">Élèves</option>
            <option value="staff_admin">Administration</option>
          </select>

          <label style={label}>Message</label>
          <textarea required value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} style={{ ...input, minHeight: 70 }} />

          <label style={label}>Fréquence maximale (par semaine)</label>
          <input type="number" min={1} value={form.max_frequency_per_week} onChange={(e) => setForm({ ...form, max_frequency_per_week: Number(e.target.value) })} style={input} />

          <button type="submit" style={{ ...btnPrimary, marginTop: 12 }}>Créer la campagne</button>
        </form>
      )}

      {isLoading ? <p>Chargement...</p> : campaigns.map((c) => (
        <div key={c.id} style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: 14, marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <strong>{c.name}</strong>
              <div style={{ fontSize: 12, color: '#666' }}>
                Cible : {ROLE_LABELS[c.target_role ?? ''] ?? 'Tous'} — max {c.max_frequency_per_week}×/semaine
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => handleToggle(c)} style={linkButton}>{c.is_active ? 'Désactiver' : 'Activer'}</button>
              <button onClick={() => handleDelete(c.id)} style={{ ...linkButton, color: '#dc2626' }}>Supprimer</button>
            </div>
          </div>
          <p style={{ fontSize: 13, color: '#555', marginTop: 6 }}>{c.message}</p>
          <span style={{ fontSize: 11, color: c.is_active ? '#16a34a' : '#999' }}>{c.is_active ? 'Active' : 'Inactive'}</span>
        </div>
      ))}
      {!isLoading && campaigns.length === 0 && <p style={{ color: '#999' }}>Aucune campagne créée.</p>}
    </div>
  );
}

const label: React.CSSProperties = { display: 'block', fontWeight: 600, fontSize: 13, margin: '10px 0 4px' };
const input: React.CSSProperties = { width: '100%', padding: 10, borderRadius: 8, border: '1px solid #e5e7eb', boxSizing: 'border-box' };
const btnPrimary: React.CSSProperties = { background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 16px', fontWeight: 600, cursor: 'pointer' };
const linkButton: React.CSSProperties = { background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', padding: 0, fontSize: 13 };
