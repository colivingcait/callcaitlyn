import { Card, LinkButton, TextLink } from "@/components/ui";
import { Eyebrow, StatPill, TestimonialCard, IconFeatureRow, IconFeature, Glyph, DarkCta } from "@/components/blocks";
import { STATS, TESTIMONIALS, DIFFERENTIATORS } from "@/lib/content";

const HELP_CARDS = [
  {
    glyph: "✦",
    title: "Coliving",
    body: "A growing portfolio of coliving homes across metro Atlanta — sourced, renovated, furnished, and operated in-house.",
    href: "/coliving",
  },
  {
    glyph: "⌂",
    title: "House Hacking",
    body: "Buy a property, live in part of it, and let the rent from the rest cover your mortgage. My specialty.",
    href: "/house-hacking",
  },
  {
    glyph: "◈",
    title: "Work With Me",
    body: "Buying, selling, or investing — a Realtor who evaluates every property like it's going in her own portfolio.",
    href: "/work-with-me",
  },
];

export default function HomePage() {
  return (
    <>
      <section className="mx-auto max-w-page px-8 pb-16 pt-[140px] lg:px-[60px]">
        <div className="max-w-2xl">
          <p className="hero-in eyebrow">Atlanta Real Estate</p>
          <h1 className="hero-in mt-4 text-hero font-medium text-charcoal" style={{ animationDelay: "0.2s" }}>
            A Realtor who thinks like <em>an investor.</em>
          </h1>
          <p className="hero-in mt-5 text-lg text-warmgray" style={{ animationDelay: "0.5s" }}>
            I&apos;m Caitlyn — I help people buy their first house hack, build a coliving portfolio, and buy or
            sell with someone who&apos;s done all three herself.
          </p>
          <div className="hero-in mt-6 flex flex-wrap gap-2" style={{ animationDelay: "0.5s" }}>
            {STATS.map((stat) => (
              <StatPill key={stat}>{stat}</StatPill>
            ))}
          </div>
          <div className="hero-in mt-8 flex flex-wrap gap-3" style={{ animationDelay: "0.7s" }}>
            <LinkButton href="/contact" variant="primary" size="lg">
              Schedule a Call
            </LinkButton>
            <LinkButton href="/work-with-me" variant="outline" size="lg">
              Work With Me
            </LinkButton>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-page px-8 py-20 lg:px-[60px] lg:py-[120px]">
        <div className="reveal">
          <Eyebrow>How I Can Help</Eyebrow>
          <h2 className="mt-3 text-h2 font-medium text-charcoal">
            Three ways to work with me, <em>one investor mindset.</em>
          </h2>
        </div>
        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {HELP_CARDS.map(({ glyph, title, body, href }, i) => (
            <Card key={title} tone="white" className={`reveal reveal-d${i + 1} flex flex-col p-8`}>
              <Glyph className="text-3xl">{glyph}</Glyph>
              <h3 className="mt-4 font-heading text-h3 font-medium text-charcoal">{title}</h3>
              <p className="mt-2 flex-1 text-sm text-warmgray">{body}</p>
              <TextLink href={href} className="mt-4">
                Learn more
              </TextLink>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-y border-soft bg-blush">
        <div className="mx-auto max-w-page px-8 py-20 lg:px-[60px] lg:py-[120px]">
          <div className="reveal">
            <Eyebrow>Why Work With Me</Eyebrow>
            <h2 className="mt-3 text-h2 font-medium text-charcoal">
              You&apos;re not working with a traditional Realtor. <em>That changes everything.</em>
            </h2>
          </div>
          <div className="reveal mt-10">
            <IconFeatureRow>
              {DIFFERENTIATORS.map((item) => (
                <IconFeature key={item.title} glyph={item.glyph} title={item.title}>
                  {item.body}
                </IconFeature>
              ))}
            </IconFeatureRow>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-page px-8 py-20 lg:px-[60px] lg:py-[120px]">
        <div className="reveal text-center">
          <Eyebrow align="center">What Clients Are Saying</Eyebrow>
          <h2 className="mt-3 text-h2 font-medium text-charcoal">
            Real reviews from <em>real clients.</em>
          </h2>
        </div>
        <div className="reveal mt-10 grid gap-6 sm:grid-cols-2">
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
