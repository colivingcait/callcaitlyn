import Link from "next/link";
import { ArrowRight, Star, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function Eyebrow({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "center" }) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-brand-600",
        align === "center" && "justify-center",
      )}
    >
      <span className="h-px w-6 bg-brand-400" />
      {children}
    </div>
  );
}

export function StatPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-neutral-200 bg-white px-4 py-2 text-xs font-medium text-neutral-700">
      {children}
    </span>
  );
}

export function TestimonialCard({ quote, source, note = "Verified Client" }: { quote: string; source: string; note?: string }) {
  return (
    <div className="rounded-2xl bg-cream p-6">
      <div className="flex gap-0.5 text-brand-500" aria-hidden>
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} size={14} fill="currentColor" strokeWidth={0} />
        ))}
      </div>
      <p className="mt-3 font-serif italic text-neutral-800">&ldquo;{quote}&rdquo;</p>
      <p className="mt-4 text-sm font-semibold text-neutral-900">{source}</p>
      <p className="text-xs text-neutral-500">{note}</p>
    </div>
  );
}

export function IconFeatureRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 overflow-hidden rounded-2xl border border-neutral-200 bg-white lg:grid-cols-5">
      {children}
    </div>
  );
}

export function IconFeature({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-neutral-200 p-6 last:border-b-0 lg:border-b-0 lg:border-r lg:last:border-r-0">
      <Icon size={20} className="text-brand-500" />
      <h3 className="mt-3 font-serif text-base font-semibold text-neutral-900">{title}</h3>
      <p className="mt-2 text-sm text-neutral-600">{children}</p>
    </div>
  );
}

export function ServiceSplit({
  icon: Icon,
  title,
  description,
  ctaLabel,
  ctaHref,
  items,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
  items: { title: string; description: string }[];
}) {
  return (
    <div className="grid overflow-hidden rounded-2xl border border-neutral-200 bg-white md:grid-cols-[1fr_1.6fr]">
      <div className="border-b border-neutral-200 p-8 md:border-b-0 md:border-r">
        <Icon size={24} className="text-brand-500" />
        <h3 className="mt-4 font-serif text-xl font-semibold text-neutral-900">{title}</h3>
        <p className="mt-3 text-sm text-neutral-600">{description}</p>
        <Link
          href={ctaHref}
          className="mt-6 inline-flex items-center gap-2 rounded-md border border-ink px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-ink transition hover:bg-ink hover:text-white"
        >
          {ctaLabel}
          <ArrowRight size={14} />
        </Link>
      </div>
      <div className="divide-y divide-neutral-200 p-8">
        {items.map((item) => (
          <div key={item.title} className="py-3 first:pt-0 last:pb-0">
            <p className="text-sm font-semibold text-neutral-900">{item.title}</p>
            <p className="mt-1 text-sm text-neutral-600">{item.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CountyCard({ county, cities }: { county: string; cities: string[] }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-6">
      <h3 className="font-serif text-lg font-semibold text-neutral-900">{county}</h3>
      <div className="mt-4 flex flex-wrap gap-2">
        {cities.map((city) => (
          <span key={city} className="rounded-full border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-700">
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
    <section className="bg-ink">
      <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
        <Eyebrow align="center">{eyebrow}</Eyebrow>
        <h2 className="mt-4 font-serif text-3xl font-semibold text-white sm:text-4xl">
          {heading} <span className="italic text-brand-400">{emphasis}</span>
        </h2>
        {subtext && <p className="mt-4 text-neutral-300">{subtext}</p>}
        <Link
          href={ctaHref}
          className="mt-8 inline-flex items-center gap-2 rounded-md bg-brand-500 px-6 py-3.5 text-sm font-semibold uppercase tracking-wide text-ink transition hover:bg-brand-400"
        >
          {ctaLabel}
          <ArrowRight size={16} />
        </Link>
      </div>
    </section>
  );
}
