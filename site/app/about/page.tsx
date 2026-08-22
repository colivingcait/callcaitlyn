import type { Metadata } from "next";
import { Eyebrow, StatPill } from "@/components/blocks";
import { LinkButton } from "@/components/ui";
import { STATS } from "@/lib/content";

export const metadata: Metadata = { title: "About" };

export default function AboutPage() {
  return (
    <section className="mx-auto max-w-3xl px-8 py-20 lg:px-[60px] lg:py-[120px]">
      <div className="reveal">
        <Eyebrow>About</Eyebrow>
        <h1 className="mt-4 text-h2-lg font-medium text-charcoal">
          From one house hack to a <em>whole portfolio.</em>
        </h1>

        <div className="mt-6 flex flex-wrap gap-2">
          {STATS.map((stat) => (
            <StatPill key={stat}>{stat}</StatPill>
          ))}
        </div>
      </div>

      <div className="reveal reveal-d1 mt-10 flex h-40 w-40 items-center justify-center border border-brand bg-blush text-4xl font-medium text-gold">
        CV
        <span className="sr-only">Placeholder — replace with a real headshot</span>
      </div>

      <div className="reveal reveal-d2 mt-10 space-y-5 text-warmgray">
        <p>
          I moved to Atlanta, got my real estate license, and started investing with a house hack of my
          own — converting a basement into a studio apartment to help cover the mortgage. That one deal
          turned into a strategy, then a growing portfolio of coliving homes I source, renovate, furnish,
          and operate across metro Atlanta.
        </p>
        <p>
          Today I work with buyers, sellers, and investors as a Realtor who evaluates every property the
          way I&apos;d evaluate it for my own portfolio — not just the listing sheet. I also coach women building
          their own real estate portfolios, and run a monthly community for them here in Atlanta.
        </p>
        <p>
          If you&apos;re thinking about buying your first house hack, building a coliving portfolio, or just
          need a Realtor who actually understands the investor side of a deal, that&apos;s exactly what I&apos;m here
          for.
        </p>
        <p className="text-sm text-warmgray-light">
          (Placeholder bio — swap in more of your own story, credentials, and photos here.)
        </p>
      </div>

      <LinkButton href="/contact" variant="primary" size="lg" className="reveal reveal-d3 mt-10">
        Let&apos;s Talk
      </LinkButton>
    </section>
  );
}
