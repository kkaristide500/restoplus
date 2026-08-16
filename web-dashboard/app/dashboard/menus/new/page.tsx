'use client';
// Création d'un menu (date + créneau + catégorie) et de ses plats.
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createMenu, type MenuItemInput, type MealSlot, type MenuCategory } from '../../../../lib/queries/menus';

const emptyItem = (): MenuItemInput => ({
  name: '', description: '', price: 0, photo_url: '', is_available: true,
});

export default function NewMenuPage() {
  const router = useRouter();
  const [date, setDate] = useState('');
  const [slot, setSlot] = useState<MealSlot>('dejeuner');
  const [category, setCategory] = useState<MenuCategory>('eleve');
  const [isPublished, setIsPublished] = useState(false);
  const [items, setItems] = useState<MenuItemInput[]>([emptyItem()]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateItem(index: number, patch: Partial<MenuItemInput>) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }

  function addItem() {
    setItems((prev) => [...prev, emptyItem()]);
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!date) {
      setError('La date est obligatoire.');
      return;
    }
    const validItems = items.filter((it) => it.name.trim() !== '');
    if (validItems.length === 0) {
      setError('Ajoute au moins un plat.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await createMenu({ date, slot, category, is_published: isPublished, items: validItems });
      router.push('/dashboard/menus');
    } catch (e: any) {
      setError(e.message);
    }
    setIsSubmitting(false);
  }

  return (
    <div style={{ padding: 24, maxWidth: 720 }}>
      <h1>Nouveau menu</h1>

      <form onSubmit={handleSubmit}>
        <div style={row}>
          <div style={{ flex: 1 }}>
            <label style={label}>Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={input} required />
          </div>
          <div style={{ flex: 1 }}>
            <label style={label}>Créneau</label>
            <select value={slot} onChange={(e) => setSlot(e.target.value as MealSlot)} style={input}>
              <option value="petit_dejeuner">Petit-déjeuner</option>
              <option value="dejeuner">Déjeuner</option>
              <option value="diner">Dîner</option>
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={label}>Catégorie</label>
            <select value={category} onChange={(e) => setCategory(e.target.value as MenuCategory)} style={input}>
              <option value="eleve">Élève</option>
              <option value="administration">Administration</option>
            </select>
          </div>
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '16px 0' }}>
          <input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} />
          Publier immédiatement (visible par les usagers)
        </label>

        <h3>Plats</h3>
        {items.map((item, index) => (
          <div key={index} style={itemCard}>
            <div style={row}>
              <div style={{ flex: 2 }}>
                <label style={label}>Nom</label>
                <input
                  value={item.name}
                  onChange={(e) => updateItem(index, { name: e.target.value })}
                  style={input}
                  placeholder="Ex: Riz au gras"
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={label}>Prix (FCFA)</label>
                <input
                  type="number"
                  value={item.price}
                  onChange={(e) => updateItem(index, { price: Number(e.target.value) })}
                  style={input}
                />
              </div>
            </div>
            <label style={label}>Description (optionnel)</label>
            <input
              value={item.description}
              onChange={(e) => updateItem(index, { description: e.target.value })}
              style={input}
            />
            <label style={label}>URL photo (optionnel)</label>
            <input
              value={item.photo_url}
              onChange={(e) => updateItem(index, { photo_url: e.target.value })}
              style={input}
            />
            {items.length > 1 && (
              <button type="button" onClick={() => removeItem(index)} style={{ ...linkButton, marginTop: 8 }}>
                Retirer ce plat
              </button>
            )}
          </div>
        ))}

        <button type="button" onClick={addItem} style={btnSecondary}>
          + Ajouter un plat
        </button>

        {error && <p style={{ color: '#dc2626', marginTop: 16 }}>{error}</p>}

        <div style={{ marginTop: 24 }}>
          <button type="submit" disabled={isSubmitting} style={btnPrimary}>
            {isSubmitting ? 'Création...' : 'Créer le menu'}
          </button>
        </div>
      </form>
    </div>
  );
}

const row: React.CSSProperties = { display: 'flex', gap: 12 };
const label: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 600, margin: '10px 0 4px' };
const input: React.CSSProperties = { width: '100%', padding: 10, borderRadius: 6, border: '1px solid #e5e7eb' };
const itemCard: React.CSSProperties = { border: '1px solid #e5e7eb', borderRadius: 10, padding: 14, marginBottom: 12 };
const btnPrimary: React.CSSProperties = { background: '#16a34a', color: '#fff', padding: '12px 20px', borderRadius: 8, border: 'none', fontWeight: 700, cursor: 'pointer' };
const btnSecondary: React.CSSProperties = { background: '#f3f4f6', padding: '10px 16px', borderRadius: 8, border: '1px solid #e5e7eb', cursor: 'pointer' };
const linkButton: React.CSSProperties = { background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: 0, fontSize: 13 };
