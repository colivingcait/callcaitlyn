import { google, gmail_v1 } from "googleapis";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAuthorizedGoogleClient } from "@/lib/google/oauth";
import { extractBlinqBodyText } from "@/lib/google/sync-inbox";
import { looksLikeBlinqShareEmail, parseBlinqShareEmail } from "@/lib/google/parse-blinq-email";
import { recordBlinqContact } from "@/lib/crm/blinq-contact";

function headerValue(headers: gmail_v1.Schema$MessagePartHeader[] | undefined, name: string) {
  return headers?.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? "";
}

// One-time sweep of Gmail history the incremental sync (syncGmailInbox)
// never sees - that one only diffs forward from the historyId recorded
// when Gmail was first connected, so any Blinq share that arrived before
// this feature existed (or before Gmail was even connected) is invisible
// to it. Searches Gmail directly by subject instead of relying on
// history, same "catch what a webhook/live sync missed" idea as the
// other *SyncBackfill buttons in Settings.
export async function backfillBlinqShares(admin: SupabaseClient, ownerId: string): Promise<{ found: number; added: number } | null> {
  const client = await getAuthorizedGoogleClient(admin, ownerId);
  if (!client) return null;

  const gmail = google.gmail({ version: "v1", auth: client });

  const messageIds: string[] = [];
  let pageToken: string | undefined;
  do {
    const { data } = await gmail.users.messages.list({
      userId: "me",
      q: 'subject:"has sent you their details"',
      maxResults: 100,
      pageToken,
    });
    for (const m of data.messages ?? []) {
      if (m.id) messageIds.push(m.id);
    }
    pageToken = data.nextPageToken ?? undefined;
  } while (pageToken);

  let added = 0;
  for (const messageId of messageIds) {
    try {
      const { data: full } = await gmail.users.messages.get({ userId: "me", id: messageId, format: "full" });
      const subject = headerValue(full.payload?.headers, "Subject");
      if (!looksLikeBlinqShareEmail(subject)) continue;

      const bodyText = extractBlinqBodyText(full.payload);
      const parsed = parseBlinqShareEmail(subject, bodyText);
      if (!parsed || (!parsed.email && !parsed.phone)) continue;

      await recordBlinqContact(admin, ownerId, { ...parsed, dedupeId: messageId });
      added++;
    } catch (err) {
      console.error("Blinq backfill failed for message", messageId, err);
    }
  }

  return { found: messageIds.length, added };
}
