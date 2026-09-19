"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, SkipForward } from "lucide-react";
import { sendTextToContact } from "@/app/(app)/contacts/actions";
import { applyMergeFields } from "@/lib/crm/merge-fields";
import { daysUntilEvent, eventRosterTextDraft } from "@/lib/crm/events-sot";
import { formatPhone } from "@/lib/utils";
import type { EventEntry } from "@/lib/data/events";

export function RosterTextAndNext({ event }: { event: EventEntry }) {
  const router = useRouter();
  const people = useMemo(
    () => event.people.filter((person) => person.registered || person.attended),
    [event.people],
  );
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [draft, setDraft] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [templateOpen, setTemplateOpen] = useState(false);

  const queue = people.filter((person) => !hiddenIds.has(person.contactId));
  const current = queue[0] ?? null;
  const total = people.length;
  const position = current ? total - queue.length + 1 : 0;
  const daysUntil = daysUntilEvent(event.startsAt, event.date);
  const template = eventRosterTextDraft(event.series, event.label, daysUntil);
  const body = draft ?? (current ? applyMergeFields(template, { first_name: current.firstName, last_name: current.lastName }) : "");

  function hide(id: string) {
    setHiddenIds((prev) => new Set(prev).add(id));
    setDraft(null);
    setError("");
  }

  async function sendAndNext() {
    if (!current?.phone || !body.trim()) return;
    setSending(true);
    setError("");
    const result = await sendTextToContact(current.contactId, current.phone, body.trim());
    setSending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    hide(current.contactId);
    router.refresh();
  }

  return (
    <section className="overflow-hidden rounded-[20px] border border-[#eadfd6] bg-white p-5 lg:p-7">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-[24px] font-semibold text-neutral-900">Text &amp; Next</h2>
        <button type="button" onClick={() => setTemplateOpen((v) => !v)} className="text-[14px] font-medium text-[#c45c4a]">
          Edit template
        </button>
      </div>
      {templateOpen && (
        <p className="mt-2 text-[13px] text-neutral-500">
          This walk uses the event template for {event.label}. Edit the box below for this person only.
        </p>
      )}
      {!current ? (
        <p className="mt-6 text-[15px] text-neutral-500">Roster walked. Everyone on this list has been sent or skipped.</p>
      ) : (
        <div className="mt-5">
          <p className="font-display text-[22px] font-semibold text-neutral-900">{current.name || "Unnamed"}</p>
          <p className="mt-1 text-[14px] text-neutral-500">{current.phone ? formatPhone(current.phone) : "No phone on file"}</p>
          <textarea
            key={current.contactId}
            value={body}
            onChange={(e) => setDraft(e.target.value)}
            rows={5}
            className="mt-4 min-h-[120px] w-full resize-none rounded-[14px] border border-[#eadfd6] bg-[#fffdfb] px-3.5 py-3 text-[14px] leading-6 text-neutral-800 outline-none focus:border-[#c45c4a]/50 focus:ring-2 focus:ring-[#c45c4a]/15"
          />
          {error && <p className="mt-2 text-[13px] text-red-600">{error}</p>}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void sendAndNext()}
              disabled={!current.phone || sending || !body.trim()}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#c45c4a] px-4 text-[14px] font-semibold text-white disabled:opacity-50"
            >
              Send &amp; next <ArrowRight size={16} />
            </button>
            <button
              type="button"
              onClick={() => current && hide(current.contactId)}
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-[#eadfd6] bg-white px-4 text-[14px] font-semibold text-neutral-800"
            >
              <SkipForward size={16} /> Skip
            </button>
            <span className="ml-auto text-[13px] font-medium text-[#c45c4a]">
              {position} of {total}
            </span>
          </div>
          <div className="mt-3 h-1 overflow-hidden rounded-full bg-[#f3e4dc]">
            <div className="h-full bg-[#c45c4a]" style={{ width: `${total ? (position / total) * 100 : 0}%` }} />
          </div>
        </div>
      )}
    </section>
  );
}
