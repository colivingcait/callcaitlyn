import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthRoute = request.nextUrl.pathname.startsWith("/login");
  const isAuthCallback = request.nextUrl.pathname.startsWith("/auth");
  // The QR check-in page - scanned by attendees' own phones, not the
  // logged-in agent, so it must be reachable without a session.
  const isCheckIn = request.nextUrl.pathname.startsWith("/checkin");
  // The shared house-hack quote one-pager - opened by whoever she texted
  // or emailed it to, not the logged-in agent, so it must be reachable
  // without a session too.
  const isPublicQuote = request.nextUrl.pathname.startsWith("/n/");
  // The self-serve scheduling page - opened by whoever she texted the
  // link to, not the logged-in agent, so it must be reachable without a
  // session too. The bare "/book" (no trailing slash) is the easy
  // generic address, distinct from "/book/{slug}" contact links - both
  // need the bypass.
  const isPublicBooking = request.nextUrl.pathname === "/book" || request.nextUrl.pathname.startsWith("/book/");
  // Webhooks (Quo, and any future integration) authenticate via their own
  // signature, not a Supabase session - they must bypass the login guard.
  // Same for cron jobs (authenticate via CRON_SECRET, no browser session),
  // the unsubscribe link and open/click tracking links (clicked by a
  // contact, not the logged-in agent - without this exemption an anonymous
  // recipient clicking a tracked link gets bounced to /login instead of
  // their actual destination), and the Gmail OAuth callback - Google's
  // redirect back is a cross-site navigation, and some browsers don't
  // reliably resend the session cookie on that hop, so that route verifies
  // the request itself (state cookie) instead of relying on a recognized
  // session.
  const isWebhook =
    request.nextUrl.pathname.startsWith("/api/webhooks") ||
    request.nextUrl.pathname.startsWith("/api/cron") ||
    request.nextUrl.pathname.startsWith("/api/unsubscribe") ||
    request.nextUrl.pathname.startsWith("/api/track") ||
    request.nextUrl.pathname.startsWith("/api/auth/gmail/callback");
  const isPublicAsset =
    request.nextUrl.pathname.startsWith("/manifest.json") ||
    request.nextUrl.pathname.startsWith("/_next") ||
    request.nextUrl.pathname.startsWith("/favicon") ||
    request.nextUrl.pathname.startsWith("/sw.js");

  if (isAuthCallback || isWebhook || isCheckIn || isPublicQuote || isPublicBooking) {
    return response;
  }

  if (!user && !isAuthRoute && !isPublicAsset) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return response;
}
