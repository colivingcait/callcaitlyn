import type { Metadata } from "next";
import { Card, LinkButton, TextLink } from "@/components/ui";
import { Eyebrow, Glyph } from "@/components/blocks";

export const metadata: Metadata = {
  title: "House Hacking",
  description: "What house hacking is, how it works, and how to figure out if it fits your budget.",
};

const STEPS = [
  {
    glyph: "⌂",
    title: "Buy a property with room to spare",
    body: "A duplex/triplex/fourplex, or a single-family home with a basement, ADU, or extra bedrooms.",
  },
  {
    glyph: "⊕",
    title: "Rent out what you're not using",
    body: "Long-term tenants, roommates, or a short-term rental — whatever fits the property and your comfort level.",
  },
  {
    glyph: "$",
    title: "Let that rent offset your mortgage",
    body: "Many house hackers cut their housing cost to a fraction of market rent — some cover it entirely.",
  },
];

export default function HouseHackingPage() {
  return (
    <>
      <section className="reveal mx-auto max-w-3xl px-8 py-20 lg:px-[60px] lg:py-[120px]">
        <Eyebrow>House Hacking</Eyebrow>
        <h1 className="mt-4 text-h2-lg font-medium text-charcoal">
          Buy a home. Let it <em>pay for itself.</em>
        </h1>
        <p className="mt-5 text-lg text-warmgray">
          House hacking is buying a property, living in part of it, and renting out the rest — using
          owner-occupant financing (often with a much smaller down payment than a straight investment
          purchase) to get into your first property and your first rental at the same time. It&apos;s the
          smartest first move most investors can make.
        </p>
      </section>

      <section className="border-y border-soft bg-blush">
        <div className="mx-auto max-w-page px-8 py-20 lg:px-[60px] lg:py-[120px]">
          <h2 className="reveal text-h2 font-medium text-charcoal">How it works</h2>
          <div className="reveal mt-10 grid gap-6 sm:grid-cols-3">
            {STEPS.map(({ glyph, title, body }, i) => (
              <Card key={title} tone="white" className="p-8">
                <div className="eyebrow">Step {i + 1}</div>
                <Glyph className="mt-3 block text-2xl">{glyph}</Glyph>
                <h3 className="mt-3 font-heading text-h3 font-medium text-charcoal">{title}</h3>
                <p className="mt-2 text-sm text-warmgray">{body}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="reveal mx-auto max-w-3xl px-8 py-20 lg:px-[60px] lg:py-[120px]">
        <h2 className="text-h2 font-medium text-charcoal">Why work with me on this</h2>
        <p className="mt-4 text-warmgray">
          This isn&apos;t a side note to my business — it&apos;s the deal type I spend the most time thinking about.
          I maintain a separate resource site with guides and listing alerts specifically for house
          hackers, and I run in-person meetups on it here in Atlanta.
        </p>
        <TextLink href="https://househackingatl.com" target="_blank" rel="noopener noreferrer" className="mt-4">
          Browse guides at House Hacking ATL
        </TextLink>

        <div className="mt-10">
          <LinkButton href="/work-with-me" variant="primary" size="lg">
            Tell Me About Your Budget
          </LinkButton>
        </div>
      </section>
    </>
  );
}
