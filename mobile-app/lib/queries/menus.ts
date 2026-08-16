// Requêtes partagées : menus + créneaux inclus dans l'abonnement d'un élève
import { supabase } from '../supabase';

export type MealSlot = 'petit_dejeuner' | 'dejeuner' | 'diner';
export type MenuCategory = 'eleve' | 'administration';

export interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  photo_url: string | null;
  is_available: boolean;
}

export interface MenuWithItems {
  id: string;
  date: string;
  slot: MealSlot;
  items: MenuItem[];
}

const SLOT_TIME_RANGES: Record<MealSlot, string> = {
  petit_dejeuner: '06h30 - 08h00',
  dejeuner: '12h00 - 14h00',
  diner: '18h30 - 20h30',
};

export function slotLabel(slot: MealSlot) {
  const labels: Record<MealSlot, string> = {
    petit_dejeuner: 'Petit-déjeuner',
    dejeuner: 'Déjeuner',
    diner: 'Dîner',
  };
  return `${labels[slot]} (${SLOT_TIME_RANGES[slot]})`;
}

export type SlotStatus = 'termine' | 'en_cours' | 'a_venir';

const SLOT_HOUR_RANGES: Record<MealSlot, [number, number]> = {
  petit_dejeuner: [6.5, 8],
  dejeuner: [12, 14],
  diner: [18.5, 20.5],
};

/** Statut d'un créneau par rapport à l'heure actuelle, pour l'affichage (badge coloré). */
export function getSlotStatus(slot: MealSlot): SlotStatus {
  const now = new Date();
  const hourDecimal = now.getHours() + now.getMinutes() / 60;
  const [start, end] = SLOT_HOUR_RANGES[slot];
  if (hourDecimal < start) return 'a_venir';
  if (hourDecimal > end) return 'termine';
  return 'en_cours';
}

export const SLOT_STATUS_LABELS: Record<SlotStatus, string> = {
  termine: 'Terminé',
  en_cours: 'En cours',
  a_venir: 'À venir',
};

export const SLOT_STATUS_COLORS: Record<SlotStatus, { bg: string; text: string; border: string }> = {
  termine: { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0' },
  en_cours: { bg: '#fffbeb', text: '#d97706', border: '#fde68a' },
  a_venir: { bg: '#eef2ff', text: '#4f46e5', border: '#c7d2fe' },
};

/** Récupère les menus publiés d'une catégorie pour une date donnée, avec leurs plats. */
export async function getMenusForDate(
  date: string, // format 'YYYY-MM-DD'
  category: MenuCategory
): Promise<MenuWithItems[]> {
  const { data, error } = await supabase
    .from('menus')
    .select('id, date, slot, menu_items(id, name, description, price, photo_url, is_available)')
    .eq('date', date)
    .eq('category', category)
    .eq('is_published', true)
    .order('slot');

  if (error) {
    console.warn('[Menus] Erreur de chargement :', error.message);
    return [];
  }

  return (data ?? []).map((m: any) => ({
    id: m.id,
    date: m.date,
    slot: m.slot,
    items: m.menu_items ?? [],
  }));
}

/**
 * Renvoie les créneaux repas inclus dans la formule d'abonnement active
 * de l'élève. Utilisé pour n'afficher que les repas auxquels il a droit.
 */
export async function getStudentIncludedSlots(studentId: string): Promise<MealSlot[] | null> {
  const { data, error } = await supabase
    .from('meal_accounts')
    .select('subscription_plans(includes_petit_dejeuner, includes_dejeuner, includes_diner)')
    .eq('student_id', studentId)
    .order('expires_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data?.subscription_plans) {
    console.warn('[Menus] Aucune formule active trouvée :', error?.message);
    return null;
  }

  const plan = data.subscription_plans as any;
  const slots: MealSlot[] = [];
  if (plan.includes_petit_dejeuner) slots.push('petit_dejeuner');
  if (plan.includes_dejeuner) slots.push('dejeuner');
  if (plan.includes_diner) slots.push('diner');
  return slots;
}

/** Génère les 7 prochains jours pour le sélecteur de date (Lun 20, Mar 21, ...). */
export function getNext7Days(): { date: string; label: string; dayNumber: string }[] {
  const days: { date: string; label: string; dayNumber: string }[] = [];
  const dayLabels = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    days.push({
      date: d.toISOString().slice(0, 10),
      label: dayLabels[d.getDay()],
      dayNumber: String(d.getDate()),
    });
  }
  return days;
}
