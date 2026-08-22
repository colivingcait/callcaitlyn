import { cn } from "@/lib/utils";
import { LinkButton } from "@/components/ui";

export function Eyebrow({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "center" }) {
  return <p className={cn("eyebrow", align === "center" && "eyebrow-center")}>{children}</p>;
}

export function StatPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center border border-soft bg-white px-4 py-2 font-sans text-xs font-medium text-warmgray">
      {children}
    </span>
  );
}

// Unicode glyph in the heading font, gold - the design system's whole
// icon system (no icon library: section 8 of the spec).
export function Glyph({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn("font-heading text-gold", className)} aria-hidden>{children}</span>;
}

export function TestimonialCard({ quote, source, note = "Verified Client" }: { quote: string; source: string; note?: string }) {
  return (
    <div className="border border-brand bg-cream p-8">
      <Glyph className="text-lg tracking-widest">★★★★★</Glyph>
      <p className="mt-3 font-heading text-lg italic text-charcoal">&ldquo;{quote}&rdquo;</p>
      <p className="mt-4 font-sans text-sm font-medium text-charcoal">{source}</p>
      <p className="font-sans text-xs text-warmgray-light">{note}</p>
    </div>
  );
}

export function IconFeatureRow({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 border border-brand bg-white lg:grid-cols-5">{children}</div>;
}

export function IconFeature({ glyph, title, children }: { glyph: string; title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-soft p-6 last:border-b-0 lg:border-b-0 lg:border-r lg:border-soft lg:last:border-r-0">
      <Glyph className="text-2xl">{glyph}</Glyph>
      <h3 className="mt-3 font-heading text-base font-medium text-charcoal">{title}</h3>
      <p className="mt-2 font-sans text-sm text-warmgray">{children}</p>
    </div>
  );
}

export function ServiceSplit({
  glyph,
  title,
  description,
  ctaLabel,
  ctaHref,
  items,
}: {
  glyph: string;
  title: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
  items: { title: string; description: string }[];
}) {
  return (
    <div className="grid border border-brand bg-white md:grid-cols-[1fr_1.6fr]">
      <div className="border-b border-soft p-8 md:border-b-0 md:border-r">
        <Glyph className="text-3xl">{glyph}</Glyph>
        <h3 className="mt-4 font-heading text-h3 font-medium text-charcoal">{title}</h3>
        <p className="mt-3 font-sans text-sm text-warmgray">{description}</p>
        <LinkButton href={ctaHref} variant="outline" size="sm" className="mt-6">
          {ctaLabel}
        </LinkButton>
      </div>
      <div className="divide-y divide-soft p-8">
        {items.map((item) => (
          <div key={item.title} className="py-3 first:pt-0 last:pb-0">
            <p className="font-sans text-sm font-semibold text-charcoal">{item.title}</p>
            <p className="mt-1 font-sans text-sm text-warmgray">{item.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CountyCard({ county, cities }: { county: string; cities: string[] }) {
  return (
    <div className="border border-brand bg-white p-6">
      <h3 className="font-heading text-h3 font-medium text-charcoal">{county}</h3>
      <div className="mt-4 flex flex-wrap gap-2">
        {cities.map((city) => (
          <span key={city} className="border border-soft px-3 py-1.5 font-sans text-xs font-medium text-warmgray">
            {city}
          </span>
        ))}
      </div>
    </div>
  );
}

export function DarkCta({
  eyebrow,
  heading,
  emphasis,
  subtext,
  ctaLabel,
  ctaHref,
}: {
  eyebrow: string;
  heading: string;
  emphasis: string;
  subtext?: string;
  ctaLabel: string;
  ctaHref: string;
}) {
  return (
    <section className="bg-charcoal">
      <div className="mx-auto max-w-3xl px-8 py-20 text-center lg:px-[60px] lg:py-[120px]">
        <Eyebrow align="center">{eyebrow}</Eyebrow>
        <h2 className="mt-4 font-heading text-h2-lg font-medium text-white">
          {heading} <em>{emphasis}</em>
        </h2>
        {subtext && <p className="mt-4 font-sans text-warmgray-light">{subtext}</p>}
        <LinkButton href={ctaHref} variant="gold" size="lg" className="mt-8">
          {ctaLabel}
        </LinkButton>
      </div>
    </section>
  );
}
