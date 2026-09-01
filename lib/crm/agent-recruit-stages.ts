import type { AgentRecruitStage } from "@/types/database";

// Pure data, no I/O - kept separate from lib/data/agent-recruits.ts (which
// imports the server-only Supabase client) so client components can
// import stage labels without pulling next/headers into the browser
// bundle.
export const AGENT_RECRUIT_STAGES: { value: AgentRecruitStage; label: string }[] = [
  { value: "introduced", label: "Introduced" },
  { value: "connected_with_lead", label: "Connected with team lead" },
  { value: "joined", label: "Joined the office" },
  { value: "fee_received", label: "Fee received" },
  { value: "not_moving_forward", label: "Not moving forward" },
];
