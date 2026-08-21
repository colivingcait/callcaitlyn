import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Home, Users, Calculator } from "lucide-react";
import { Card } from "@/components/ui";
import { Eyebrow } from "@/components/blocks";

export const metadata: Metadata = {
  title: "House Hacking",
  description: "What house hacking is, how it works, and how to figure out if it fits your budget.",
};

const STEPS = [
  {
    icon: Home,
    title: "Buy a property with room to spare",
    body: "A duplex/triplex/fourplex, or a single-family home with a basement, ADU, or extra bedrooms.",
  },
  {
    icon: Users,
    title: "Rent out what you're not using",
    body: "Long-term tenants, roommates, or a short-term rental — whatever fits the property and your comfort level.",
  },
  {
    icon: Calculator,
    title: "Let that rent offset your mortgage",
    body: "Many house hackers cut their housing cost to a fraction of market rent — some cover it entirely.",
  },
];

export default function HouseHackingPage() {
  return (
    <>
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <Eyebrow>House Hacking</Eyebrow>
        <h1 className="mt-4 font-serif text-3xl font-semibold text-neutral-900 sm:text-4xl">
          Buy a home. Let it <span className="italic text-brand-500">pay for itself.</span>
        </h1>
        <p className="mt-5 text-lg text-neutral-600">
          House hacking is buying a property, living in part of it, and renting out the rest — using
          owner-occupant financing (often with a much smaller down payment than a straight investment
          purchase) to get into your first property and your first rental at the same time. It&apos;s the
          smartest first move most investors can make.
        </p>
      </section>

      <section className="border-y border-neutral-200/70 bg-cream">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="font-serif text-2xl font-semibold text-neutral-900">How it works</h2>
          <div className="mt-8 grid gap-5 sm:grid-cols-3">
            {STEPS.map(({ icon: Icon, title, body }, i) => (
              <Card key={title} className="p-6">
                <div className="text-xs font-semibold uppercase tracking-wide text-brand-600">Step {i + 1}</div>
                <Icon size={22} className="mt-3 text-brand-500" />
                <h3 className="mt-3 font-serif text-lg font-semibold text-neutral-900">{title}</h3>
                <p className="mt-2 text-sm text-neutral-600">{body}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <h2 className="font-serif text-2xl font-semibold text-neutral-900">Why work with me on this</h2>
        <p className="mt-4 text-neutral-600">
          This isn&apos;t a side note to my business — it&apos;s the deal type I spend the most time thinking about.
          I maintain a separate resource site with guides and listing alerts specifically for house
          hackers, and I run in-person meetups on it here in Atlanta.
        </p>
        <a
          href="https://househackingatl.com"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-1.5 font-medium text-brand-600 hover:underline"
        >
          Browse guides at House Hacking ATL
          <ArrowUpRight size={16} />
        </a>

        <div className="mt-10">
          <Link
            href="/work-with-me"
            className="inline-flex items-center gap-2 rounded-md bg-ink px-5 py-3 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-neutral-800"
          >
            Tell Me About Your Budget
            <ArrowRight size={15} />
          </Link>
        </div>
      </section>
    </>
  );
}
