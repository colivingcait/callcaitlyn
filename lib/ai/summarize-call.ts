import Anthropic from "@anthropic-ai/sdk";

const MODEL = "claude-haiku-4-5-20251001";

const SUMMARY_TOOL = {
  name: "record_call_summary",
  description: "Records a structured summary of a phone call transcript for a real estate agent's CRM.",
  input_schema: {
    type: "object" as const,
    properties: {
      bullets: {
        type: "array",
        items: { type: "string" },
        description: "2-5 short, factual bullet points capturing what was actually discussed on the call.",
      },
      next_steps: {
        type: "array",
        items: { type: "string" },
        description: "0-3 concrete follow-up actions mentioned or implied by the call. Empty array if none.",
      },
    },
    required: ["bullets", "next_steps"],
  },
};

export type CallSummary = { bullets: string[]; nextSteps: string[] };

// Quo shows its own AI-generated call summary card, but we don't get that
// text via webhook - only the raw transcript. Generate our own from the
// transcript so the CRM's call view can show the same "Call summary" +
// "Next steps" card without depending on Quo's UI.
export async function generateCallSummary(transcript: string): Promise<CallSummary | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || !transcript || transcript.trim().length < 10) return null;

  const client = new Anthropic({ apiKey });

  let response;
  try {
    response = await client.messages.create({
      model: MODEL,
      max_tokens: 512,
      tools: [SUMMARY_TOOL],
      tool_choice: { type: "tool", name: "record_call_summary" },
      messages: [
        {
          role: "user",
          content: `Summarize this real estate agent's phone call transcript for a CRM call log. Be concise and factual - only include what was actually said.

Transcript:
"""
${transcript}
"""`,
        },
      ],
    });
  } catch (err) {
    console.error("Call summary generation failed", err);
    return null;
  }

  const toolUse = response.content.find((block) => block.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") return null;

  const result = toolUse.input as { bullets: string[]; next_steps: string[] };
  if (!result.bullets?.length) return null;

  return { bullets: result.bullets, nextSteps: result.next_steps ?? [] };
}
