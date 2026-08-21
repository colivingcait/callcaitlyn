import type { Metadata } from "next";
import { Gem, DollarSign } from "lucide-react";
import { Eyebrow, StatPill, TestimonialCard, ServiceSplit, CountyCard, DarkCta } from "@/components/blocks";
import { BuyForm, SellForm } from "@/components/WorkWithMeForms";
import { STATS, TESTIMONIALS, BUYER_ITEMS, SELLER_ITEMS, SERVICE_AREAS } from "@/lib/content";

export const metadata: Metadata = {
  title: "Work With Me",
  description: "Buy, sell, or invest with a Realtor who thinks like an investor — across the Atlanta metro.",
};

export default function WorkWithMePage() {
  return (
    <>
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <Eyebrow>Work With Me</Eyebrow>
        <h1 className="mt-4 font-serif text-3xl font-semibold text-neutral-900 sm:text-4xl">
          A Realtor who thinks like <span className="italic text-brand-500">an investor.</span>
        </h1>
        <p className="mt-5 text-lg text-neutral-600">
          I don&apos;t just help you find a property — I help you find the right one. Whether you&apos;re
          buying your first investment, selling a property, or house hacking your way to financial
          freedom, you&apos;ll work with someone who&apos;s done all three.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          {STATS.map((stat) => (
            <StatPill key={stat}>{stat}</StatPill>
          ))}
        </div>
      </section>

      <section className="border-y border-neutral-200/70 bg-cream">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <Eyebrow>How I Can Help</Eyebrow>
          <h2 className="mt-3 font-serif text-2xl font-semibold text-neutral-900 sm:text-3xl">
            Whether you&apos;re buying or selling, you deserve a Realtor who <span className="italic text-brand-500">gets it.</span>
          </h2>
          <div className="mt-8 space-y-6">
            <ServiceSplit
              icon={Gem}
              title="For Buyers & Investors"
              description="Finding a property is easy. Finding the right one takes an investor's eye. I specialize in identifying properties with real potential and helping you navigate every step from search to close."
              ctaLabel="Tell Me What You're Looking For"
              ctaHref="#buy"
              items={[...BUYER_ITEMS]}
            />
            <ServiceSplit
              icon={DollarSign}
              title="For Sellers"
              description="Selling is more than putting a sign in the yard. I help you understand your options, price strategically, and navigate the full transaction from contract to close."
              ctaLabel="Let's Talk About Your Property"
              ctaHref="#sell"
              items={[...SELLER_ITEMS]}
            />
          </div>
        </div>
      </section>

      <section id="buy-sell" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <Eyebrow align="center">Get Started</Eyebrow>
        <h2 className="mt-3 text-center font-serif text-2xl font-semibold text-neutral-900 sm:text-3xl">
          Tell me what you&apos;re working <span className="italic text-brand-500">with.</span>
        </h2>
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <div id="buy">
            <BuyForm />
          </div>
          <div id="sell">
            <SellForm />
          </div>
        </div>
      </section>

      <section className="border-y border-neutral-200/70 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <Eyebrow align="center">What Clients Are Saying</Eyebrow>
          <h2 className="mt-3 text-center font-serif text-2xl font-semibold text-neutral-900 sm:text-3xl">
            Real reviews from <span className="italic text-brand-500">real clients.</span>
          </h2>
          <p className="mt-2 text-center text-sm text-neutral-500">★★★★★ 5.0 on Zillow</p>
          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            {TESTIMONIALS.map((t) => (
              <TestimonialCard key={t.quote} quote={t.quote} source={t.source} />
            ))}
          </div>
        </div>
      </section>

      <section className="bg-cream">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <Eyebrow align="center">Service Areas</Eyebrow>
          <h2 className="mt-3 text-center font-serif text-2xl font-semibold text-neutral-900 sm:text-3xl">
            Serving investors across the <span className="italic text-brand-500">Atlanta metro.</span>
          </h2>
          <p className="mt-2 text-center text-sm text-neutral-600">I work with buyers, sellers, and investors across the greater Atlanta area.</p>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {SERVICE_AREAS.map((area) => (
              <CountyCard key={area.county} county={area.county} cities={[...area.cities]} />
            ))}
          </div>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <div className="rounded-2xl border border-neutral-200 bg-white p-6">
              <p className="text-sm font-semibold text-neutral-900">Don&apos;t see your area listed?</p>
              <p className="mt-1 text-sm text-neutral-600">
                I may still cover it. Reach out below and let me know where you&apos;re looking.
              </p>
            </div>
            <div className="rounded-2xl border border-neutral-200 bg-white p-6">
              <p className="text-sm font-semibold text-neutral-900">Investing outside of Atlanta?</p>
              <p className="mt-1 text-sm text-neutral-600">
                I&apos;d love to connect you with a great Realtor in my network — just let me know your market.
              </p>
            </div>
          </div>
        </div>
      </section>

      <DarkCta
        eyebrow="Ready?"
        heading="Your next property is out there."
        emphasis="Let's go find it."
        subtext="Whether you're buying, selling, or house hacking — it starts with one conversation."
        ctaLabel="Schedule a Discovery Call"
        ctaHref="/contact"
      />
    </>
  );
}
