import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { Card } from "@/components/ui";
import { INITIATIVES } from "@/lib/initiatives";

export default function HomePage() {
  return (
    <>
      <section className="mx-auto max-w-6xl px-4 pb-16 pt-14 sm:px-6 sm:pt-20">
        <div className="max-w-2xl">
          <p className="text-sm font-medium uppercase tracking-wide text-brand-600">Atlanta, GA</p>
          <h1 className="mt-3 font-serif text-4xl font-semibold leading-tight text-neutral-900 sm:text-5xl">
            Hi, I&apos;m Caitlyn Verdugo.
          </h1>
          <p className="mt-5 text-lg text-neutral-600">
            I help people buy their first house hack, build a coliving portfolio, and find the community
            (especially other women investors) to do it with. Here&apos;s where all of that lives.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-brand-700"
            >
              Get in touch
              <ArrowRight size={16} />
            </Link>
            <Link
              href="/about"
              className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-5 py-3 text-sm font-medium text-neutral-800 transition hover:bg-neutral-50"
            >
              More about me
            </Link>
          </div>
        </div>
      </section>

      <section className="border-y border-neutral-200/70 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="font-serif text-2xl font-semibold text-neutral-900 sm:text-3xl">What I&apos;m building</h2>
          <p className="mt-2 max-w-2xl text-neutral-600">
            Three things, all under one roof — pick the one that fits where you&apos;re at.
          </p>
          <div className="mt-8 grid gap-5 sm:grid-cols-3">
            {INITIATIVES.map((item) => (
              <Card key={item.url} className="flex flex-col p-6">
                <h3 className="font-serif text-lg font-semibold text-neutral-900">{item.name}</h3>
                <p className="mt-2 flex-1 text-sm text-neutral-600">{item.tagline}</p>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:underline"
                >
                  Visit site
                  <ArrowUpRight size={15} />
                </a>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-neutral-200/70 bg-brand-600">
        <div className="mx-auto max-w-6xl px-4 py-14 text-center sm:px-6">
          <h2 className="font-serif text-2xl font-semibold text-white sm:text-3xl">
            Not sure which one fits you yet?
          </h2>
          <p className="mt-3 text-brand-50">Tell me what you&apos;re working on and I&apos;ll point you the right way.</p>
          <Link
            href="/contact"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-medium text-brand-700 transition hover:bg-brand-50"
          >
            Get in touch
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </>
  );
}
