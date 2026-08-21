import Link from "next/link";
import { ArrowRight, Home, Users2, Handshake, Gem, Sparkles, DollarSign, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui";
import { Eyebrow, StatPill, TestimonialCard, IconFeatureRow, IconFeature, DarkCta } from "@/components/blocks";
import { STATS, TESTIMONIALS, DIFFERENTIATORS } from "@/lib/content";

const DIFFERENTIATOR_ICONS = [Gem, Home, Sparkles, DollarSign, CheckCircle2];

const HELP_CARDS = [
  {
    icon: Users2,
    title: "Coliving",
    body: "A growing portfolio of coliving homes across metro Atlanta — sourced, renovated, furnished, and operated in-house.",
    href: "/coliving",
  },
  {
    icon: Home,
    title: "House Hacking",
    body: "Buy a property, live in part of it, and let the rent from the rest cover your mortgage. My specialty.",
    href: "/house-hacking",
  },
  {
    icon: Handshake,
    title: "Work With Me",
    body: "Buying, selling, or investing — a Realtor who evaluates every property like it's going in her own portfolio.",
    href: "/work-with-me",
  },
];

export default function HomePage() {
  return (
    <>
      <section className="mx-auto max-w-6xl px-4 pb-16 pt-16 sm:px-6 sm:pt-20">
        <div className="max-w-2xl">
          <Eyebrow>Atlanta Real Estate</Eyebrow>
          <h1 className="mt-4 font-serif text-4xl font-semibold leading-tight text-neutral-900 sm:text-5xl">
            A Realtor who thinks like <span className="italic text-brand-500">an investor.</span>
          </h1>
          <p className="mt-5 text-lg text-neutral-600">
            I&apos;m Caitlyn — I help people buy their first house hack, build a coliving portfolio, and buy or
            sell with someone who&apos;s done all three herself.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {STATS.map((stat) => (
              <StatPill key={stat}>{stat}</StatPill>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 rounded-md bg-ink px-5 py-3 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-neutral-800"
            >
              Schedule a Call
              <ArrowRight size={15} />
            </Link>
            <Link
              href="/work-with-me"
              className="inline-flex items-center gap-2 rounded-md border border-ink px-5 py-3 text-xs font-semibold uppercase tracking-wide text-ink transition hover:bg-ink hover:text-white"
            >
              Work With Me
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <Eyebrow>How I Can Help</Eyebrow>
        <h2 className="mt-3 font-serif text-2xl font-semibold text-neutral-900 sm:text-3xl">
          Three ways to work with me, <span className="italic text-brand-500">one investor mindset.</span>
        </h2>
        <div className="mt-8 grid gap-5 sm:grid-cols-3">
          {HELP_CARDS.map(({ icon: Icon, title, body, href }) => (
            <Card key={title} className="flex flex-col p-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <Icon size={22} />
              </div>
              <h3 className="mt-4 font-serif text-lg font-semibold text-neutral-900">{title}</h3>
              <p className="mt-2 flex-1 text-sm text-neutral-600">{body}</p>
              <Link href={href} className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:underline">
                Learn more
                <ArrowRight size={15} />
              </Link>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-y border-neutral-200/70 bg-cream">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <Eyebrow>Why Work With Me</Eyebrow>
          <h2 className="mt-3 font-serif text-2xl font-semibold text-neutral-900 sm:text-3xl">
            You&apos;re not working with a traditional Realtor. <span className="italic text-brand-500">That changes everything.</span>
          </h2>
          <div className="mt-8">
            <IconFeatureRow>
              {DIFFERENTIATORS.map((item, i) => (
                <IconFeature key={item.title} icon={DIFFERENTIATOR_ICONS[i]} title={item.title}>
                  {item.body}
                </IconFeature>
              ))}
            </IconFeatureRow>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <Eyebrow align="center">What Clients Are Saying</Eyebrow>
        <h2 className="mt-3 text-center font-serif text-2xl font-semibold text-neutral-900 sm:text-3xl">
          Real reviews from <span className="italic text-brand-500">real clients.</span>
        </h2>
        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          {TESTIMONIALS.slice(0, 2).map((t) => (
            <TestimonialCard key={t.quote} quote={t.quote} source={t.source} />
          ))}
        </div>
      </section>

      <DarkCta
        eyebrow="Ready?"
        heading="Your next move starts with"
        emphasis="one conversation."
        subtext="Whether it's coliving, house hacking, or a straight buy or sell — let's talk it through."
        ctaLabel="Schedule a Call"
        ctaHref="/contact"
      />
    </>
  );
}
