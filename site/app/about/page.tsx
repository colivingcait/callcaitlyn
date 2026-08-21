import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { INITIATIVES } from "@/lib/initiatives";

export const metadata: Metadata = { title: "About" };

export default function AboutPage() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <p className="text-sm font-medium uppercase tracking-wide text-brand-600">About</p>
      <h1 className="mt-3 font-serif text-3xl font-semibold text-neutral-900 sm:text-4xl">
        From one house hack to a whole community.
      </h1>

      <div className="mt-8 flex h-40 w-40 items-center justify-center rounded-2xl bg-brand-50 text-4xl font-semibold text-brand-600">
        CV
        <span className="sr-only">Placeholder — replace with a real headshot</span>
      </div>

      <div className="mt-8 space-y-5 text-neutral-700">
        <p>
          I moved to Atlanta, got my real estate license, and started investing with a house hack of my
          own — converting a basement into a studio apartment to help cover the mortgage. That one deal
          turned into a strategy, then a business, then a few communities I never planned on building but
          couldn&apos;t stop building anyway.
        </p>
        <p>
          Today that&apos;s a portfolio of coliving homes I source, renovate, furnish, and operate across metro
          Atlanta (<strong>CoLivingCait</strong>), a resource site and meetup for people exploring their
          first house hack (<strong>House Hacking ATL</strong>), and a monthly community for women building
          wealth through real estate (<strong>Atlanta Women Investors</strong>).
        </p>
        <p>
          If any of that sounds like where you&apos;re headed — or you&apos;re not sure which piece fits — that&apos;s
          exactly what the contact form below is for.
        </p>
        <p className="text-sm text-neutral-400">
          (Placeholder bio — swap in more of your own story, credentials, and photos here.)
        </p>
      </div>

      <div className="mt-10">
        <h2 className="font-serif text-xl font-semibold text-neutral-900">Where to find each one</h2>
        <ul className="mt-4 space-y-3">
          {INITIATIVES.map((item) => (
            <li key={item.url}>
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 font-medium text-brand-600 hover:underline"
              >
                {item.name}
                <ArrowUpRight size={15} />
              </a>
              <p className="text-sm text-neutral-500">{item.tagline}</p>
            </li>
          ))}
        </ul>
      </div>

      <Link
        href="/contact"
        className="mt-10 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-brand-700"
      >
        Let&apos;s talk
        <ArrowRight size={16} />
      </Link>
    </section>
  );
}
