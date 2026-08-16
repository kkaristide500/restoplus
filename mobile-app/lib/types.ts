// Types partagés, alignés sur supabase/migrations/0001_init_schema.sql
// TODO Phase ultérieure : remplacer progressivement par `supabase gen types typescript`

export type UserRole = 'student' | 'staff_admin' | 'restaurant_staff';

export interface AppUser {
  id: string;
  email: string;
  role: UserRole;
  full_name: string;
  is_active: boolean;
}

export interface StudentProfile {
  user_id: string;
  matricule: string;
  classe: string | null;
}

export interface StaffProfile {
  user_id: string;
  service: string | null;
  bureau: string | null;
  batiment: string | null;
}

// Rôles proposés à l'inscription publique (le staff restaurant est exclu,
// attribué manuellement — voir migration 0002_auth_rls.sql)
export type SignUpRole = Extract<UserRole, 'student' | 'staff_admin'>;
