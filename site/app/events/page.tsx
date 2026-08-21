import type { Metadata } from "next";
import { ArrowUpRight, Calendar } from "lucide-react";
import { Card } from "@/components/ui";

export const metadata: Metadata = {
  title: "Events",
  description: "Recurring meetups across House Hacking ATL and Atlanta Women Investors.",
};

const RECURRING_EVENTS = [
  {
    name: "Atlanta Women Investors",
    cadence: "4th Tuesday of every month, 6–9pm",
    url: "https://www.atlantawomeninvestors.com",
  },
];

export default function EventsPage() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <p className="text-sm font-medium uppercase tracking-wide text-brand-600">Events</p>
      <h1 className="mt-3 font-serif text-3xl font-semibold text-neutral-900 sm:text-4xl">
        Where to find me in person
      </h1>
      <p className="mt-5 text-lg text-neutral-600">
        Real questions, real numbers, no sales pitch — an overview of the recurring meetups. Each site
        below has the exact dates, location, and RSVP link for its next one.
      </p>

      <div className="mt-10 space-y-4">
        {RECURRING_EVENTS.map((event) => (
          <Card key={event.url} className="flex items-center justify-between gap-4 p-6">
            <div>
              <div className="flex items-center gap-2 text-brand-600">
                <Calendar size={18} />
                <h2 className="font-serif text-lg font-semibold text-neutral-900">{event.name}</h2>
              </div>
              <p className="mt-1 text-sm text-neutral-500">{event.cadence}</p>
            </div>
            <a
              href={event.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-brand-600 hover:underline"
            >
              Details
              <ArrowUpRight size={15} />
            </a>
          </Card>
        ))}

        <Card className="p-6">
          <div className="flex items-center gap-2 text-brand-600">
            <Calendar size={18} />
            <h2 className="font-serif text-lg font-semibold text-neutral-900">House Hacking ATL</h2>
          </div>
          <p className="mt-1 text-sm text-neutral-500">
            Occasional in-person meetups on house hacking your first property — see the site for the next
            scheduled date.
          </p>
          <a
            href="https://househackingatl.com"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:underline"
          >
            Details
            <ArrowUpRight size={15} />
          </a>
        </Card>
      </div>
    </section>
  );
}
