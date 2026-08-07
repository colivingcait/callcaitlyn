import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { getGoogleAuthUrl } from "@/lib/google/oauth";

// The middleware already requires a logged-in session to reach this route,
// but double-check here too since it writes to gmail_accounts on the
// callback and shouldn't ever run for a signed-out request.
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  const state = randomUUID();
  const response = NextResponse.redirect(getGoogleAuthUrl(state));
  // Short-lived, verified on callback as basic CSRF protection - the
  // actual owner is always re-derived from the session, never from state.
  response.cookies.set("gmail_oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return response;
}
