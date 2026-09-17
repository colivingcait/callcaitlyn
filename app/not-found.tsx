import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-neutral-50 px-4 text-center">
      <div className="max-w-sm">
        <p className="font-serif text-3xl font-semibold text-neutral-900">CallCaitlyn</p>
        <p className="mt-3 text-[15px] text-neutral-600">That page isn&apos;t here.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-x-4 gap-y-2 text-sm font-semibold text-brand-700">
          <Link href="/book">Book a call</Link>
          <Link href="/listing">Listings</Link>
          <Link href="/checkin">Check in</Link>
          <Link href="/login">Sign in</Link>
        </div>
      </div>
    </main>
  );
}
