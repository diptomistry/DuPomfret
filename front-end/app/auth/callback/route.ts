import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/route-handler";
import { ROUTES } from "@/lib/constants";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? ROUTES.DASHBOARD;
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      new URL(`${ROUTES.LOGIN}?error=${encodeURIComponent(error)}`, request.url)
    );
  }

  if (!code) {
    return NextResponse.redirect(new URL(ROUTES.LOGIN, request.url));
  }

  const redirectTo = new URL(next, request.url);
  const response = NextResponse.redirect(redirectTo);
  const supabase = createClient(request, response);

  const { error: exchangeError } =
    await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    return NextResponse.redirect(
      new URL(
        `${ROUTES.LOGIN}?error=${encodeURIComponent(exchangeError.message)}`,
        request.url
      )
    );
  }

  return response;
}
