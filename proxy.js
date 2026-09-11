import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// Next 16 calls this proxy.js (was middleware.js).
// Its only job is to refresh the Supabase session cookie so a member who opens
// the app from their home screen after a week is still signed in.
export async function proxy(request) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (list) => {
          list.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  // A blip talking to Supabase must not 500 the whole app.
  try { await supabase.auth.getUser(); } catch { /* leave cookies as they are */ }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.json|.*\\.(?:png|jpg|svg)$).*)'],
};
