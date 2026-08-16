// Middleware : protège toutes les routes /dashboard/* — accès réservé
// aux comptes authentifiés avec le rôle restaurant_staff.
import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => request.cookies.get(name)?.value,
        set: (name: string, value: string, options: CookieOptions) => response.cookies.set(name, value, options),
        remove: (name: string, options: CookieOptions) => response.cookies.set(name, '', options),
      },
    }
  );

  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role, is_active')
    .eq('id', session.user.id)
    .single();

  const allowedRoles = ['restaurant_staff', 'delivery_staff'];
  if (!allowedRoles.includes(profile?.role ?? '') || profile?.is_active === false) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Un serveur/livreur n'a accès qu'à /dashboard/deliveries — tout le reste
  // (menus, commandes, scan, élèves, utilisateurs) est réservé au manager.
  if (profile?.role === 'delivery_staff' && !request.nextUrl.pathname.startsWith('/dashboard/deliveries')) {
    return NextResponse.redirect(new URL('/dashboard/deliveries', request.url));
  }

  return response;
}

export const config = {
  matcher: ['/dashboard/:path*'],
};