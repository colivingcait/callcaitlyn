import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyQuoSignature } from "@/lib/quo/verify-signature";
import { parseQuoCall, parseQuoMessage } from "@/lib/quo/parse-event";
import { findOrCreateContact } from "@/lib/crm/find-or-create-contact";
import { upsertActivity, patchActivityMetadata } from "@/lib/crm/activities";
import { analyzeContactActivity } from "@/lib/ai/analyze-contact";

const OWNER_ID = process.env.CRM_OWNER_USER_ID;

export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  const { ok, reason } = verifyQuoSignature(rawBody, request.headers);
  if (reason) {
    // Dump every header whenever verification is inconclusive so we can
    // find Quo's actual signature header name/format from a real delivery
    // and correct lib/quo/verify-signature.ts to match.
    console.warn("Quo webhook signature not verified:", reason, {
      headers: Object.fromEntries(request.headers.entries()),
    });
  }
  if (!ok) {
    console.error("Quo webhook rejected: signature check failed", reason);
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  if (!OWNER_ID) {
    console.error("Quo webhook received but CRM_OWNER_USER_ID is not configured");
    return NextResponse.json({ error: "server not configured" }, { status: 500 });
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const eventType = typeof body.type === "string" ? body.type : "unknown";
  const admin = createAdminClient();

  try {
    if (eventType === "call.completed") {
      const call = parseQuoCall(body);
      const contact = await findOrCreateContact(admin, OWNER_ID, {
        phone: call.counterpartNumber,
        leadSource: "Quo (auto-created from call)",
      });
      if (contact) {
        await upsertActivity(admin, OWNER_ID, contact.id, "quo", "quo_call_id", call.quoCallId, {
          type: "call",
          direction: call.direction,
          occurred_at: call.occurredAt,
          body: describeCall(call),
          metadata: {
            quo_call_id: call.quoCallId,
            quo_event_type: eventType,
            status: call.status,
            duration_seconds: call.durationSeconds,
            recording_url: call.recordingUrl,
            summary: call.summary,
            transcript: call.transcript,
            raw: body,
          },
        });
      }
    } else if (
      eventType === "call.recording.completed" ||
      eventType === "call.summary.completed" ||
      eventType === "call.transcript.completed"
    ) {
      const call = parseQuoCall(body);
      const contactId = await patchActivityMetadata(admin, OWNER_ID, "quo", "quo_call_id", call.quoCallId, {
        recording_url: call.recordingUrl ?? undefined,
        summary: call.summary ?? undefined,
        transcript: call.transcript ?? undefined,
      });
      const content = call.transcript ?? call.summary;
      if (contactId && content) {
        await analyzeContactActivity(admin, OWNER_ID, contactId, {
          type: "call",
          direction: call.direction,
          content,
        });
      }
    } else if (eventType === "message.received" || eventType === "message.delivered") {
      const msg = parseQuoMessage(body);
      const contact = await findOrCreateContact(admin, OWNER_ID, {
        phone: msg.counterpartNumber,
        leadSource: "Quo (auto-created from text)",
      });
      if (contact) {
        await upsertActivity(admin, OWNER_ID, contact.id, "quo", "quo_message_id", msg.quoMessageId, {
          type: "text",
          direction: msg.direction,
          occurred_at: msg.occurredAt,
          body: msg.text,
          metadata: { quo_message_id: msg.quoMessageId, quo_event_type: eventType, raw: body },
        });

        if (eventType === "message.received" && msg.text) {
          await analyzeContactActivity(admin, OWNER_ID, contact.id, {
            type: "text",
            direction: msg.direction,
            content: msg.text,
          });
        }
      }
    } else {
      console.log("Unhandled Quo webhook event type:", eventType);
    }
  } catch (err) {
    console.error("Error processing Quo webhook", eventType, err);
  }

  return NextResponse.json({ received: true });
}

function describeCall(call: ReturnType<typeof parseQuoCall>) {
  const parts: string[] = [];
  if (call.durationSeconds != null) {
    const mins = Math.floor(call.durationSeconds / 60);
    const secs = call.durationSeconds % 60;
    parts.push(`${mins}m ${secs}s`);
  }
  if (call.status) parts.push(call.status);
  if (call.summary) parts.push(call.summary);
  return parts.join(" · ") || null;
}
