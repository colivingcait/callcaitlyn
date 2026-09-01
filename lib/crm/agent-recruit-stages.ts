import type { RecruitStage } from "@/types/database";

// Pure data, no I/O - kept separate from lib/data/agent-recruits.ts (which
// imports the server-only Supabase client) so client components can
// import stage labels without pulling next/headers into the browser
// bundle. null represents the top of funnel ("Introduced") -
// contacts.recruit_stage stores null rather than a literal "introduced"
// value, since that's every agent-type contact's default state.
export const AGENT_RECRUIT_STAGES: { value: RecruitStage | null; label: string }[] = [
  { value: null, label: "Introduced" },
  { value: "connected_with_lead", label: "Connected with team lead" },
  { value: "joined", label: "Joined the office" },
  { value: "fee_received", label: "Fee received" },
  { value: "not_moving_forward", label: "Not moving forward" },
];

export function recruitStageKey(stage: RecruitStage | null): string {
  return stage ?? "introduced";
}
