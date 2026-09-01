import Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";

const MODEL = "claude-haiku-4-5-20251001";

// One-time cleanup for the backlog that predates has_signal/needs_reply
// (lib/ai/analyze-contact.ts) - those only classify new activity going
// forward, so this re-runs the same judgment against what's already on
// file: the standing Replies Owed backlog and the standing Suggested
// cards. Deliberately its own lightweight classifier rather than
// reusing analyzeContactActivity, since re-running that on an old text
// would insert a brand-new ai_insights row for it - this only ever
// updates needs_reply on the activity itself, or dismisses an existing
// insight, never creates one.

type ClassifierTool = {
  name: string;
  description: string;
  input_schema: {
    type: "object";
    properties: Record<string, { type: string; description: string }>;
    required: string[];
  };
};

const REPLY_TOOL: ClassifierTool = {
  name: "classify_reply",
  description: "Classifies whether an inbound text message needs a reply.",
  input_schema: {
    type: "object",
    properties: {
      needs_reply: {
        type: "boolean",
        description:
          "True if this message is waiting on a reply - it asks a question, makes a request, or leaves something open. False if it closes the exchange and needs nothing further - a goodbye, a thank-you, a simple acknowledgment/confirmation like \"ok that works\" or \"sounds good\".",
      },
    },
    required: ["needs_reply"],
  },
};

const SIGNAL_TOOL: ClassifierTool = {
  name: "classify_signal",
  description: "Classifies whether a CRM insight summary is worth surfacing to a real estate agent as a heads-up.",
  input_schema: {
    type: "object",
    properties: {
      has_signal: {
        type: "boolean",
        description:
          "True if this reveals something genuinely worth a heads-up - a new timeline/budget/concern, a stage-worthy update. False if it's just a restatement of a plain conversational close or acknowledgment with no real signal (e.g. someone said thanks, confirmed a time works, said goodnight).",
      },
    },
    required: ["has_signal"],
  },
};

async function classifyBoolean(client: Anthropic, tool: ClassifierTool, field: string, prompt: string): Promise<boolean | null> {
  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 128,
      tools: [tool],
      tool_choice: { type: "tool", name: tool.name },
      messages: [{ role: "user", content: prompt }],
    });
    const toolUse = response.content.find((b) => b.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") return null;
    const input = toolUse.input as Record<string, unknown>;
    return typeof input[field] === "boolean" ? (input[field] as boolean) : null;
  } catch (err) {
    console.error("Backfill classification request failed", err);
    return null;
  }
}

// Same "latest text per contact" definition getRepliesOwedGroup uses -
// only that row's needs_reply actually affects what shows on the list.
export async function backfillNeedsReply(admin: SupabaseClient, ownerId: string): Promise<number> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return 0;
  const client = new Anthropic({ apiKey });

  const { data } = await admin
    .from("activities")
    .select("id, contact_id, direction, body, needs_reply, occurred_at, contacts!inner(archived)")
    .eq("owner_id", ownerId)
    .eq("type", "text")
    .eq("contacts.archived", false)
    .order("occurred_at", { ascending: false })
    .limit(1000);

  const seen = new Set<string>();
  let classified = 0;

  for (const row of data ?? []) {
    if (seen.has(row.contact_id)) continue;
    seen.add(row.contact_id);

    if (row.direction !== "inbound") continue;
    if (row.needs_reply !== null) continue;
    if (!row.body || row.body.trim().length < 3) continue;

    const needsReply = await classifyBoolean(
      client,
      REPLY_TOOL,
      "needs_reply",
      `Does this text message need a reply from the person who received it?\n\n"""\n${row.body}\n"""`,
    );
    if (needsReply === null) continue;

    await admin.from("activities").update({ needs_reply: needsReply }).eq("id", row.id);
    classified++;
  }

  return classified;
}

// Dismisses (never deletes - same reversible pattern the Dismiss button
// itself uses) any standing, non-dismissed insight whose summary reads
// as a plain restatement rather than real signal.
export async function backfillInsightSignal(admin: SupabaseClient, ownerId: string): Promise<number> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return 0;
  const client = new Anthropic({ apiKey });

  const { data } = await admin
    .from("ai_insights")
    .select("id, summary")
    .eq("owner_id", ownerId)
    .eq("dismissed", false)
    .order("created_at", { ascending: false })
    .limit(200);

  let dismissedCount = 0;

  for (const row of data ?? []) {
    if (!row.summary) continue;

    const hasSignal = await classifyBoolean(
      client,
      SIGNAL_TOOL,
      "has_signal",
      `A CRM generated this insight summary for a real estate agent to review. Is it worth surfacing, or is it just a restatement of a plain conversational close/acknowledgment?\n\n"""\n${row.summary}\n"""`,
    );
    if (hasSignal !== false) continue;

    await admin.from("ai_insights").update({ dismissed: true }).eq("id", row.id);
    dismissedCount++;
  }

  return dismissedCount;
}
