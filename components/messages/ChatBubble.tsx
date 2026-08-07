import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { Activity } from "@/types/database";

export function ChatBubble({ activity }: { activity: Activity }) {
  const outbound = activity.direction === "outbound";

  return (
    <div className={cn("flex", outbound ? "justify-end" : "justify-start")}>
      <div className={cn("max-w-[75%]", outbound ? "items-end" : "items-start")}>
        <div
          className={cn(
            "whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm",
            outbound ? "rounded-br-sm bg-brand-600 text-white" : "rounded-bl-sm bg-neutral-100 text-neutral-900",
          )}
        >
          {activity.body}
        </div>
        <p className={cn("mt-1 text-[11px] text-neutral-400", outbound ? "text-right" : "text-left")}>
          {format(new Date(activity.occurred_at), "MMM d, h:mm a")}
        </p>
      </div>
    </div>
  );
}
