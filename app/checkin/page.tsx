import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Check in",
  description: "Check in to Caitlyn Verdugo's meetup.",
};

export default function CheckInIndexPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-sm text-center">
        <p className="font-serif text-3xl font-semibold text-neutral-900">CallCaitlyn</p>
        <p className="mt-2 text-[15px] text-neutral-500">Check in to tonight&apos;s meetup</p>
        <div className="mt-6 space-y-3">
          <Link
            href="/checkin/house_hacking"
            className="block rounded-2xl bg-brand-600 px-4 py-3.5 text-sm font-semibold text-white"
          >
            House Hacking Meetup
          </Link>
          <Link
            href="/checkin/womens_rei"
            className="block rounded-2xl border border-neutral-200 bg-white px-4 py-3.5 text-sm font-semibold text-neutral-900"
          >
            Women&apos;s REI Meetup
          </Link>
        </div>
        <p className="mt-6 text-sm text-neutral-400">
          <Link href="/book" className="underline underline-offset-2">
            Book a call
          </Link>
          {" · "}
          <a href="tel:+16788848494" className="underline underline-offset-2">
            (678) 884-8494
          </a>
        </p>
      </div>
    </main>
  );
}
