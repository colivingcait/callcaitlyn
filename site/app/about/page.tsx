import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Eyebrow, StatPill } from "@/components/blocks";
import { STATS } from "@/lib/content";

export const metadata: Metadata = { title: "About" };

export default function AboutPage() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <Eyebrow>About</Eyebrow>
      <h1 className="mt-4 font-serif text-3xl font-semibold text-neutral-900 sm:text-4xl">
        From one house hack to a <span className="italic text-brand-500">whole portfolio.</span>
      </h1>

      <div className="mt-6 flex flex-wrap gap-2">
        {STATS.map((stat) => (
          <StatPill key={stat}>{stat}</StatPill>
        ))}
      </div>

      <div className="mt-8 flex h-40 w-40 items-center justify-center rounded-2xl bg-cream text-4xl font-semibold text-brand-600">
        CV
        <span className="sr-only">Placeholder — replace with a real headshot</span>
      </div>

      <div className="mt-8 space-y-5 text-neutral-700">
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
        <p className="text-sm text-neutral-400">
          (Placeholder bio — swap in more of your own story, credentials, and photos here.)
        </p>
      </div>

      <Link
        href="/contact"
        className="mt-10 inline-flex items-center gap-2 rounded-md bg-ink px-5 py-3 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-neutral-800"
      >
        Let&apos;s Talk
        <ArrowRight size={15} />
      </Link>
    </section>
  );
}
