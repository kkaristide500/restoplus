'use client';
// Modification d'un menu existant : publication + disponibilité des plats.
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  getMenuWithItems, updateMenuPublishState, updateMenuItemAvailability,
} from '../../../../lib/queries/menus';

const SLOT_LABELS: Record<string, string> = {
  petit_dejeuner: 'Petit-déjeuner',
  dejeuner: 'Déjeuner',
  diner: 'Dîner',
};

export default function EditMenuPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [menu, setMenu] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function load() {
    setIsLoading(true);
    try {
      const data = await getMenuWithItems(id);
      setMenu(data);
    } catch (e) {
      console.error(e);
    }
    setIsLoading(false);
  }

  useEffect(() => {
    load();
  }, [id]);

  async function togglePublish() {
    await updateMenuPublishState(id, !menu.is_published);
    load();
  }

  async function toggleItemAvailability(itemId: string, current: boolean) {
    await updateMenuItemAvailability(itemId, !current);
    load();
  }

  if (isLoading) return <div style={{ padding: 24 }}>Chargement...</div>;
  if (!menu) return <div style={{ padding: 24 }}>Menu introuvable.</div>;

  return (
    <div style={{ padding: 24, maxWidth: 720 }}>
      <button onClick={() => router.push('/dashboard/menus')} style={linkButton}>← Retour</button>

      <h1>
        {SLOT_LABELS[menu.slot]} — {menu.date}
      </h1>
      <p style={{ color: '#666' }}>
        Catégorie : {menu.category === 'eleve' ? 'Élève' : 'Administration'}
      </p>

      <button onClick={togglePublish} style={menu.is_published ? btnSecondary : btnPrimary}>
        {menu.is_published ? 'Dépublier ce menu' : 'Publier ce menu'}
      </button>

      <h3 style={{ marginTop: 24 }}>Plats</h3>
      {menu.menu_items.map((item: any) => (
        <div key={item.id} style={itemRow}>
          <div>
            <strong>{item.name}</strong>
            <div style={{ fontSize: 13, color: '#666' }}>
              {item.price.toLocaleString('fr-FR')} FCFA
              {item.description ? ` — ${item.description}` : ''}
            </div>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input
              type="checkbox"
              checked={item.is_available}
              onChange={() => toggleItemAvailability(item.id, item.is_available)}
            />
            Disponible
          </label>
        </div>
      ))}
    </div>
  );
}

const itemRow: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  border: '1px solid #e5e7eb', borderRadius: 10, padding: 14, marginBottom: 10,
};
const btnPrimary: React.CSSProperties = { background: '#16a34a', color: '#fff', padding: '10px 16px', borderRadius: 8, border: 'none', fontWeight: 700, cursor: 'pointer' };
const btnSecondary: React.CSSProperties = { background: '#f3f4f6', padding: '10px 16px', borderRadius: 8, border: '1px solid #e5e7eb', cursor: 'pointer' };
const linkButton: React.CSSProperties = { background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', padding: 0, marginBottom: 12 };
