// Client Supabase partagé (web)
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[RestoPlus] Variables Supabase manquantes : définis NEXT_PUBLIC_SUPABASE_URL ' +
    'et NEXT_PUBLIC_SUPABASE_ANON_KEY dans ton fichier .env.local'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
