import Link from "next/link";
import { Info } from "lucide-react";
import { getListingsIndex } from "@/lib/data/listings";
import { STATUS_LABEL, STATUS_COLORS } from "@/lib/listings/status";
import { formatCurrency, cn } from "@/lib/utils";
import { NewListingButton } from "@/components/listings/NewListingButton";
import { ListingStatusMenu } from "@/components/listings/ListingStatusMenu";
import type { ListingStatus } from "@/types/database";

const STATUS_ORDER: ListingStatus[] = ["active", "coming_soon", "under_contract", "closed"];

export default async function ListingsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status: statusFilter } = await searchParams;
  const { listings, counts } = await getListingsIndex();
  const filtered = statusFilter ? listings.filter((l) => l.status === statusFilter) : listings;

  const activeCount = counts.active;
  const comingSoonCount = counts.coming_soon;
  const underContractCount = counts.under_contract;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-neutral-900 sm:text-[28px]">Listings</h1>
          <p className="mt-1 text-[15px] text-neutral-500">
            {activeCount} active · {comingSoonCount} coming soon · {underContractCount} under contract
          </p>
        </div>
        <NewListingButton />
      </div>

      <div className="mt-4 flex gap-1 border-b border-neutral-200">
        <span className="border-b-2 border-brand-600 px-3 py-2.5 text-sm font-medium text-brand-700">Listings</span>
        <Link href="/listings/directory" className="border-b-2 border-transparent px-3 py-2.5 text-sm font-medium text-neutral-500 hover:text-neutral-700">
          Agent directory
        </Link>
      </div>

      <div data-noscrollbar className="mt-4 flex gap-2 overflow-x-auto">
        <Link
          href="/listings"
          className={cn(
            "flex h-10 shrink-0 items-center whitespace-nowrap rounded-full px-4 text-sm font-medium",
            !statusFilter ? "bg-neutral-900 text-white" : "border border-neutral-200 bg-white text-neutral-600",
          )}
        >
          All {listings.length}
        </Link>
        {STATUS_ORDER.map((s) => (
          <Link
            key={s}
            href={`/listings?status=${s}`}
            className={cn(
              "flex h-10 shrink-0 items-center whitespace-nowrap rounded-full px-4 text-sm font-medium",
              statusFilter === s ? "bg-neutral-900 text-white" : "border border-neutral-200 bg-white text-neutral-600",
            )}
          >
            {STATUS_LABEL[s]} {counts[s]}
          </Link>
        ))}
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {filtered.length === 0 ? (
          <p className="rounded-2xl border border-[#ebe9e7] bg-white px-4 py-8 text-center text-[15px] text-neutral-400">No listings here yet.</p>
        ) : (
          filtered.map((l) => {
            const colors = STATUS_COLORS[l.status];
            const specs = [l.beds != null && l.baths != null ? `${l.beds} bd / ${l.baths} ba` : null, l.property_type, l.sqft ? `${l.sqft.toLocaleString()} sqft` : null]
              .filter(Boolean)
              .join(" · ");
            return (
              <div key={l.id} className="rounded-2xl border border-[#ebe9e7] bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <Link href={`/listings/${l.id}`} className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-[17px] font-semibold text-neutral-900">{l.address}</p>
                      <span
                        className="shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium"
                        style={{ background: colors.bg, color: colors.text }}
                      >
                        {STATUS_LABEL[l.status]}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[15px] text-neutral-600">
                      {formatCurrency(l.list_price)}
                      {specs ? ` · ${specs}` : ""}
                    </p>
                    <p className="mt-1.5 text-sm text-neutral-500">
                      {l.agentCount === 0
                        ? "No RP list yet"
                        : `${l.agentCount} agent${l.agentCount === 1 ? "" : "s"} imported · ${l.emailedCount} contacted · ${l.repliedCount} replied`}
                    </p>
                  </Link>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Link href={`/listings/${l.id}`} className="rounded-[10px] border border-neutral-200 bg-white px-3 py-1.5 text-sm font-semibold text-neutral-800">
                    Reverse prospecting
                  </Link>
                  <Link
                    href={`/listings/${l.id}?tab=marketing`}
                    className="rounded-[10px] border border-neutral-200 bg-white px-3 py-1.5 text-sm font-semibold text-neutral-800"
                  >
                    Marketing
                  </Link>
                  <Link
                    href={`/listings/${l.id}?tab=activity`}
                    className="rounded-[10px] border border-neutral-200 bg-white px-3 py-1.5 text-sm font-semibold text-neutral-800"
                  >
                    Activity
                  </Link>
                  <ListingStatusMenu listingId={l.id} status={l.status} />
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="mt-4 flex items-center gap-3 rounded-2xl border border-dashed border-neutral-300 bg-[#fcfbfa] px-4 py-3.5">
        <Info size={18} className="shrink-0 text-neutral-400" />
        <p className="min-w-0 flex-1 text-sm leading-5 text-neutral-600">
          Marking a listing under contract prompts you to add it to the commission tracker — a prompt, not automatic.
        </p>
      </div>
    </div>
  );
}
