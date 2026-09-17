import type { WorklistPerson } from "@/lib/data/today";

// Shared by desktop (app/(app)/page.tsx) and mobile (TodayMobile) so Up
// next's priority rule can't drift between the two: overdue > due today >
// owed a reply. "Never texted" used to be a 4th tier here (the Dialer's
// registration queue) - New Leads now handles that as its own top-of-page
// stack, with its own priority ordering, rather than feeding into Up Next.
export function pickUpNext(groups: {
  late: WorklistPerson[];
  dueToday: WorklistPerson[];
  owed: WorklistPerson[];
}): { item: (WorklistPerson & { source: "call" | "reply" }) | null; reason: string } {
  if (groups.late[0]) return { item: { ...groups.late[0], source: "call" }, reason: groups.late[0].meta };
  if (groups.dueToday[0]) return { item: { ...groups.dueToday[0], source: "call" }, reason: "Due today" };
  if (groups.owed[0]) return { item: { ...groups.owed[0], source: "reply" }, reason: "Owed a reply" };
  return { item: null, reason: "" };
}

// Today's headline count: distinct people across every queue the chip row
// exposes on that platform, not a sum of queue lengths - previously a
// person due a call who also owed a reply counted (and appeared) twice,
// while never-texted was in the list but missing from the count.
export function countDistinctPeople(...idLists: (string | null | undefined)[][]): number {
  const ids = new Set<string>();
  for (const list of idLists) {
    for (const id of list) {
      if (id) ids.add(id);
    }
  }
  return ids.size;
}
