import { format } from "date-fns";
import { Phone, PhoneIncoming, PhoneOutgoing, PlayCircle } from "lucide-react";
import type { Activity } from "@/types/database";

function asString(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v : null;
}

export function CallLogEntry({ activity }: { activity: Activity }) {
  const Icon = activity.direction === "inbound" ? PhoneIncoming : activity.direction === "outbound" ? PhoneOutgoing : Phone;
  const recordingUrl = asString(activity.metadata?.recording_url);
  const transcript = asString(activity.metadata?.transcript);

  return (
    <div className="flex flex-col items-center gap-1 py-2">
      <div className="flex items-center gap-2 rounded-full bg-neutral-100 px-3.5 py-1.5 text-xs text-neutral-600">
        <Icon size={13} className="text-neutral-400" />
        <span>{activity.body ?? "Call"}</span>
        <span className="text-neutral-400">· {format(new Date(activity.occurred_at), "h:mm a")}</span>
      </div>
      <div className="flex gap-3">
        {recordingUrl && (
          <a
            href={recordingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium text-brand-600"
          >
            <PlayCircle size={12} /> Play
          </a>
        )}
        {transcript && (
          <details>
            <summary className="cursor-pointer text-xs font-medium text-brand-600">Transcript</summary>
            <p className="mt-1 max-w-xs whitespace-pre-wrap rounded-xl bg-neutral-50 p-2.5 text-left text-xs text-neutral-600">
              {transcript}
            </p>
          </details>
        )}
      </div>
    </div>
  );
}
