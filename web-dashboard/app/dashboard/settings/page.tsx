'use client';
// Paramètres restaurant — heure limite de commande, quantité max, seuil solde faible.
import { useEffect, useState } from 'react';
import { getSettings, updateSettings, type RestaurantSettings } from '../../../lib/queries/settings';

export default function SettingsPage() {
  const [settings, setSettings] = useState<RestaurantSettings | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => { getSettings().then(setSettings); }, []);

  async function handleSave() {
    if (!settings) return;
    setIsSaving(true);
    setMessage(null);
    try {
      await updateSettings({
        order_cutoff_minutes: settings.order_cutoff_minutes,
        max_quantity_per_item: settings.max_quantity_per_item,
        low_balance_threshold: settings.low_balance_threshold,
      });
      setMessage('Paramètres enregistrés.');
    } catch (e: any) {
      setMessage(`Erreur : ${e.message}`);
    }
    setIsSaving(false);
  }

  if (!settings) return <div style={{ padding: 24 }}>Chargement...</div>;

  return (
    <div style={{ padding: 24, maxWidth: 480 }}>
      <h1>Paramètres</h1>

      <label style={label}>Heure limite de commande (minutes avant le créneau)</label>
      <input
        type="number"
        value={settings.order_cutoff_minutes}
        onChange={(e) => setSettings({ ...settings, order_cutoff_minutes: Number(e.target.value) })}
        style={input}
      />

      <label style={label}>Quantité maximale par plat</label>
      <input
        type="number"
        value={settings.max_quantity_per_item}
        onChange={(e) => setSettings({ ...settings, max_quantity_per_item: Number(e.target.value) })}
        style={input}
      />

      <label style={label}>Seuil d'alerte "solde faible" (repas restants)</label>
      <input
        type="number"
        value={settings.low_balance_threshold}
        onChange={(e) => setSettings({ ...settings, low_balance_threshold: Number(e.target.value) })}
        style={input}
      />

      <h3 style={{ marginTop: 20 }}>Horaires d'ouverture</h3>
      {Object.entries(settings.opening_hours).map(([slot, hours]) => (
        <div key={slot} style={{ fontSize: 13, color: '#666', padding: '4px 0' }}>
          {slot === 'petit_dejeuner' ? 'Petit-déjeuner' : slot === 'dejeuner' ? 'Déjeuner' : 'Dîner'} : {hours}
        </div>
      ))}

      <button onClick={handleSave} disabled={isSaving} style={btnPrimary}>
        {isSaving ? 'Enregistrement...' : 'Enregistrer'}
      </button>
      {message && <p style={{ marginTop: 10, color: message.startsWith('Erreur') ? '#dc2626' : '#16a34a' }}>{message}</p>}
    </div>
  );
}

const label: React.CSSProperties = { display: 'block', fontWeight: 600, fontSize: 13, margin: '16px 0 6px' };
const input: React.CSSProperties = { width: '100%', padding: 10, borderRadius: 8, border: '1px solid #e5e7eb', boxSizing: 'border-box' };
const btnPrimary: React.CSSProperties = { background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', fontWeight: 700, cursor: 'pointer', marginTop: 20 };
