import { NextResponse, type NextRequest } from 'next/server';

/**
 * Next 16 proxy (anciennement middleware).
 *
 * Phase 0 : gate désactivé tant que Supabase n'est pas configuré (NEXT_PUBLIC_SUPABASE_URL
 * absent). Permet de prévisualiser le dashboard mocké sans auth.
 *
 * Phase 1 / Task 12 : quand Supabase est câblé, redirige vers /connexion?next=…
 * si aucun cookie de session n'est présent.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith('/app')) return NextResponse.next();

  const supabaseConfigured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  if (!supabaseConfigured) return NextResponse.next();

  const hasSessionCookie = request.cookies
    .getAll()
    .some((c) => c.name.startsWith('sb-') && c.name.endsWith('-auth-token'));

  if (!hasSessionCookie) {
    const url = request.nextUrl.clone();
    url.pathname = '/connexion';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/app/:path*'],
};
