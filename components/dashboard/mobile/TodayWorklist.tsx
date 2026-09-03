"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MessageSquareText, Phone } from "lucide-react";
import { ListRow } from "@/components/mobile/ListRow";
import { sendTextToContact } from "@/app/(app)/contacts/actions";
import { openQuoCall } from "@/lib/quo/call-link";
import { useToast } from "@/lib/hooks/useToast";
import { Toast } from "@/components/mobile/Toast";
import { cn } from "@/lib/utils";
import type { WorklistPerson } from "@/lib/data/today";

export type TodayChipKey = "late" | "dueToday" | "owed" | "neverTexted";

export function TodayWorklist({ groups }: { groups: Record<TodayChipKey, WorklistPerson[]> }) {
  const router = useRouter();
  const { toast, showToast } = useToast();
  const chips: { key: TodayChipKey; label: string }[] = [
    { key: "late", label: `Late ${groups.late.length}` },
    { key: "dueToday", label: `Due today ${groups.dueToday.length}` },
    { key: "owed", label: `Owed a reply ${groups.owed.length}` },
    { key: "neverTexted", label: `Never texted ${groups.neverTexted.length}` },
  ];
  const firstNonEmpty = chips.find((c) => groups[c.key].length > 0)?.key ?? "late";
  const [active, setActive] = useState<TodayChipKey>(firstNonEmpty);

  async function quickText(person: WorklistPerson) {
    if (!person.phone) return;
    const res = await sendTextToContact(person.id, person.phone, `Hi ${person.name.split(" ")[0]}, just following up!`);
    if (!res.ok) showToast("Couldn't send that text", "error");
    else router.refresh();
  }

  const people = groups[active];

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
          people.map((person) => (
            <ListRow
              key={person.id}
              href={`/contacts/${person.id}`}
              avatar={{ firstName: person.name.split(" ")[0] || "?", lastName: person.name.split(" ").slice(1).join(" ") }}
              name={person.name}
              secondaryText={person.meta}
              secondaryTone={person.late ? "danger" : "default"}
              trailingAction={
                person.phone
                  ? active === "late"
                    ? { icon: Phone, variant: "secondary", "aria-label": "Call", onClick: () => openQuoCall(person.phone!) }
                    : { icon: MessageSquareText, variant: "primary", "aria-label": "Text", onClick: () => quickText(person) }
                  : undefined
              }
            />
          ))
        )}
      </div>
      <Toast toast={toast} />
    </div>
  );
}
