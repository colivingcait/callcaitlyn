import type { Metadata } from "next";
import { Card, LinkButton, TextLink } from "@/components/ui";
import { Eyebrow, Glyph } from "@/components/blocks";

export const metadata: Metadata = {
  title: "Coliving",
  description: "A growing portfolio of coliving homes across metro Atlanta, plus a community for women building their own.",
};

const FEATURES = [
  {
    glyph: "⌂",
    title: "Coliving Conversions",
    body: "Properties with coliving conversion potential — room count, layout, parking, and the hidden spaces most people walk right past.",
  },
  {
    glyph: "✦",
    title: "Occupied Coliving Properties",
    body: "Already-operating coliving homes come with unique complexities. I help you navigate occupied transactions so nothing falls through the cracks.",
  },
];

export default function ColivingPage() {
  return (
    <>
      <section className="reveal mx-auto max-w-3xl px-8 py-20 lg:px-[60px] lg:py-[120px]">
        <Eyebrow>Coliving</Eyebrow>
        <h1 className="mt-4 text-h2-lg font-medium text-charcoal">
          A portfolio built one <em>room at a time.</em>
        </h1>
        <p className="mt-5 text-lg text-warmgray">
          CoLivingCait is my own portfolio of coliving homes across metro Atlanta — sourced, renovated,
          furnished, and operated in-house. Beyond running it myself, I coach women building their own
          portfolios, and co-founded <strong>She Leads Coliving</strong> and the annual{" "}
          <strong>Women&apos;s Coliving Summit</strong> — a community that started as a Facebook group and grew
          into women at every stage of the investing journey sharing deals, resources, and hard-won lessons
          with each other.
        </p>
      </section>

      <section className="border-y border-soft bg-blush">
        <div className="mx-auto max-w-page px-8 py-20 lg:px-[60px] lg:py-[120px]">
          <h2 className="reveal text-h2 font-medium text-charcoal">
            If you&apos;re buying with coliving in mind
          </h2>
          <div className="reveal mt-10 grid gap-6 sm:grid-cols-2">
            {FEATURES.map(({ glyph, title, body }) => (
              <Card key={title} tone="white" className="p-8">
                <Glyph className="text-2xl">{glyph}</Glyph>
                <h3 className="mt-3 font-heading text-h3 font-medium text-charcoal">{title}</h3>
                <p className="mt-2 text-sm text-warmgray">{body}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="reveal mx-auto max-w-3xl px-8 py-20 text-center lg:px-[60px] lg:py-[120px]">
        <h2 className="text-h2 font-medium text-charcoal">
          Want the full story — courses, guides, and my own portfolio?
        </h2>
        <TextLink href="https://www.colivingcait.com" target="_blank" rel="noopener noreferrer" className="mt-4 justify-center">
          Visit CoLivingCait
        </TextLink>
        <div className="mt-8">
          <LinkButton href="/work-with-me" variant="primary" size="lg">
            Find a Coliving Property
          </LinkButton>
        </div>
      </section>
    </>
  );
}
