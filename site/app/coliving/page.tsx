import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Users2, Home } from "lucide-react";
import { Card } from "@/components/ui";
import { Eyebrow } from "@/components/blocks";

export const metadata: Metadata = {
  title: "Coliving",
  description: "A growing portfolio of coliving homes across metro Atlanta, plus a community for women building their own.",
};

const FEATURES = [
  {
    icon: Home,
    title: "Coliving Conversions",
    body: "Properties with coliving conversion potential — room count, layout, parking, and the hidden spaces most people walk right past.",
  },
  {
    icon: Users2,
    title: "Occupied Coliving Properties",
    body: "Already-operating coliving homes come with unique complexities. I help you navigate occupied transactions so nothing falls through the cracks.",
  },
];

export default function ColivingPage() {
  return (
    <>
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <Eyebrow>Coliving</Eyebrow>
        <h1 className="mt-4 font-serif text-3xl font-semibold text-neutral-900 sm:text-4xl">
          A portfolio built one <span className="italic text-brand-500">room at a time.</span>
        </h1>
        <p className="mt-5 text-lg text-neutral-600">
          CoLivingCait is my own portfolio of coliving homes across metro Atlanta — sourced, renovated,
          furnished, and operated in-house. Beyond running it myself, I coach women building their own
          portfolios, and co-founded <strong>She Leads Coliving</strong> and the annual{" "}
          <strong>Women&apos;s Coliving Summit</strong> — a community that started as a Facebook group and grew
          into women at every stage of the investing journey sharing deals, resources, and hard-won lessons
          with each other.
        </p>
      </section>

      <section className="border-y border-neutral-200/70 bg-cream">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="font-serif text-2xl font-semibold text-neutral-900">
            If you&apos;re buying with coliving in mind
          </h2>
          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <Card key={title} className="p-6">
                <Icon size={22} className="text-brand-500" />
                <h3 className="mt-3 font-serif text-lg font-semibold text-neutral-900">{title}</h3>
                <p className="mt-2 text-sm text-neutral-600">{body}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
        <h2 className="font-serif text-2xl font-semibold text-neutral-900">
          Want the full story — courses, guides, and my own portfolio?
        </h2>
        <a
          href="https://www.colivingcait.com"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-1.5 font-medium text-brand-600 hover:underline"
        >
          Visit CoLivingCait
          <ArrowUpRight size={16} />
        </a>
        <div className="mt-8">
          <Link
            href="/work-with-me"
            className="inline-flex items-center gap-2 rounded-md bg-ink px-5 py-3 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-neutral-800"
          >
            Find a Coliving Property
            <ArrowRight size={15} />
          </Link>
        </div>
      </section>
    </>
  );
}
