// Requêtes partagées : campagnes marketing ciblées (dashboard staff)
import { supabase } from '../supabase';

export interface Campaign {
  id: string;
  name: string;
  target_role: string | null;
  message: string;
  is_active: boolean;
  max_frequency_per_week: number;
}

export async function listCampaigns(): Promise<Campaign[]> {
  const { data, error } = await supabase.from('marketing_campaigns').select('*').order('name');
  if (error) throw error;
  return data ?? [];
}

export async function createCampaign(input: Omit<Campaign, 'id'>) {
  const { error } = await supabase.from('marketing_campaigns').insert(input);
  if (error) throw error;
}

export async function toggleCampaignActive(id: string, isActive: boolean) {
  const { error } = await supabase.from('marketing_campaigns').update({ is_active: isActive }).eq('id', id);
  if (error) throw error;
}

export async function deleteCampaign(id: string) {
  const { error } = await supabase.from('marketing_campaigns').delete().eq('id', id);
  if (error) throw error;
}
