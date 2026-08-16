// Requêtes partagées : gestion des comptes staff (dashboard, manager uniquement)
import { supabase } from '../supabase';

export type ManagedRole = 'delivery_staff' | 'restaurant_staff';

export interface StaffUserRow {
  id: string;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
}

export async function listAllUsers(): Promise<StaffUserRow[]> {
  const { data, error } = await supabase
    .from('users')
    .select('id, full_name, email, role, is_active')
    .order('role');
  if (error) throw error;
  return data ?? [];
}

export async function toggleUserActive(userId: string, isActive: boolean) {
  const { error } = await supabase.from('users').update({ is_active: isActive }).eq('id', userId);
  if (error) throw error;
}

/** Création d'un compte serveur/livreur ou manager — passe par l'Edge Function (service_role). */
export async function createStaffAccount(input: {
  email: string;
  password: string;
  full_name: string;
  role: ManagedRole;
}) {
  const { data, error } = await supabase.functions.invoke('create-staff-account', {
    body: input,
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}
