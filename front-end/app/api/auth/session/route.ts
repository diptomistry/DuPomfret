import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/route-handler";

export async function GET(request: NextRequest) {
  // Use a mutable response for Supabase cookie refresh.
  const intermediate = NextResponse.next();
  const supabase = createClient(request, intermediate);

  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  const payload = {
    session: session
      ? {
          access_token: session.access_token,
          refresh_token: session.refresh_token,
          expires_at: session.expires_at,
        }
      : null,
    user: session?.user
      ? {
          id: session.user.id,
          email: session.user.email,
          user_metadata: session.user.user_metadata,
        }
      : null,
    error: error?.message ?? null,
  };

  const res = NextResponse.json(payload, { status: 200 });

  // Forward any refreshed auth cookies.
  for (const c of intermediate.cookies.getAll()) {
    res.cookies.set(c.name, c.value, c);
  }

  return res;
}

