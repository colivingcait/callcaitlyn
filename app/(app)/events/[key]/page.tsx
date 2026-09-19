import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getEventsData } from "@/lib/data/events";
import { getEventsReport } from "@/lib/data/events-report";
import { getLastActivityLabels } from "@/lib/data/contacts";
import { getTextBlastsForEvent } from "@/app/(app)/contacts/text-blast-actions";
import { RosterView } from "@/components/events/RosterView";
import { CheckInLive } from "@/components/events/CheckInLive";
import { SendsTab } from "@/components/events/SendsTab";
import { InsightsTab } from "@/components/events/InsightsTab";
import { EventCadencePanel } from "@/components/events/EventCadencePanel";
import { cn } from "@/lib/utils";

type Tab = "roster" | "cadence" | "sends" | "insights";

export default async function EventDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ key: string }>;
  searchParams: Promise<{ tab?: string; textNext?: string }>;
}) {
  const { key } = await params;
  const { tab, textNext } = await searchParams;
  const activeTab: Tab = tab === "sends" ? "sends" : tab === "insights" ? "insights" : tab === "cadence" ? "cadence" : "roster";
  const startTextNext = textNext === "1" || textNext === "true";

  const { events } = await getEventsData();
  const event = events.find((e) => e.key === decodeURIComponent(key));
  if (!event) notFound();

  const [eventsReport, blasts, lastActivityLabels] = await Promise.all([
    activeTab === "insights" ? getEventsReport() : null,
    activeTab === "sends" ? getTextBlastsForEvent(event.label) : Promise.resolve([]),
    getLastActivityLabels(event.people.map((person) => person.contactId)),
  ]);

  const showRate = event.hasEnded && event.counts.registered > 0 ? Math.round((event.counts.attended / event.counts.registered) * 100) : null;
  const tabs: { key: Tab; label: string }[] = [
    { key: "roster", label: "Roster" },
    { key: "cadence", label: "Cadence" },
    { key: "sends", label: "Sends" },
    { key: "insights", label: "Insights" },
  ];

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-6 lg:px-8 lg:py-8">
      <Link href="/events" className="flex items-center gap-1 text-sm font-medium text-neutral-500 hover:text-neutral-700">
        <ChevronLeft size={16} /> Events
      </Link>

      {activeTab !== "roster" && (
        <>
          <h1 className="mt-2 font-display text-[32px] font-semibold tracking-[-0.03em] text-neutral-900">
            {activeTab === "cadence" ? "Cadence" : event.label}
          </h1>
          <p className="mt-0.5 text-[15px] text-neutral-500">
            {event.hasEnded ? (
              <>
                {event.counts.attended} of {event.counts.registered} checked in
                {event.counts.walkIn > 0 ? ` · ${event.counts.walkIn} walk-in${event.counts.walkIn === 1 ? "" : "s"}` : ""}
                {showRate !== null ? ` · ${showRate}% show rate` : ""}
              </>
            ) : (
              <>
                {event.counts.registered} registered
                {event.counts.attended > 0 ? ` · ${event.counts.attended} already checked in` : ""}
              </>
            )}
          </p>
        </>
      )}

      <div className={cn("flex gap-1 border-b border-neutral-200", activeTab === "roster" ? "mt-4" : "mt-4")}>
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={`/events/${encodeURIComponent(event.key)}?tab=${t.key}`}
            className={cn(
              "border-b-2 px-3 py-2.5 text-sm font-medium",
              activeTab === t.key ? "border-[#c45c4a] text-[#c45c4a]" : "border-transparent text-neutral-500 hover:text-neutral-700",
            )}
          >
            {t.label}
          </Link>
        ))}
      </div>

      <div className="mt-4">
        {activeTab === "roster" && (
          <>
            {!event.hasEnded && (
              <div className="mb-5 lg:hidden">
                <CheckInLive event={event} />
              </div>
            )}
            <RosterView event={event} lastActivityLabels={Object.fromEntries(lastActivityLabels)} startTextNext={startTextNext} />
          </>
        )}
        {activeTab === "cadence" && <EventCadencePanel event={event} />}
        {activeTab === "sends" && <SendsTab eventName={event.label} blasts={blasts} />}
        {activeTab === "insights" && eventsReport && <InsightsTab report={eventsReport} thisEventShowRate={showRate} />}
      </div>
    </div>
  );
}
