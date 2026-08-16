'use client';
// Layout dashboard staff : sidebar adaptée au rôle connecté.
// - restaurant_staff (manager) : accès complet
// - delivery_staff (serveur/livreur) : accès restreint à "Mes livraisons"
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';

const MANAGER_LINKS = [
  { href: '/dashboard', label: 'Tableau de bord' },
  { href: '/dashboard/menus', label: 'Menus' },
  { href: '/dashboard/orders', label: 'Commandes' },
  { href: '/dashboard/scan', label: 'Scan Repas' },
  { href: '/dashboard/students', label: 'Élèves / Crédits' },
  { href: '/dashboard/deliveries', label: 'Mes livraisons' },
  { href: '/dashboard/reviews', label: 'Avis' },
  { href: '/dashboard/reports', label: 'Rapports' },
  { href: '/dashboard/marketing', label: 'Marketing' },
  { href: '/dashboard/users', label: 'Utilisateurs' },
  { href: '/dashboard/settings', label: 'Paramètres' },
];

const DELIVERY_LINKS = [
  { href: '/dashboard/deliveries', label: 'Mes livraisons' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<string | null>(null);
  const [fullName, setFullName] = useState('');
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: profile } = await supabase
        .from('users')
        .select('role, full_name')
        .eq('id', data.user.id)
        .single();
      setRole(profile?.role ?? null);
      setFullName(profile?.full_name ?? '');
    });
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace('/login');
  }

  const links = role === 'delivery_staff' ? DELIVERY_LINKS : MANAGER_LINKS;

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside style={{ width: 220, background: '#111', color: '#fff', padding: 16, flexShrink: 0 }}>
        <div style={{ fontWeight: 700, marginBottom: 4 }}>RestoPlus</div>
        <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 20 }}>{fullName}</div>
        <nav>
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              style={{
                display: 'block', padding: '10px 8px', borderRadius: 8, marginBottom: 4,
                color: pathname === link.href ? '#fff' : '#9ca3af',
                background: pathname === link.href ? '#16a34a' : 'transparent',
                textDecoration: 'none', fontSize: 14,
              }}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <button onClick={handleLogout} style={{ marginTop: 24, background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: 13 }}>
          Se déconnecter
        </button>
      </aside>
      <main style={{ flex: 1, background: '#fafafa', overflowY: 'auto' }}>{children}</main>
    </div>
  );
}
