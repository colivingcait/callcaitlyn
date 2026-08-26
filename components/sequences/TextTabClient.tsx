"use client";

import { useState } from "react";
import { MessageSquareText } from "lucide-react";
import { Button, Select, Card } from "@/components/ui";
import { TextBlastModal } from "@/components/contacts/TextBlastModal";
import { estimatedTextBlastMinutes } from "@/lib/crm/text-blast-timing";
import type { TextBlastWithProgress } from "@/app/(app)/contacts/text-blast-actions";

export function TextTabClient({
  eventNames,
  blasts,
  initialComposeEvent,
}: {
  eventNames: string[];
  blasts: TextBlastWithProgress[];
  initialComposeEvent: string | null;
}) {
  const [composeEvent, setComposeEvent] = useState<string | null>(initialComposeEvent);
  const [selectedEvent, setSelectedEvent] = useState(eventNames[0] ?? "");

  return (
    <div className="space-y-5">
      <Card className="space-y-3">
        <p className="text-sm font-medium text-neutral-800">Send a text reminder</p>
        {eventNames.length === 0 ? (
          <p className="text-sm text-neutral-500">No one has registered for an event yet.</p>
        ) : (
          <div className="flex gap-2">
            <Select className="min-w-0 flex-1" value={selectedEvent} onChange={(e) => setSelectedEvent(e.target.value)}>
              {eventNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </Select>
            <Button onClick={() => setComposeEvent(selectedEvent)} className="shrink-0" disabled={!selectedEvent}>
              <MessageSquareText size={15} /> Compose
            </Button>
          </div>
        )}
      </Card>

      <div className="space-y-2">
        <p className="text-sm font-semibold text-neutral-700">All past sends</p>
        {blasts.length === 0 ? (
          <p className="text-sm text-neutral-500">No text blasts sent yet.</p>
        ) : (
          <div className="space-y-2">
            {blasts.map((b) => (
              <button key={b.id} onClick={() => setComposeEvent(b.event_name)} className="block w-full text-left">
                <Card className="space-y-1.5 hover:border-brand-200">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium text-neutral-900">{b.event_name}</p>
                    <span className="shrink-0 text-xs text-neutral-400">
                      {b.status === "sending" && `Sending: ${b.sent}/${b.total}`}
                      {b.status === "completed" && `Completed: ${b.sent}/${b.total}`}
                      {b.status === "canceled" && `Canceled: ${b.sent}/${b.total}`}
                    </span>
                  </div>
                  <p className="truncate text-xs text-neutral-400">&ldquo;{b.message}&rdquo;</p>
                  {b.status === "sending" && b.pending > 0 && (
                    <p className="text-xs text-neutral-400">About {estimatedTextBlastMinutes(b.pending)} min left</p>
                  )}
                </Card>
              </button>
            ))}
          </div>
        )}
      </div>

      {composeEvent && <TextBlastModal eventName={composeEvent} onClose={() => setComposeEvent(null)} />}
    </div>
  );
}
