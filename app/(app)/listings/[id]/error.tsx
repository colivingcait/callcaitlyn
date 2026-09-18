"use client";

export default function ListingDetailError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <p className="font-serif text-2xl font-semibold text-neutral-900">This listing tab hit an error</p>
      <p className="mt-2 text-[15px] text-neutral-600">
        A missing or unexpected listing field crashed this view. The listing itself is fine — try again, or open a different tab.
      </p>
      <button type="button" onClick={reset} className="mt-4 rounded-xl bg-neutral-900 px-4 py-2 text-sm font-semibold text-white">
        Try again
      </button>
    </div>
  );
}
