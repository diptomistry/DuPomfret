import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { ROUTES } from "@/lib/constants";

const USE_DEMO_AUTH =
  process.env.NEXT_PUBLIC_USE_DEMO_AUTH === "true" ||
  process.env.NEXT_PUBLIC_USE_DEMO_DATA === "true";

export async function updateSession(request: NextRequest) {
  // In demo mode we completely bypass Supabase auth & redirects.
  if (USE_DEMO_AUTH) {
    return NextResponse.next({ request });
  }

  const path = request.nextUrl.pathname;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthRoute = path === ROUTES.LOGIN;
  const isProtectedRoute = path.startsWith(ROUTES.DASHBOARD);

  if (isProtectedRoute && !user) {
    const loginUrl = new URL(ROUTES.LOGIN, request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthRoute && user) {
    const dashboardUrl = new URL(ROUTES.DASHBOARD, request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  return response;
}
