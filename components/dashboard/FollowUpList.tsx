import Link from "next/link";
import { isPast } from "date-fns";
import { fullName, formatPhone } from "@/lib/utils";
import { formatLocal, isTodayLocal } from "@/lib/format-time";
import { Card } from "@/components/ui";
import { CalendarClock } from "lucide-react";

type FollowUp = {
  id: string;
  first_name: string;
  last_name?: string | null;
  phone?: string | null;
  next_follow_up_at?: string | null;
};

export function FollowUpList({ items }: { items: FollowUp[] }) {
  if (items.length === 0) {
    return (
      <Card className="text-sm text-neutral-400">No follow-ups scheduled. Add a next-follow-up date on a contact to see it here.</Card>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((c) => {
        const due = c.next_follow_up_at ? new Date(c.next_follow_up_at) : null;
        const today = c.next_follow_up_at ? isTodayLocal(c.next_follow_up_at) : false;
        const overdue = due ? isPast(due) && !today : false;

        return (
          <Link key={c.id} href={`/contacts/${c.id}`}>
            <Card className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="truncate font-medium text-neutral-900">{fullName(c)}</p>
                {c.phone && <p className="truncate text-xs text-neutral-400">{formatPhone(c.phone)}</p>}
              </div>
              <div
                className={
                  "flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium " +
                  (overdue ? "bg-red-50 text-red-700" : today ? "bg-amber-50 text-amber-700" : "bg-neutral-100 text-neutral-500")
                }
              >
                <CalendarClock size={13} />
                {overdue ? "Overdue" : today ? "Today" : due && formatLocal(due, "MMM d")}
              </div>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
