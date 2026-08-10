import { google } from "googleapis";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAuthorizedGmailClient } from "@/lib/google/oauth";

// Single-owner app - the "From" name is always hers. Without this, the raw
// MIME From header is just the bare address, and mail clients show that
// instead of a name.
const SENDER_NAME = "Caitlyn Verdugo";

function encodeSubject(subject: string) {
  // RFC 2047 encoded-word, so non-ASCII subjects (names, punctuation) don't
  // get mangled - plain ASCII subjects pass through unchanged either way.
  return `=?UTF-8?B?${Buffer.from(subject, "utf-8").toString("base64")}?=`;
}

function buildRawMessage(
  from: string,
  to: string,
  subject: string,
  htmlBody: string,
  extraHeaders?: Record<string, string>,
) {
  const message = [
    `From: "${SENDER_NAME}" <${from}>`,
    `To: ${to}`,
    `Subject: ${encodeSubject(subject)}`,
    "MIME-Version: 1.0",
    'Content-Type: text/html; charset="UTF-8"',
    ...Object.entries(extraHeaders ?? {}).map(([key, value]) => `${key}: ${value}`),
    "",
    htmlBody,
  ].join("\r\n");

  return Buffer.from(message).toString("base64url");
}

// Plain-text content in, simple HTML out - real estate follow-ups and
// sequence emails are short and conversational, not richly formatted, so a
// paragraph/line-break conversion is enough rather than a full editor.
export function textToHtml(text: string) {
  return text
    .split(/\n{2,}/)
    .map((para) => `<p>${para.replace(/\n/g, "<br>")}</p>`)
    .join("\n");
}

export async function sendGmailMessage(
  admin: SupabaseClient,
  ownerId: string,
  to: string,
  subject: string,
  htmlBody: string,
  extraHeaders?: Record<string, string>,
): Promise<{ ok: true; messageId: string } | { ok: false; error: string }> {
  const client = await getAuthorizedGmailClient(admin, ownerId);
  if (!client) return { ok: false, error: "Gmail isn't connected. Connect it in Settings first." };

  const { data: account } = await admin.from("gmail_accounts").select("email_address").eq("owner_id", ownerId).maybeSingle();
  if (!account) return { ok: false, error: "Gmail isn't connected. Connect it in Settings first." };

  const gmail = google.gmail({ version: "v1", auth: client });
  try {
    const raw = buildRawMessage(account.email_address, to, subject, htmlBody, extraHeaders);
    const { data } = await gmail.users.messages.send({ userId: "me", requestBody: { raw } });
    return { ok: true, messageId: data.id ?? "" };
  } catch (err) {
    console.error("Gmail send failed", err);
    return { ok: false, error: err instanceof Error ? err.message : "Gmail send failed" };
  }
}
