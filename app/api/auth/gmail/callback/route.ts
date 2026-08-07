import { NextResponse, type NextRequest } from "next/server";
import { google } from "googleapis";
import { createClient } from "@/lib/supabase/server";
import { exchangeCodeForTokens } from "@/lib/google/oauth";

export async function GET(request: NextRequest) {
  const settingsUrl = new URL("/settings", request.url);

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const storedState = request.cookies.get("gmail_oauth_state")?.value;
  const error = request.nextUrl.searchParams.get("error");

  if (error) {
    settingsUrl.searchParams.set("gmail_error", error);
    return NextResponse.redirect(settingsUrl);
  }
  if (!code || !state || !storedState || state !== storedState) {
    settingsUrl.searchParams.set("gmail_error", "state_mismatch");
    return NextResponse.redirect(settingsUrl);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  try {
    const tokens = await exchangeCodeForTokens(code);
    if (!tokens.access_token || !tokens.refresh_token) {
      // Google only issues a refresh_token on first-ever consent (or when
      // prompt=consent forces it, which getGoogleAuthUrl already sets) -
      // missing one here means she'll need to revoke access at
      // myaccount.google.com/permissions and reconnect from scratch.
      settingsUrl.searchParams.set("gmail_error", "no_refresh_token");
      return NextResponse.redirect(settingsUrl);
    }

    const client = new google.auth.OAuth2();
    client.setCredentials(tokens);
    const oauth2 = google.oauth2({ auth: client, version: "v2" });
    const { data: profile } = await oauth2.userinfo.get();

    await supabase.from("gmail_accounts").upsert(
      {
        owner_id: user.id,
        email_address: profile.email ?? "unknown",
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expiry: new Date(tokens.expiry_date ?? Date.now() + 55 * 60_000).toISOString(),
      },
      { onConflict: "owner_id" },
    );

    settingsUrl.searchParams.set("gmail_connected", "1");
  } catch (err) {
    console.error("Gmail OAuth callback failed", err);
    settingsUrl.searchParams.set("gmail_error", "exchange_failed");
  }

  const response = NextResponse.redirect(settingsUrl);
  response.cookies.delete("gmail_oauth_state");
  return response;
}
