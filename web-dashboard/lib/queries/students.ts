// Requêtes partagées : gestion des élèves, soldes, renouvellements (dashboard staff)
import { supabase } from '../supabase';

export interface StudentRow {
  id: string;
  full_name: string;
  email: string;
  matricule: string;
  total_remaining: number;
  has_pending_renewal: boolean;
}

export async function listStudents(): Promise<StudentRow[]> {
  const { data: students, error } = await supabase
    .from('users')
    .select('id, full_name, email, student_profiles(matricule)')
    .eq('role', 'student');
  if (error) throw error;

  const { data: balances } = await supabase
    .from('student_meal_balances')
    .select('student_id, remaining');

  const { data: pending } = await supabase
    .from('renewal_requests')
    .select('student_id')
    .eq('status', 'en_attente');

  const pendingSet = new Set((pending ?? []).map((p) => p.student_id));

  return (students ?? []).map((s: any) => ({
    id: s.id,
    full_name: s.full_name,
    email: s.email,
    matricule: s.student_profiles?.matricule ?? '—',
    total_remaining: (balances ?? [])
      .filter((b) => b.student_id === s.id)
      .reduce((sum, b) => sum + b.remaining, 0),
    has_pending_renewal: pendingSet.has(s.id),
  }));
}

export async function getStudentDetail(studentId: string) {
  const { data: student, error } = await supabase
    .from('users')
    .select('id, full_name, email, student_profiles(matricule, classe)')
    .eq('id', studentId)
    .single();
  if (error) throw error;

  const { data: balances } = await supabase
    .from('student_meal_balances')
    .select('slot, remaining, expires_at, plan_name')
    .eq('student_id', studentId);

  const { data: history } = await supabase
    .from('meal_consumptions')
    .select('id, slot, created_at')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })
    .limit(20);

  return { student, balances: balances ?? [], history: history ?? [] };
}

export async function listSubscriptionPlans() {
  const { data, error } = await supabase.from('subscription_plans').select('*');
  if (error) throw error;
  return data ?? [];
}

/** Renouvellement manuel — appelle la fonction serveur sécurisée `renew_subscription`. */
export async function renewStudentSubscription(studentId: string, planId: string) {
  const { data, error } = await supabase.rpc('renew_subscription', {
    p_student_id: studentId,
    p_plan_id: planId,
  });
  if (error) throw error;
  return data;
}

export async function listPendingRenewalRequests() {
  const { data, error } = await supabase
    .from('renewal_requests')
    .select('id, student_id, created_at, users(full_name)')
    .eq('status', 'en_attente')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}
