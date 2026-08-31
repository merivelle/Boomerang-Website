import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Refresh the session cookie and gate /admin.
//
// The matcher is deliberately narrow. A matcher that also caught /_next or
// /assets would put the entire static site through a function invocation on
// every request — an invisible performance regression on a site whose whole
// identity is that it is fast.
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

  // getUser, not getSession: it revalidates the token with Supabase rather than
  // trusting a cookie the browser could have forged.
  const { data } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isLogin = path === "/admin/login";

  if (!data.user && !isLogin) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    // Bounce them back where they were headed once they sign in.
    if (path !== "/admin") url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  if (data.user && isLogin) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = { matcher: ["/admin/:path*"] };
