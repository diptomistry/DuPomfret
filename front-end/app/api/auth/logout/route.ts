import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/route-handler";

export async function POST(request: NextRequest) {
  const intermediate = NextResponse.next();
  const supabase = createClient(request, intermediate);

  const { error } = await supabase.auth.signOut();

  const res = NextResponse.json(
    { success: !error, error: error?.message ?? null },
    { status: error ? 500 : 200 },
  );

  // Forward cleared/updated cookies from Supabase.
  for (const c of intermediate.cookies.getAll()) {
    res.cookies.set(c.name, c.value, c);
  }

  return res;
}

