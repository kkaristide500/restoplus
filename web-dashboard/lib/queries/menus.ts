// Requêtes partagées : gestion des menus (dashboard staff)
import { supabase } from '../supabase';

export type MealSlot = 'petit_dejeuner' | 'dejeuner' | 'diner';
export type MenuCategory = 'eleve' | 'administration';

export interface MenuItemInput {
  id?: string;
  name: string;
  description: string;
  price: number;
  photo_url: string;
  is_available: boolean;
}

export interface MenuRow {
  id: string;
  date: string;
  slot: MealSlot;
  category: MenuCategory;
  is_published: boolean;
  menu_items: { id: string }[];
}

export async function listMenus(filters: { date?: string; category?: MenuCategory }) {
  let query = supabase
    .from('menus')
    .select('id, date, slot, category, is_published, menu_items(id)')
    .order('date', { ascending: false })
    .order('slot');

  if (filters.date) query = query.eq('date', filters.date);
  if (filters.category) query = query.eq('category', filters.category);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as MenuRow[];
}

export async function getMenuWithItems(menuId: string) {
  const { data, error } = await supabase
    .from('menus')
    .select('id, date, slot, category, is_published, menu_items(id, name, description, price, photo_url, is_available)')
    .eq('id', menuId)
    .single();

  if (error) throw error;
  return data;
}

export async function createMenu(input: {
  date: string;
  slot: MealSlot;
  category: MenuCategory;
  is_published: boolean;
  items: MenuItemInput[];
}) {
  const { data: menu, error: menuError } = await supabase
    .from('menus')
    .insert({
      date: input.date,
      slot: input.slot,
      category: input.category,
      is_published: input.is_published,
    })
    .select()
    .single();

  if (menuError) throw menuError;

  if (input.items.length > 0) {
    const { error: itemsError } = await supabase.from('menu_items').insert(
      input.items.map((item) => ({
        menu_id: menu.id,
        name: item.name,
        description: item.description || null,
        price: item.price,
        photo_url: item.photo_url || null,
        is_available: item.is_available,
      }))
    );
    if (itemsError) throw itemsError;
  }

  return menu;
}

export async function updateMenuPublishState(menuId: string, isPublished: boolean) {
  const { error } = await supabase
    .from('menus')
    .update({ is_published: isPublished })
    .eq('id', menuId);
  if (error) throw error;
}

export async function updateMenuItemAvailability(itemId: string, isAvailable: boolean) {
  const { error } = await supabase
    .from('menu_items')
    .update({ is_available: isAvailable })
    .eq('id', itemId);
  if (error) throw error;
}

export async function deleteMenu(menuId: string) {
  const { error } = await supabase.from('menus').delete().eq('id', menuId);
  if (error) throw error;
}
