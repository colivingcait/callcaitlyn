import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Card } from "@/components/ui";
import { Phone, MessageSquare, Mail, StickyNote, Users, Home, ArrowRightCircle, CheckCircle2, Bot } from "lucide-react";
import type { Activity } from "@/types/database";

const ICONS: Record<string, typeof Phone> = {
  call: Phone,
  text: MessageSquare,
  email: Mail,
  note: StickyNote,
  meeting: Users,
  showing: Home,
  status_change: ArrowRightCircle,
  task_completed: CheckCircle2,
  system: Bot,
};

export function ActivityFeed({
  items,
}: {
  items: (Activity & { contacts: { first_name: string; last_name: string } | null })[];
}) {
  if (items.length === 0) {
    return <Card className="text-sm text-neutral-400">No activity yet. Calls, texts, and notes will show up here.</Card>;
  }

  return (
    <div className="space-y-2">
      {items.map((a) => {
        const Icon = ICONS[a.type] ?? StickyNote;
        const name = a.contacts ? `${a.contacts.first_name} ${a.contacts.last_name ?? ""}`.trim() : "Unknown contact";
        return (
          <Link key={a.id} href={`/contacts/${a.contact_id}`}>
            <Card className="flex items-start gap-3 py-3">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-500">
                <Icon size={15} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-neutral-900">{name}</p>
                {a.body && <p className="line-clamp-2 text-sm text-neutral-500">{a.body}</p>}
              </div>
              <span className="shrink-0 text-xs text-neutral-400">
                {formatDistanceToNow(new Date(a.occurred_at), { addSuffix: true })}
              </span>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
