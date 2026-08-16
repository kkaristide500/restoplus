'use client';
// Liste des menus (staff) — filtrable par date et catégorie, publication en un clic.
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  listMenus, updateMenuPublishState, deleteMenu,
  type MenuRow, type MenuCategory,
} from '../../../lib/queries/menus';

const SLOT_LABELS: Record<string, string> = {
  petit_dejeuner: 'Petit-déjeuner',
  dejeuner: 'Déjeuner',
  diner: 'Dîner',
};

export default function MenusPage() {
  const [menus, setMenus] = useState<MenuRow[]>([]);
  const [dateFilter, setDateFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<MenuCategory | ''>('');
  const [isLoading, setIsLoading] = useState(true);

  async function load() {
    setIsLoading(true);
    try {
      const data = await listMenus({
        date: dateFilter || undefined,
        category: (categoryFilter || undefined) as MenuCategory | undefined,
      });
      setMenus(data);
    } catch (e: any) {
      console.error(e.message);
    }
    setIsLoading(false);
  }

  useEffect(() => {
    load();
  }, [dateFilter, categoryFilter]);

  async function togglePublish(menu: MenuRow) {
    await updateMenuPublishState(menu.id, !menu.is_published);
    load();
  }

  async function handleDelete(menuId: string) {
    if (!confirm('Supprimer ce menu et tous ses plats ?')) return;
    await deleteMenu(menuId);
    load();
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Menus</h1>
        <Link href="/dashboard/menus/new" style={btnPrimary}>
          + Nouveau menu
        </Link>
      </div>

      <div style={{ display: 'flex', gap: 12, margin: '16px 0' }}>
        <input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          style={inputStyle}
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as MenuCategory | '')}
          style={inputStyle}
        >
          <option value="">Toutes catégories</option>
          <option value="eleve">Élève</option>
          <option value="administration">Administration</option>
        </select>
      </div>

      {isLoading ? (
        <p>Chargement...</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>
              <th style={th}>Date</th>
              <th style={th}>Créneau</th>
              <th style={th}>Catégorie</th>
              <th style={th}>Plats</th>
              <th style={th}>Statut</th>
              <th style={th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {menus.map((menu) => (
              <tr key={menu.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={td}>{menu.date}</td>
                <td style={td}>{SLOT_LABELS[menu.slot]}</td>
                <td style={td}>{menu.category === 'eleve' ? 'Élève' : 'Administration'}</td>
                <td style={td}>{menu.menu_items?.length ?? 0}</td>
                <td style={td}>
                  <span style={{ color: menu.is_published ? '#16a34a' : '#999' }}>
                    {menu.is_published ? 'Publié' : 'Brouillon'}
                  </span>
                </td>
                <td style={{ ...td, display: 'flex', gap: 8 }}>
                  <Link href={`/dashboard/menus/${menu.id}`}>Modifier</Link>
                  <button onClick={() => togglePublish(menu)} style={linkButton}>
                    {menu.is_published ? 'Dépublier' : 'Publier'}
                  </button>
                  <button onClick={() => handleDelete(menu.id)} style={{ ...linkButton, color: '#dc2626' }}>
                    Supprimer
                  </button>
                </td>
              </tr>
            ))}
            {menus.length === 0 && (
              <tr><td colSpan={6} style={{ ...td, textAlign: 'center', color: '#999' }}>Aucun menu.</td></tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}

const th: React.CSSProperties = { padding: '8px 4px', fontSize: 13, color: '#666' };
const td: React.CSSProperties = { padding: '10px 4px', fontSize: 14 };
const inputStyle: React.CSSProperties = { padding: 8, borderRadius: 6, border: '1px solid #e5e7eb' };
const btnPrimary: React.CSSProperties = {
  background: '#16a34a', color: '#fff', padding: '10px 16px',
  borderRadius: 8, textDecoration: 'none', fontWeight: 600,
};
const linkButton: React.CSSProperties = {
  background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', padding: 0, fontSize: 14,
};
