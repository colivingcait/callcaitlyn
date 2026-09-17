import Link from "next/link";
import { Badge } from "@/components/ui";
import { RepresentingBadge } from "@/components/contacts/RepresentingBadge";
import { LikelihoodBadge } from "@/components/contacts/LikelihoodBadge";
import { FollowUpBar } from "@/components/contacts/FollowUpBar";
import { ContextQuickActions } from "@/components/messages/ContextQuickActions";
import { computeLikelihood } from "@/lib/crm/likelihood";
import { formatLocal, relativeTime } from "@/lib/format-time";
import { formatPhone, fullName, TIMELINE_LABELS } from "@/lib/utils";
import { PAPER_CARD } from "@/lib/ui/paper";
import { cn } from "@/lib/utils";
import type { Activity, ContactWithRelations, PipelineStage, Task } from "@/types/database";
import type { ContactEventEntry } from "@/lib/data/contact-events";

function lastTouchLabel(activity: Activity | undefined) {
  if (!activity) return "No calls or texts yet";
  const verb = activity.type === "call" ? "Called" : activity.direction === "outbound" ? "You texted" : "They texted";
  return `${verb} ${relativeTime(activity.occurred_at)}`;
}

export function ContactContextSidebar({
  contact,
  stages,
  lastActivity,
  openTasks,
  events,
}: {
  contact: ContactWithRelations;
  stages: PipelineStage[];
  lastActivity?: Activity;
  openTasks: Task[];
  events: ContactEventEntry[];
}) {
  const stage = contact.pipeline_stages;
  const likelihood = computeLikelihood(contact, stages);
  const notes = contact.notes?.trim() ?? "";
  const recentEvents = events.slice(0, 4);
  const moreEvents = events.length - recentEvents.length;

  return (
    <aside className="hidden h-full min-h-0 w-[300px] shrink-0 flex-col overflow-y-auto border-l border-[#eadfd6] bg-[#f7f1ea] p-4 lg:flex">
      <div className={cn("p-4", PAPER_CARD)}>
        <p className="font-display text-[22px] font-semibold leading-tight tracking-[-0.02em] text-neutral-900">{fullName(contact)}</p>
        <p className="mt-1 truncate text-[13px] text-neutral-500">{formatPhone(contact.phone) || contact.email || "No contact info"}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {stage && (
            <Badge className="max-w-[10rem] truncate px-2 py-0.5 text-[11px]" color={stage.color}>
              {stage.name}
            </Badge>
          )}
          <RepresentingBadge representing={contact.representing} />
          <LikelihoodBadge likelihood={likelihood} />
          {contact.timeline && contact.timeline !== "unknown" && (
            <span className="rounded-full bg-[#f3e4dc] px-2 py-0.5 text-[11px] text-neutral-600">{TIMELINE_LABELS[contact.timeline]}</span>
          )}
        </div>
        <p className="mt-3 text-[13px] text-neutral-500">{lastTouchLabel(lastActivity)}</p>
        <div className="mt-4">
          <ContextQuickActions contactId={contact.id} phone={contact.phone} email={contact.email} />
        </div>
        <Link href={`/contacts/${contact.id}`} className="mt-3 block text-center text-[13px] font-semibold text-[#c45c4a]">
          Open record
        </Link>
      </div>

      <div className="mt-3">
        <FollowUpBar contactId={contact.id} nextFollowUpAt={contact.next_follow_up_at} />
      </div>

      <section className={cn("mt-3 p-4", PAPER_CARD)}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7a5c50]">Notes</p>
        {notes ? (
          <p className="mt-2 whitespace-pre-wrap text-[13px] leading-5 text-neutral-700">{notes.length > 320 ? `${notes.slice(0, 320)}…` : notes}</p>
        ) : (
          <p className="mt-2 text-[13px] text-neutral-400">No notes yet.</p>
        )}
      </section>

      <section className={cn("mt-3 p-4", PAPER_CARD)}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7a5c50]">Meetups</p>
        {recentEvents.length === 0 ? (
          <p className="mt-2 text-[13px] text-neutral-400">No registrations or check-ins.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {recentEvents.map((e) => (
              <li key={e.key} className="min-w-0">
                <p className="truncate text-[13px] font-medium text-neutral-800">{e.label}</p>
                <p className="text-[12px] text-neutral-400">
                  {formatLocal(e.date, "MMM d")} · {e.attended ? "Attended" : e.registered ? "Registered" : "—"}
                </p>
              </li>
            ))}
          </ul>
        )}
        {moreEvents > 0 && (
          <Link href={`/contacts/${contact.id}`} className="mt-2 inline-block text-[12px] font-semibold text-[#c45c4a]">
            {moreEvents} more on their record
          </Link>
        )}
      </section>

      <section className={cn("mt-3 p-4", PAPER_CARD)}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7a5c50]">Open tasks</p>
        {openTasks.length === 0 ? (
          <p className="mt-2 text-[13px] text-neutral-400">Nothing open.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {openTasks.slice(0, 4).map((task) => (
              <li key={task.id} className="text-[13px] text-neutral-800">
                <p className="truncate font-medium">{task.title}</p>
                {task.due_at && <p className="text-[12px] text-neutral-400">Due {formatLocal(task.due_at, "MMM d")}</p>}
              </li>
            ))}
          </ul>
        )}
        {openTasks.length > 4 && (
          <Link href={`/contacts/${contact.id}`} className="mt-2 inline-block text-[12px] font-semibold text-[#c45c4a]">
            {openTasks.length - 4} more
          </Link>
        )}
      </section>
    </aside>
  );
}
