// Shared between the composer (AgentComposer) and the read-only copy
// block (CopyBlocks) so the "just listed" wording only lives in one
// place. Signature is hardcoded rather than a settings field - same
// convention lib/crm/event-text-templates.ts already uses for her name.
export const AGENT_SIGNATURE = "Caitlyn Verdugo with KW Metro Atl";

export type AgentTemplate = { label: string; subject: string; body: string };

// A Zillow link is how she prefers to be texted herself - tap through,
// see the photos, done - so every template that mentions the property
// carries it too, when the listing has one on file.
function zillowLine(zillowUrl: string | null): string {
  return zillowUrl ? `\n\nTake a look: ${zillowUrl}` : "";
}

export function buildAgentTemplates(address: string, priceLabel: string | null, zillowUrl: string | null): AgentTemplate[] {
  const price = priceLabel ? `${priceLabel}, ` : "";
  const zillow = zillowLine(zillowUrl);

  return [
    {
      label: "Just listed",
      subject: `New listing: ${address}`,
      body: `Hi {{agent_first_name}}! This is ${AGENT_SIGNATURE}. Your buyer showed up on reverse prospecting for my new listing at ${address} (${price}just listed!). Do you think this is something they'd be interested in? If you're not sure which buyer it's for, let me know and I can send the FMLS reference #.${zillow}`,
    },
    {
      label: "Price improvement",
      subject: `Price improvement: ${address}`,
      body: `Hi {{agent_first_name}}! This is ${AGENT_SIGNATURE}. Wanted to flag a price improvement on ${address}${price ? `, now ${price.replace(/, $/, "")}` : ""}. Let me know if your buyer wants another look.${zillow}`,
    },
    {
      label: "Open house",
      subject: `Open house: ${address}`,
      body: `Hi {{agent_first_name}}! This is ${AGENT_SIGNATURE}. I'm holding an open house at ${address} this weekend. Let me know if your buyer would like a personal showing instead.${zillow}`,
    },
  ];
}
