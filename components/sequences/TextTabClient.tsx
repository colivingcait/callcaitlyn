"use client";

import { useState } from "react";
import { MessageSquareText, Tag as TagIcon } from "lucide-react";
import { Button, Select, Card } from "@/components/ui";
import { TextBlastModal } from "@/components/contacts/TextBlastModal";
import { estimatedTextBlastMinutes } from "@/lib/crm/text-blast-timing";
import type { TextBlastWithProgress, BlastTarget } from "@/app/(app)/contacts/text-blast-actions";
import type { Tag } from "@/types/database";

export function TextTabClient({
  eventNames,
  tags,
  blasts,
  initialComposeEvent,
}: {
  eventNames: string[];
  tags: Tag[];
  blasts: TextBlastWithProgress[];
  initialComposeEvent: string | null;
}) {
  const [composeTarget, setComposeTarget] = useState<BlastTarget | null>(initialComposeEvent ? { kind: "event", eventName: initialComposeEvent } : null);
  const [selectedEvent, setSelectedEvent] = useState(eventNames[0] ?? "");
  const [selectedTagId, setSelectedTagId] = useState(tags[0]?.id ?? "");

  const tagById = new Map(tags.map((t) => [t.id, t]));

  function reopenPastBlast(b: TextBlastWithProgress) {
    if (b.tag_id) {
      const tagName = tagById.get(b.tag_id)?.name ?? b.event_name.replace(/^Tag: /, "");
      setComposeTarget({ kind: "tag", tagId: b.tag_id, tagName });
    } else {
      setComposeTarget({ kind: "event", eventName: b.event_name });
    }
  }

  return (
    <div className="space-y-5">
      <Card className="space-y-3">
        <p className="text-sm font-medium text-neutral-800">Send to everyone registered for an event</p>
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
            <Button onClick={() => setComposeTarget({ kind: "event", eventName: selectedEvent })} className="shrink-0" disabled={!selectedEvent}>
              <MessageSquareText size={15} /> Compose
            </Button>
          </div>
        )}
      </Card>

      <Card className="space-y-3">
        <p className="text-sm font-medium text-neutral-800">Send to everyone with a tag</p>
        {tags.length === 0 ? (
          <p className="text-sm text-neutral-500">No tags yet - add one in Settings or on a contact first.</p>
        ) : (
          <div className="flex gap-2">
            <Select className="min-w-0 flex-1" value={selectedTagId} onChange={(e) => setSelectedTagId(e.target.value)}>
              {tags.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
            <Button
              onClick={() => {
                const tag = tagById.get(selectedTagId);
                if (tag) setComposeTarget({ kind: "tag", tagId: tag.id, tagName: tag.name });
              }}
              className="shrink-0"
              disabled={!selectedTagId}
            >
              <TagIcon size={15} /> Compose
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
              <button key={b.id} onClick={() => reopenPastBlast(b)} className="block w-full text-left">
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

      {composeTarget && <TextBlastModal target={composeTarget} onClose={() => setComposeTarget(null)} />}
    </div>
  );
}
