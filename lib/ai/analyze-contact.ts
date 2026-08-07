import Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";

const MODEL = "claude-haiku-4-5-20251001";

const INSIGHT_TOOL = {
  name: "record_insight",
  description: "Records an analysis of a new activity (text or call) against a real estate contact's CRM record.",
  input_schema: {
    type: "object" as const,
    properties: {
      summary: {
        type: "string",
        description: "1-2 sentence plain-English summary of what this activity reveals about the contact's status.",
      },
      suggested_stage: {
        type: ["string", "null"],
        description:
          "The pipeline stage name this contact should probably move to, exactly matching one of the provided stage names - or null if no change is warranted.",
      },
      suggested_timeline: {
        type: ["string", "null"],
        enum: ["asap", "1_3_months", "3_6_months", "6_12_months", "12_plus_months", "just_browsing", "unknown", null],
        description: "Updated buying/selling timeline estimate if the activity reveals one, else null.",
      },
      suggested_action: {
        type: ["string", "null"],
        description: "A concrete next action for the agent to take, e.g. 'Call to schedule a showing this week.'",
      },
      confidence: {
        type: "number",
        description: "0 to 1 - how confident this read is, based on how explicit the signal was.",
      },
    },
    required: ["summary", "confidence"],
  },
};

// Only ever writes: a new ai_insights row, and the informational
// ai_last_status_note/ai_last_analyzed_at fields on the contact. Never
// touches the contact's real stage_id/timeline directly - those changes
// are surfaced as a suggestion for the agent to Apply or Dismiss on the
// contact page (see lib/ai/apply-insight.ts).
export async function analyzeContactActivity(
  admin: SupabaseClient,
  ownerId: string,
  contactId: string,
  activity: { type: "call" | "text"; direction: string; content: string },
): Promise<void> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return;
  if (!activity.content || activity.content.trim().length < 3) return;

  const [{ data: contact }, { data: stages }] = await Promise.all([
    admin
      .from("contacts")
      .select("first_name, last_name, contact_type, timeline, stage_id")
      .eq("id", contactId)
      .maybeSingle(),
    admin.from("pipeline_stages").select("id, name").eq("owner_id", ownerId).order("sort_order", { ascending: true }),
  ]);
  if (!contact) return;

  const stageNames = (stages ?? []).map((s) => s.name);
  const currentStage = stages?.find((s) => s.id === contact.stage_id)?.name ?? "unknown";

  const client = new Anthropic({ apiKey });

  let response;
  try {
    response = await client.messages.create({
      model: MODEL,
      max_tokens: 512,
      tools: [INSIGHT_TOOL],
      tool_choice: { type: "tool", name: "record_insight" },
      messages: [
        {
          role: "user",
          content: `You're helping a real estate agent track leads in their CRM. Analyze this new ${activity.type} (${activity.direction}) from a contact and decide whether it changes their status.

Contact: ${contact.first_name} ${contact.last_name} (${contact.contact_type})
Current pipeline stage: ${currentStage}
Current timeline estimate: ${contact.timeline}
Available pipeline stages (suggested_stage must exactly match one of these, or be null): ${stageNames.join(", ")}

New ${activity.type}:
"""
${activity.content}
"""

Only suggest a stage/timeline change if the content actually signals it explicitly or strongly implicitly (e.g. "I'm ready to start looking" -> a more ready stage; "we're a couple months out" -> 1_3_months or 3_6_months). Don't invent signal that isn't there - it's fine for suggested_stage/suggested_timeline to be null.`,
        },
      ],
    });
  } catch (err) {
    console.error("AI analysis request failed", err);
    return;
  }

  const toolUse = response.content.find((block) => block.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") return;

  const result = toolUse.input as {
    summary: string;
    suggested_stage: string | null;
    suggested_timeline: string | null;
    suggested_action: string | null;
    confidence: number;
  };

  const suggestedStageId = result.suggested_stage
    ? stages?.find((s) => s.name === result.suggested_stage && s.name !== currentStage)?.id ?? null
    : null;
  const suggestedTimeline =
    result.suggested_timeline && result.suggested_timeline !== contact.timeline ? result.suggested_timeline : null;

  await admin.from("ai_insights").insert({
    owner_id: ownerId,
    contact_id: contactId,
    summary: result.summary,
    suggested_action: result.suggested_action,
    suggested_stage_id: suggestedStageId,
    suggested_timeline: suggestedTimeline,
    confidence: result.confidence,
  });

  await admin
    .from("contacts")
    .update({ ai_last_status_note: result.summary, ai_last_analyzed_at: new Date().toISOString() })
    .eq("id", contactId);
}
