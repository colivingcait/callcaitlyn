import type { ListingAgentState } from "@/types/database";

export const AGENT_STATE_LABEL: Record<ListingAgentState, string> = {
  not_contacted: "Not contacted",
  emailed: "Emailed",
  texted: "Texted",
  replied: "Replied",
  opted_out: "Opted out",
};

export const AGENT_STATE_COLORS: Record<ListingAgentState, { bg: string; text: string }> = {
  not_contacted: { bg: "#ffffff", text: "#78716c" },
  emailed: { bg: "#f5f5f4", text: "#57534e" },
  texted: { bg: "#f5f5f4", text: "#57534e" },
  replied: { bg: "#ecfdf5", text: "#047857" },
  opted_out: { bg: "#fffbeb", text: "#b45309" },
};
