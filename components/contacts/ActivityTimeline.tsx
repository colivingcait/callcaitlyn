import { format } from "date-fns";
import {
  Phone,
  MessageSquare,
  Mail,
  StickyNote,
  Users,
  Home,
  ArrowRightCircle,
  CheckCircle2,
  Bot,
  ArrowDownLeft,
  ArrowUpRight,
  PlayCircle,
} from "lucide-react";
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

const SOURCE_LABELS: Record<string, string> = {
  manual: "",
  quo: "Quo",
  gmail: "Gmail",
  calendly: "Calendly",
  eventbrite: "Eventbrite",
  jotform: "Jotform",
  ai: "AI",
  system: "System",
};

function asString(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v : null;
}

export function ActivityTimeline({ activities }: { activities: Activity[] }) {
  if (activities.length === 0) {
    return <p className="py-6 text-center text-sm text-neutral-400">No activity logged yet.</p>;
  }

  return (
    <ol className="space-y-4">
      {activities.map((a) => {
        const Icon = ICONS[a.type] ?? StickyNote;
        const sourceLabel = SOURCE_LABELS[a.source];
        const recordingUrl = asString(a.metadata?.recording_url);
        const transcript = asString(a.metadata?.transcript);

        return (
          <li key={a.id} className="flex gap-3">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-500">
              <Icon size={15} />
            </div>
            <div className="min-w-0 flex-1 border-b border-neutral-100 pb-4">
              <div className="flex items-center gap-1.5 text-xs text-neutral-400">
                <span>{format(new Date(a.occurred_at), "MMM d, yyyy · h:mm a")}</span>
                {a.direction === "inbound" && <ArrowDownLeft size={12} />}
                {a.direction === "outbound" && <ArrowUpRight size={12} />}
                {sourceLabel && (
                  <span className="rounded-full bg-neutral-100 px-1.5 py-0.5 font-medium">{sourceLabel}</span>
                )}
              </div>
              {a.body && <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-700">{a.body}</p>}

              {recordingUrl && (
                <a
                  href={recordingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:text-brand-700"
                >
                  <PlayCircle size={14} /> Play recording
                </a>
              )}

              {transcript && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs font-medium text-brand-600 hover:text-brand-700">
                    View transcript
                  </summary>
                  <p className="mt-2 whitespace-pre-wrap rounded-xl bg-neutral-50 p-3 text-xs text-neutral-600">
                    {transcript}
                  </p>
                </details>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
