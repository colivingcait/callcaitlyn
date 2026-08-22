import type { Metadata } from "next";
import { Eyebrow, StatPill, TestimonialCard, ServiceSplit, CountyCard, Glyph, DarkCta } from "@/components/blocks";
import { BuyForm, SellForm } from "@/components/WorkWithMeForms";
import { STATS, TESTIMONIALS, BUYER_ITEMS, SELLER_ITEMS, SERVICE_AREAS } from "@/lib/content";

export const metadata: Metadata = {
  title: "Work With Me",
  description: "Buy, sell, or invest with a Realtor who thinks like an investor — across the Atlanta metro.",
};

export default function WorkWithMePage() {
  return (
    <>
      <section className="reveal mx-auto max-w-3xl px-8 py-20 lg:px-[60px] lg:py-[120px]">
        <Eyebrow>Work With Me</Eyebrow>
        <h1 className="mt-4 text-h2-lg font-medium text-charcoal">
          A Realtor who thinks like <em>an investor.</em>
        </h1>
        <p className="mt-5 text-lg text-warmgray">
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

      <section className="border-y border-soft bg-blush">
        <div className="mx-auto max-w-page px-8 py-20 lg:px-[60px] lg:py-[120px]">
          <div className="reveal">
            <Eyebrow>How I Can Help</Eyebrow>
            <h2 className="mt-3 text-h2 font-medium text-charcoal">
              Whether you&apos;re buying or selling, you deserve a Realtor who <em>gets it.</em>
            </h2>
          </div>
          <div className="reveal mt-10 space-y-6">
            <ServiceSplit
              glyph="◈"
              title="For Buyers & Investors"
              description="Finding a property is easy. Finding the right one takes an investor's eye. I specialize in identifying properties with real potential and helping you navigate every step from search to close."
              ctaLabel="Tell Me What You're Looking For"
              ctaHref="#buy"
              items={[...BUYER_ITEMS]}
            />
            <ServiceSplit
              glyph="$"
              title="For Sellers"
              description="Selling is more than putting a sign in the yard. I help you understand your options, price strategically, and navigate the full transaction from contract to close."
              ctaLabel="Let's Talk About Your Property"
              ctaHref="#sell"
              items={[...SELLER_ITEMS]}
            />
          </div>
        </div>
      </section>

      <section id="buy-sell" className="mx-auto max-w-page px-8 py-20 lg:px-[60px] lg:py-[120px]">
        <div className="reveal text-center">
          <Eyebrow align="center">Get Started</Eyebrow>
          <h2 className="mt-3 text-h2 font-medium text-charcoal">
            Tell me what you&apos;re working <em>with.</em>
          </h2>
        </div>
        <div className="reveal mt-10 grid gap-6 lg:grid-cols-2">
          <div id="buy">
            <BuyForm />
          </div>
          <div id="sell">
            <SellForm />
          </div>
        </div>
      </section>

      <section className="border-y border-soft bg-white">
        <div className="mx-auto max-w-page px-8 py-20 lg:px-[60px] lg:py-[120px]">
          <div className="reveal text-center">
            <Eyebrow align="center">What Clients Are Saying</Eyebrow>
            <h2 className="mt-3 text-h2 font-medium text-charcoal">
              Real reviews from <em>real clients.</em>
            </h2>
            <Glyph className="mt-2 inline-block tracking-widest">★★★★★</Glyph>
            <span className="ml-2 text-sm text-warmgray-light">5.0 on Zillow</span>
          </div>
          <div className="reveal mt-10 grid gap-6 sm:grid-cols-2">
            {TESTIMONIALS.map((t) => (
              <TestimonialCard key={t.quote} quote={t.quote} source={t.source} />
            ))}
          </div>
        </div>
      </section>

      <section className="bg-cream">
        <div className="mx-auto max-w-page px-8 py-20 lg:px-[60px] lg:py-[120px]">
          <div className="reveal text-center">
            <Eyebrow align="center">Service Areas</Eyebrow>
            <h2 className="mt-3 text-h2 font-medium text-charcoal">
              Serving investors across the <em>Atlanta metro.</em>
            </h2>
            <p className="mt-2 text-sm text-warmgray">I work with buyers, sellers, and investors across the greater Atlanta area.</p>
          </div>
          <div className="reveal mt-10 grid gap-6 md:grid-cols-3">
            {SERVICE_AREAS.map((area) => (
              <CountyCard key={area.county} county={area.county} cities={[...area.cities]} />
            ))}
          </div>
          <div className="reveal mt-6 grid gap-6 sm:grid-cols-2">
            <div className="border border-brand bg-white p-6">
              <p className="text-sm font-semibold text-charcoal">Don&apos;t see your area listed?</p>
              <p className="mt-1 text-sm text-warmgray">
                I may still cover it. Reach out below and let me know where you&apos;re looking.
              </p>
            </div>
            <div className="border border-brand bg-white p-6">
              <p className="text-sm font-semibold text-charcoal">Investing outside of Atlanta?</p>
              <p className="mt-1 text-sm text-warmgray">
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
