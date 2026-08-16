// Page publique — Menu du jour (Visiteur, sans compte)
// Route accessible directement après scan du QR public. Aucune authentification.
import { supabase } from '../../lib/supabase';

const SLOT_LABELS: Record<string, string> = {
  petit_dejeuner: 'Petit-déjeuner (06h30 - 08h00)',
  dejeuner: 'Déjeuner (12h00 - 14h00)',
  diner: 'Dîner (18h30 - 20h30)',
};

async function getTodayMenus() {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from('menus')
    .select('id, slot, menu_items(id, name, description, price, photo_url, is_available)')
    .eq('date', today)
    .eq('category', 'administration')
    .eq('is_published', true)
    .order('slot');

  if (error) {
    console.error(error.message);
    return [];
  }
  return data ?? [];
}

export default async function PublicMenuPage() {
  const menus = await getTodayMenus();
  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <main style={{ maxWidth: 600, margin: '0 auto', padding: 24, fontFamily: 'sans-serif' }}>
      <h1 style={{ color: '#16a34a', textAlign: 'center' }}>RestoPlus</h1>
      <p style={{ textAlign: 'center', color: '#666', marginBottom: 24 }}>
        Menu du jour — {today}
      </p>

      {menus.length === 0 && (
        <p style={{ textAlign: 'center', color: '#999' }}>
          Aucun menu publié pour aujourd'hui pour le moment.
        </p>
      )}

      {menus.map((menu: any) => (
        <div key={menu.id} style={{ border: '1px solid #e5e7eb', borderRadius: 14, padding: 16, marginBottom: 16 }}>
          <h3>{SLOT_LABELS[menu.slot]}</h3>
          {menu.menu_items.map((item: any) => (
            <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderTop: '1px solid #f3f4f6' }}>
              {item.photo_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.photo_url}
                  alt={item.name}
                  width={56}
                  height={56}
                  style={{ borderRadius: 10, objectFit: 'cover', flexShrink: 0 }}
                />
              )}
              <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between' }}>
                <span>{item.name}{!item.is_available ? ' (indisponible)' : ''}</span>
                <span style={{ color: '#666' }}>{item.price.toLocaleString('fr-FR')} FCFA</span>
              </div>
            </div>
          ))}
        </div>
      ))}
    </main>
  );
}
