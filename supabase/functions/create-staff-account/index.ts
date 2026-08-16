// Edge Function : create-staff-account
// Crée un compte staff (serveur/livreur ou autre manager) avec email + mot de passe.
// Doit utiliser la clé service_role (jamais exposée au client) car Supabase Auth
// ne peut pas être manipulé directement en SQL/RLS.
//
// Appelée depuis le dashboard web via supabase.functions.invoke('create-staff-account', {...})
// Le JWT de l'appelant est transmis automatiquement ; on vérifie ici que
// l'appelant est bien 'restaurant_staff' avant de créer quoi que ce soit.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return json({ error: 'Non authentifié' }, 401);
    }

    // Client "en tant qu'appelant" pour vérifier son rôle (respecte le RLS)
    const callerClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await callerClient.auth.getUser();
    if (userError || !user) {
      return json({ error: 'Non authentifié' }, 401);
    }

    const { data: callerProfile } = await callerClient
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (callerProfile?.role !== 'restaurant_staff') {
      return json({ error: 'Action réservée au manager du restaurant' }, 403);
    }

    const body = await req.json();
    const { email, password, full_name, role, service, bureau, batiment } = body;

    if (!email || !password || !full_name || !role) {
      return json({ error: 'Champs manquants (email, password, full_name, role)' }, 400);
    }

    if (!['delivery_staff', 'restaurant_staff'].includes(role)) {
      return json({ error: 'Rôle non autorisé à la création via ce formulaire' }, 400);
    }

    // Client admin (service_role) : seul moyen de créer un utilisateur Auth
    // directement confirmé, sans passer par le flux d'inscription publique.
    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role, full_name, service, bureau, batiment },
    });

    if (createError) {
      return json({ error: createError.message }, 400);
    }

    // Le trigger `handle_new_auth_user` (migration 0002) crée automatiquement
    // la ligne `users` + `staff_profiles` à partir de ces métadonnées.

    return json({ id: created.user.id, email: created.user.email, role });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
