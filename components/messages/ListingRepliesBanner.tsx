import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

export function ListingRepliesBanner({ count }: { count: number }) {
  if (count <= 0) return null;

  return (
    <Link
      href="/listings"
      className="flex items-center gap-3 rounded-[14px] border border-[#ebe9e7] bg-white px-3.5 py-3"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700">
        <Home size={18} strokeWidth={1.8} />
      </div>
      <p className="min-w-0 flex-1 text-[15px] text-neutral-700">
        <span className="font-semibold text-neutral-900">
          {count} listing agent {count === 1 ? "reply" : "replies"}
        </span>{" "}
        waiting — not in this inbox. Open Listings.
      </p>
      <ChevronRight size={18} className="shrink-0 text-neutral-300" />
    </Link>
  );
}
