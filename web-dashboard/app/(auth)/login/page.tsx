'use client';
// Connexion staff (restaurant_staff) — accès au dashboard uniquement.
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setIsSubmitting(false);
      return;
    }

    // Vérification du rôle : seuls restaurant_staff et delivery_staff ont accès au dashboard.
    const { data: profile } = await supabase
      .from('users')
      .select('role, is_active')
      .eq('id', data.user.id)
      .single();

    if (!['restaurant_staff', 'delivery_staff'].includes(profile?.role ?? '')) {
      await supabase.auth.signOut();
      setError("Ce compte n'a pas accès au dashboard restaurant.");
      setIsSubmitting(false);
      return;
    }

    if (profile?.is_active === false) {
      await supabase.auth.signOut();
      setError('Ce compte a été désactivé. Contacte ton manager.');
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(false);
    router.replace(profile?.role === 'delivery_staff' ? '/dashboard/deliveries' : '/dashboard');
  }

  return (
    <main style={{ maxWidth: 400, margin: '80px auto', padding: 24 }}>
      <h1 style={{ textAlign: 'center', color: '#16a34a' }}>RestoPlus</h1>
      <p style={{ textAlign: 'center', color: '#666', marginBottom: 32 }}>
        Espace restaurant / staff
      </p>

      <form onSubmit={handleSubmit}>
        <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={inputStyle}
        />

        <label style={{ display: 'block', fontWeight: 600, margin: '16px 0 6px' }}>
          Mot de passe
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={inputStyle}
        />

        {error && <p style={{ color: '#dc2626', marginTop: 12 }}>{error}</p>}

        <button type="submit" disabled={isSubmitting} style={buttonStyle}>
          {isSubmitting ? 'Connexion...' : 'Se connecter'}
        </button>
      </form>
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: 12,
  borderRadius: 8,
  border: '1px solid #e5e7eb',
  fontSize: 15,
};

const buttonStyle: React.CSSProperties = {
  width: '100%',
  marginTop: 24,
  padding: 14,
  borderRadius: 8,
  border: 'none',
  background: '#16a34a',
  color: '#fff',
  fontWeight: 700,
  cursor: 'pointer',
};
