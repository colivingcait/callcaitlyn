import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getEventsData } from "@/lib/data/events";
import { getEventsReport } from "@/lib/data/events-report";
import { getTextBlastsForEvent } from "@/app/(app)/contacts/text-blast-actions";
import { RosterView } from "@/components/events/RosterView";
import { CheckInLive } from "@/components/events/CheckInLive";
import { SendsTab } from "@/components/events/SendsTab";
import { InsightsTab } from "@/components/events/InsightsTab";
import { cn } from "@/lib/utils";

type Tab = "roster" | "sends" | "insights";

export default async function EventDetailPage({ params, searchParams }: { params: Promise<{ key: string }>; searchParams: Promise<{ tab?: string }> }) {
  const { key } = await params;
  const { tab } = await searchParams;
  const activeTab: Tab = tab === "sends" ? "sends" : tab === "insights" ? "insights" : "roster";

  const { events } = await getEventsData();
  const event = events.find((e) => e.key === decodeURIComponent(key));
  if (!event) notFound();

  const [eventsReport, blasts] = await Promise.all([
    activeTab === "insights" ? getEventsReport() : null,
    activeTab === "sends" ? getTextBlastsForEvent(event.label) : Promise.resolve([]),
  ]);

  const showRate = event.counts.registered > 0 ? Math.round((event.counts.attended / event.counts.registered) * 100) : null;
  const tabs: { key: Tab; label: string }[] = [
    { key: "roster", label: "Roster" },
    { key: "sends", label: "Sends" },
    { key: "insights", label: "Insights" },
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <Link href="/events" className="flex items-center gap-1 text-sm font-medium text-neutral-500 hover:text-neutral-700">
        <ChevronLeft size={16} /> Events
      </Link>
      <h1 className="mt-2 font-serif text-2xl font-semibold text-neutral-900">{event.label}</h1>
      <p className="mt-0.5 text-[15px] text-neutral-500">
        {event.counts.attended} of {event.counts.registered} checked in
        {event.counts.walkIn > 0 ? ` · ${event.counts.walkIn} walk-in${event.counts.walkIn === 1 ? "" : "s"}` : ""}
        {showRate !== null ? ` · ${showRate}% show rate` : ""}
      </p>

      <div className="mt-4 flex gap-1 border-b border-neutral-200">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={`/events/${encodeURIComponent(event.key)}?tab=${t.key}`}
            className={cn(
              "border-b-2 px-3 py-2.5 text-sm font-medium",
              activeTab === t.key ? "border-brand-600 text-brand-700" : "border-transparent text-neutral-500 hover:text-neutral-700",
            )}
          >
            {t.label}
          </Link>
        ))}
      </div>

      <div className="mt-4">
        {activeTab === "roster" &&
          (!event.hasEnded ? (
            <>
              <div className="md:hidden">
                <CheckInLive event={event} />
              </div>
              <div className="hidden md:block">
                <RosterView event={event} />
              </div>
            </>
          ) : (
            <RosterView event={event} />
          ))}
        {activeTab === "sends" && <SendsTab eventName={event.label} blasts={blasts} />}
        {activeTab === "insights" && eventsReport && (
          <InsightsTab report={eventsReport} thisEventShowRate={showRate} />
        )}
      </div>
    </div>
  );
}
