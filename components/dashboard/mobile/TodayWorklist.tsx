"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MessageSquareText, Phone, ChevronRight, X } from "lucide-react";
import Link from "next/link";
import { ListRow } from "@/components/mobile/ListRow";
import { SwipeActions } from "@/components/mobile/SwipeActions";
import { Toast } from "@/components/mobile/Toast";
import { useToast } from "@/lib/hooks/useToast";
import { openQuoCall } from "@/lib/quo/call-link";
import { clearFollowUp } from "@/app/(app)/today-actions";
import { cn } from "@/lib/utils";
import type { WorklistPerson } from "@/lib/data/today";

export type TodayChipKey = "late" | "dueToday" | "owed" | "neverTexted";

export function TodayWorklist({
  groups,
  drafts,
}: {
  groups: Record<TodayChipKey, WorklistPerson[]>;
  // Never-texted only: contact id -> the Dialer's own welcome/welcome-back
  // template text, prefilled into the message thread on tap instead of a
  // blank compose box - same template a new registration would get from
  // the Dialer, just reachable from Today too.
  drafts?: Record<string, string>;
}) {
  const router = useRouter();
  const { toast, showToast } = useToast();
  const [openRowId, setOpenRowId] = useState<string | null>(null);
  const [cleared, setCleared] = useState<Set<string>>(new Set());
  const chips: { key: TodayChipKey; label: string }[] = [
    { key: "late", label: `Late ${groups.late.length}` },
    { key: "dueToday", label: `Due today ${groups.dueToday.length}` },
    { key: "owed", label: `Owed a reply ${groups.owed.length}` },
    { key: "neverTexted", label: `Never texted ${groups.neverTexted.length}` },
  ];
  const firstNonEmpty = chips.find((c) => groups[c.key].length > 0)?.key ?? "late";
  const [active, setActive] = useState<TodayChipKey>(firstNonEmpty);

  // Late/due-today both come from today.calls - the only groups where "I
  // don't need to call this person" (clearing next_follow_up_at) applies.
  const isCallGroup = active === "late" || active === "dueToday";
  const people = groups[active].filter((p) => !cleared.has(p.id));

  async function handleClear(contactId: string) {
    const res = await clearFollowUp(contactId);
    if (!res.ok) {
      showToast("Couldn't clear that", "error");
      return;
    }
    setCleared((prev) => new Set(prev).add(contactId));
  }

  return (
    <div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {chips.map((chip) => (
          <button
            key={chip.key}
            type="button"
            onClick={() => setActive(chip.key)}
            className={cn(
              "h-11 shrink-0 whitespace-nowrap rounded-full px-3.5 text-[14px] font-medium",
              active === chip.key ? "bg-neutral-900 text-white" : "border border-neutral-200 text-neutral-600",
            )}
          >
            {chip.label}
          </button>
        ))}
      </div>

      <div className="mt-3 divide-y divide-neutral-100 rounded-[16px] border border-[#ebe9e7] bg-white">
        {people.length === 0 ? (
          <p className="px-4 py-6 text-center text-[15px] text-neutral-400">Nothing here.</p>
        ) : (
          people.map((person) => {
            const row = (
              <ListRow
                href={`/contacts/${person.id}`}
                avatar={{ firstName: person.name.split(" ")[0] || "?", lastName: person.name.split(" ").slice(1).join(" ") }}
                name={person.name}
                secondaryText={person.meta}
                secondaryTone={person.late ? "danger" : "default"}
                trailingAction={
                  person.phone
                    ? active === "late"
                      ? { icon: Phone, variant: "secondary", "aria-label": "Call", onClick: () => openQuoCall(person.phone!) }
                      : {
                          icon: MessageSquareText,
                          variant: "primary",
                          "aria-label": "Text",
                          onClick: () => {
                            const draft = drafts?.[person.id];
                            router.push(draft ? `/messages/${person.id}?draft=${encodeURIComponent(draft)}` : `/messages/${person.id}`);
                          },
                        }
                    : undefined
                }
              />
            );
            if (!isCallGroup) return <div key={person.id}>{row}</div>;
            return (
              <SwipeActions
                key={person.id}
                rowId={person.id}
                openRowId={openRowId}
                onOpenChange={setOpenRowId}
                actions={[{ icon: X, label: "Clear", bg: "#78716c", onClick: () => handleClear(person.id) }]}
              >
                {row}
              </SwipeActions>
            );
          })
        )}
      </div>

      {active === "neverTexted" && people.length > 0 && (
        <Link href="/dialer" className="mt-2 flex items-center justify-center gap-1 py-1 text-[14px] font-medium text-brand-600">
          Work through these one at a time in the Dialer <ChevronRight size={14} />
        </Link>
      )}
      <Toast toast={toast} />
    </div>
  );
}
