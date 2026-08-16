// Contexte d'authentification global (mobile)
// Fournit : session Supabase, profil `users` chargé, rôle, état de chargement.
import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { AppUser } from './types';

interface AuthContextValue {
  session: Session | null;
  profile: AppUser | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  session: null,
  profile: null,
  isLoading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Charge le profil `users` (rôle inclus) une fois la session connue.
  async function loadProfile(userId: string) {
    const { data, error } = await supabase
      .from('users')
      .select('id, email, role, full_name, is_active')
      .eq('id', userId)
      .single();

    if (error) {
      console.warn('[Auth] Impossible de charger le profil :', error.message);
      setProfile(null);
      return;
    }
    setProfile(data as AppUser);
  }

  useEffect(() => {
    // Session existante au démarrage de l'app
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) loadProfile(session.user.id);
      setIsLoading(false);
    });

    // Écoute des changements (connexion, déconnexion, refresh token)
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
        if (newSession?.user) {
          loadProfile(newSession.user.id);
        } else {
          setProfile(null);
        }
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{ session, profile, isLoading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
