import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getListingDetail, getSendProgress } from "@/lib/data/listings";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency, cn } from "@/lib/utils";
import { STATUS_LABEL } from "@/lib/listings/status";
import { ListingStatusMenu } from "@/components/listings/ListingStatusMenu";
import { ImportAgentsPanel } from "@/components/listings/ImportAgentsPanel";
import { AgentsList } from "@/components/listings/AgentsList";
import { AgentComposer } from "@/components/listings/AgentComposer";
import { SendsList } from "@/components/listings/SendsList";
import { BasicsForm } from "@/components/listings/BasicsForm";
import { PhotoUploader } from "@/components/listings/PhotoUploader";
import { MarketingGraphics } from "@/components/listings/MarketingGraphics";
import { CopyBlocks } from "@/components/listings/CopyBlocks";
import { ActivityTab } from "@/components/listings/ActivityTab";
import type { ListingAgentMessage } from "@/types/database";

type Tab = "rp" | "marketing" | "activity";
type EnrichedMessage = ListingAgentMessage & { name: string; brokerage: string | null; phone: string | null; email: string | null };

export default async function ListingDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const { id } = await params;
  const { tab } = await searchParams;
  const activeTab: Tab = tab === "marketing" ? "marketing" : tab === "activity" ? "activity" : "rp";

  const detail = await getListingDetail(id);
  if (!detail) notFound();
  const { listing, agents, sends, priceChanges, messages } = detail;

  const sendProgressMap = activeTab === "rp" ? await getSendProgress(sends.map((s) => s.id)) : new Map();
  const sendProgress = Object.fromEntries(sendProgressMap);

  const specs = [listing.beds != null && listing.baths != null ? `${listing.beds} bd / ${listing.baths} ba` : null, listing.property_type, listing.sqft ? `${listing.sqft.toLocaleString()} sqft` : null]
    .filter(Boolean)
    .join(" · ");

  let photoUrls: string[] = [];
  if (activeTab === "marketing" && listing.photo_paths.length > 0) {
    const supabase = await createClient();
    photoUrls = listing.photo_paths.map((p) => supabase.storage.from("listing-photos").getPublicUrl(p).data.publicUrl);
  }

  let enrichedMessages: EnrichedMessage[] = [];
  if (activeTab === "activity") {
    const agentById = new Map(agents.map((a) => [a.id, a]));
    enrichedMessages = messages.map((m) => {
      const la = m.listing_agent_id ? agentById.get(m.listing_agent_id) : null;
      const meta = (m.metadata ?? {}) as { name?: string; brokerage?: string };
      return {
        ...m,
        name: la?.name ?? meta.name ?? "Agent",
        brokerage: la?.brokerage ?? meta.brokerage ?? null,
        phone: la?.phone ?? null,
        email: la?.email ?? null,
      };
    });
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "rp", label: "Reverse prospecting" },
    { key: "marketing", label: "Marketing" },
    { key: "activity", label: "Activity" },
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <Link href="/listings" className="flex items-center gap-1 text-sm font-medium text-neutral-500 hover:text-neutral-700">
        <ChevronLeft size={16} /> Listings
      </Link>
      <div className="mt-2 flex items-start justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-neutral-900">{listing.address}</h1>
          <p className="mt-0.5 text-[15px] text-neutral-500">
            {formatCurrency(listing.list_price)}
            {specs ? ` · ${specs}` : ""} · {STATUS_LABEL[listing.status]}
            {listing.mls_number ? ` · ${listing.mls_number}` : ""}
          </p>
        </div>
        <ListingStatusMenu listingId={listing.id} status={listing.status} />
      </div>

      <div className="mt-4 flex gap-1 border-b border-neutral-200">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={`/listings/${listing.id}?tab=${t.key}`}
            className={cn(
              "border-b-2 px-3 py-2.5 text-sm font-medium",
              activeTab === t.key ? "border-brand-600 text-brand-700" : "border-transparent text-neutral-500 hover:text-neutral-700",
            )}
          >
            {t.label}
          </Link>
        ))}
      </div>

      <div className="mt-4">
        {activeTab === "rp" && (
          <div className="space-y-4">
            <ImportAgentsPanel listingId={listing.id} listingAddress={listing.address} />
            <div className="rounded-2xl border border-[#ebe9e7] bg-white p-[18px]">
              <h2 className="mb-3 text-base font-semibold text-neutral-900">Imported · {agents.length} agents</h2>
              <AgentsList agents={agents} />
            </div>
            <AgentComposer listingId={listing.id} address={listing.address} listPrice={listing.list_price ? formatCurrency(listing.list_price) : null} agents={agents} />
            <SendsList listingId={listing.id} sends={sends} progress={sendProgress} />
          </div>
        )}
        {activeTab === "marketing" && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-[#ebe9e7] bg-white p-[18px]">
              <BasicsForm listing={listing} />
              <div className="mt-4">
                <PhotoUploader listingId={listing.id} photoUrls={photoUrls} photoPaths={listing.photo_paths} />
              </div>
            </div>
            <div className="rounded-2xl border border-[#ebe9e7] bg-white p-[18px]">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-base font-semibold text-neutral-900">Graphics</h2>
                <span className="text-sm text-neutral-500">Rendered here · download as PNG</span>
              </div>
              <MarketingGraphics address={listing.address} listPrice={listing.list_price} specs={specs} photoUrl={photoUrls[0] ?? null} />
              <p className="mt-3 text-sm text-neutral-400">
                Three layouts, your palette and type, filled from the fields above. Not Canva — these render in the CRM and download as PNGs; paste them
                into Canva afterwards if you want to keep editing.
              </p>
            </div>
            <div className="rounded-2xl border border-[#ebe9e7] bg-white p-[18px]">
              <h2 className="mb-3 text-base font-semibold text-neutral-900">Copy</h2>
              <CopyBlocks address={listing.address} listPrice={listing.list_price} specs={specs} story={listing.story} />
            </div>
            <div className="rounded-2xl border border-dashed border-neutral-300 bg-[#fcfbfa] p-4">
              <p className="font-semibold text-neutral-900">Other things this data can do</p>
              <p className="mt-1.5 text-sm leading-5 text-neutral-600">
                A seller update — how many agents were contacted, how many opened, how many asked for showings — is already in the Activity tab. A
                price-drop send goes to everyone on the list, not just non-repliers, since a new price is news to all of them: edit the price above, then
                compose from Reverse prospecting.
              </p>
            </div>
          </div>
        )}
        {activeTab === "activity" && (
          <ActivityTab listingId={listing.id} listingAddress={listing.address} listingCreatedAt={listing.created_at} priceChanges={priceChanges} sends={sends} messages={enrichedMessages} />
        )}
      </div>
    </div>
  );
}
