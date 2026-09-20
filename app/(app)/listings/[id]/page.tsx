import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getListingDetail, getSendProgress } from "@/lib/data/listings";
import { collapseListingAgents } from "@/lib/crm/agent-identity";
import { fetchListingAgentTextRecency } from "@/lib/data/listing-outbound-texts";
import { createClient } from "@/lib/supabase/server";
import { formatCompactCurrency, formatCurrency, cn } from "@/lib/utils";
import { STATUS_LABEL } from "@/lib/listings/status";
import { ListingStatusMenu } from "@/components/listings/ListingStatusMenu";
import { ImportAgentsPanel } from "@/components/listings/ImportAgentsPanel";
import { AgentsList } from "@/components/listings/AgentsList";
import { AgentComposer } from "@/components/listings/AgentComposer";
import { SendsList } from "@/components/listings/SendsList";
import { BasicsForm } from "@/components/listings/BasicsForm";
import { PublicPageToggle } from "@/components/listings/PublicPageToggle";
import { PadsplitScrapeStatus } from "@/components/listings/PadsplitScrapeStatus";
import { DocumentUploader } from "@/components/listings/DocumentUploader";
import { ApplyToOmPanel } from "@/components/listings/ApplyToOmPanel";
import { OmDetailsForm } from "@/components/listings/OmDetailsForm";
import { FinancialsEditor } from "@/components/listings/FinancialsEditor";
import { ListingPhotosPanel } from "@/components/listings/ListingPhotosPanel";
import { baseUrl } from "@/lib/crm/sequences";
import { MarketingGraphics } from "@/components/listings/MarketingGraphics";
import { listingLiveOccupancy } from "@/lib/listings/occupancy";
import { CopyBlocks } from "@/components/listings/CopyBlocks";
import { ActivityTab } from "@/components/listings/ActivityTab";
import { Section } from "@/components/ui/Section";
import { asPhotoList, asUrlList } from "@/lib/listings/crm-marketing-fields";
import { listingFieldCopy } from "@/lib/listings/public-copy";
import { normalizePhone } from "@/lib/phone";
import type { ListingAgentTouch } from "@/lib/crm/listing-activity";

type Tab = "rp" | "marketing" | "photos" | "activity";

export default async function ListingDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const { id } = await params;
  const { tab } = await searchParams;
  const activeTab: Tab = tab === "marketing" ? "marketing" : tab === "photos" ? "photos" : tab === "activity" ? "activity" : "rp";

  const detail = await getListingDetail(id);
  if (!detail) notFound();
  const { listing, agents: agentsRaw, sends, priceChanges, statusChanges, messages, documents, pageEvents } = detail;
  // Collapse buyer-ref duplicates for every RP list Caitlyn sees. Activity
  // still uses the raw rows so a message tied to a non-canonical listing_agent
  // id keeps its name.
  const agents = collapseListingAgents(agentsRaw);

  const sendProgressMap = activeTab === "rp" ? await getSendProgress(sends.map((s) => s.id)) : new Map();
  const sendProgress = Object.fromEntries(sendProgressMap);
  const textRecency =
    activeTab === "rp"
      ? await fetchListingAgentTextRecency(listing.id, agentsRaw)
      : { lastOutboundAtByAgentId: {}, queuedOnThisListing: [] };

  const specs = [listing.beds != null && listing.baths != null ? `${listing.beds} bd / ${listing.baths} ba` : null, listingFieldCopy(listing.property_type), listing.sqft ? `${listing.sqft.toLocaleString()} sqft` : null]
    .filter(Boolean)
    .join(" · ");
  const chromeMeta = [
    listing.list_price != null ? formatCompactCurrency(listing.list_price) : null,
    listing.beds != null && listing.baths != null ? `${listing.beds}bd/${listing.baths}ba` : null,
    listingFieldCopy(listing.property_type),
  ]
    .filter(Boolean)
    .join(" · ");

  const photoPaths = asUrlList(listing.photo_paths);
  let photoUrls: string[] = [];
  if ((activeTab === "marketing" || activeTab === "photos") && photoPaths.length > 0) {
    const supabase = await createClient();
    photoUrls = photoPaths.map((p) => supabase.storage.from("listing-photos").getPublicUrl(p).data.publicUrl);
  }

  let enrichedMessages: ListingAgentTouch[] = [];
  if (activeTab === "activity") {
    const agentById = new Map(agentsRaw.map((a) => [a.id, a]));
    const base = messages.map((m) => {
      const la = m.listing_agent_id ? agentById.get(m.listing_agent_id) : null;
      const meta = (m.metadata ?? {}) as { name?: string; brokerage?: string };
      return {
        ...m,
        name: la?.name ?? meta.name ?? "Agent",
        brokerage: la?.brokerage ?? meta.brokerage ?? null,
        phone: la?.phone ?? null,
        email: la?.email ?? null,
        alreadyPartner: false,
      };
    });
    const supabase = await createClient();
    const { data: contacts } = await supabase.from("contacts").select("phone, secondary_phone, email").eq("archived", false);
    const partnerPhones = new Set<string>();
    const partnerEmails = new Set<string>();
    for (const contact of contacts ?? []) {
      const phone = normalizePhone(contact.phone);
      const secondary = normalizePhone(contact.secondary_phone);
      if (phone) partnerPhones.add(phone);
      if (secondary) partnerPhones.add(secondary);
      if (contact.email) partnerEmails.add(contact.email.trim().toLowerCase());
    }
    enrichedMessages = base.map((m) => ({
      ...m,
      alreadyPartner: Boolean((m.phone && partnerPhones.has(normalizePhone(m.phone) ?? "")) || (m.email && partnerEmails.has(m.email.trim().toLowerCase()))),
    }));
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "rp", label: "Reverse prospecting" },
    { key: "marketing", label: "Marketing" },
    { key: "photos", label: "Photos" },
    { key: "activity", label: "Activity" },
  ];

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-6 lg:px-8 lg:py-8">
      <Link href="/listings" className="flex items-center gap-1 text-[13px] font-medium text-neutral-400 hover:text-neutral-700">
        <ChevronLeft size={16} /> Listings
      </Link>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
          <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-neutral-900 lg:text-[24px]">{listing.address}</h1>
          {chromeMeta && <p className="text-[14px] text-neutral-400">· {chromeMeta}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="rounded-full border border-[#eadfd6] bg-white px-3 py-1.5 text-[13px] font-medium text-neutral-700">{STATUS_LABEL[listing.status]}</span>
          <ListingStatusMenu listingId={listing.id} status={listing.status} />
        </div>
      </div>

      <div className="mt-6 flex gap-8 border-b border-[#eadfd6]">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={`/listings/${listing.id}?tab=${t.key}`}
            className={cn(
              "border-b-2 px-0 py-3 text-[15px] font-medium",
              activeTab === t.key ? "border-brand-600 text-brand-700" : "border-transparent text-neutral-400 hover:text-neutral-700",
            )}
          >
            {t.label}
          </Link>
        ))}
      </div>

      <div className="mt-8">
        {activeTab === "rp" && (() => {
          const notContacted = agents.filter((a) => a.state === "not_contacted").length;
          const contacted = agents.filter((a) => a.state === "emailed" || a.state === "texted" || a.state === "replied").length;
          const replied = agents.filter((a) => a.state === "replied").length;
          const optedOut = agents.filter((a) => a.state === "opted_out").length;
          const noEmail = agents.filter((a) => !a.email).length;

          return (
            <div className="space-y-4">
              {/* Actions first - what to do right now, not who's on the list. */}
              <AgentComposer
                listingId={listing.id}
                address={listing.address}
                listPrice={listing.list_price ? formatCurrency(listing.list_price) : null}
                zillowUrl={listing.zillow_url}
                agents={agents}
                lastOutboundAtByAgentId={textRecency.lastOutboundAtByAgentId}
                queuedOnThisListing={textRecency.queuedOnThisListing}
              />

              {/* Reporting - status at a glance, then the send-by-send log. */}
              <div className="rounded-2xl border border-[#ebe9e7] bg-white p-[18px]">
                <h2 className="mb-2 text-base font-semibold text-neutral-900">Where things stand</h2>
                <p className="text-[15px] text-neutral-600">
                  {agents.length} agent{agents.length === 1 ? "" : "s"} · {notContacted} not contacted · {contacted} contacted · {replied} replied
                  {noEmail > 0 ? ` · ${noEmail} no email` : ""}
                  {optedOut > 0 ? ` · ${optedOut} opted out` : ""}
                </p>
              </div>
              <SendsList listingId={listing.id} sends={sends} progress={sendProgress} />

              {/* Actual agents, last and collapsed - the raw list, for when you need it. */}
              <Section
                sectionKey={`listing:${listing.id}:agents`}
                title="Reverse prospecting list"
                meta={`${agents.length} agents`}
                defaultOpen={false}
              >
                <div className="space-y-4 p-[18px]">
                  <ImportAgentsPanel listingId={listing.id} listingAddress={listing.address} />
                  <AgentsList agents={agents} />
                </div>
              </Section>
            </div>
          );
        })()}
        {activeTab === "marketing" && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-[#ebe9e7] bg-white p-[18px]">
              <BasicsForm listing={listing} />
              <p className="mt-4 text-sm text-neutral-500">
                Public OM photos live on the{" "}
                <Link href={`/listings/${listing.id}?tab=photos`} className="font-medium text-brand-700 hover:underline">
                  Photos
                </Link>{" "}
                tab.
              </p>
            </div>
            <div className="rounded-2xl border border-[#ebe9e7] bg-white p-[18px] space-y-4">
              <h2 className="text-base font-semibold text-neutral-900">Public listing page</h2>
              <PublicPageToggle listingId={listing.id} publicSlug={listing.public_slug} appOrigin={baseUrl()} />
              <PadsplitScrapeStatus
                padsplitUrl={listing.padsplit_url}
                occupiedRooms={listingLiveOccupancy(listing).occupied}
                totalRooms={listingLiveOccupancy(listing).total}
                lastScrapedAt={listing.last_scraped_at}
                lastScrapeError={listing.last_scrape_error}
              />
              <DocumentUploader listingId={listing.id} documents={documents} />
            </div>
            <div className="rounded-2xl border border-[#ebe9e7] bg-white p-[18px]">
              <ApplyToOmPanel listingId={listing.id} listing={listing} />
            </div>
            <div className="rounded-2xl border border-[#ebe9e7] bg-white p-[18px]">
              <h2 className="mb-3 text-base font-semibold text-neutral-900">Offering memorandum details</h2>
              <OmDetailsForm key={`om-${listing.updated_at}`} listing={listing} />
            </div>
            <div className="rounded-2xl border border-[#ebe9e7] bg-white p-[18px]">
              <h2 className="mb-3 text-base font-semibold text-neutral-900">Gated underwriting detail</h2>
              <FinancialsEditor key={`fin-${listing.updated_at}`} listingId={listing.id} financials={listing.financials} />
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
              <CopyBlocks address={listing.address} listPrice={listing.list_price} specs={specs} story={listing.story} zillowUrl={listing.zillow_url} />
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
        {activeTab === "photos" && (
          <ListingPhotosPanel
            listingId={listing.id}
            photoSource={listing.photo_source}
            heroPhotoUrl={listing.hero_photo_url}
            photoUrls={photoUrls}
            photoPaths={photoPaths}
            padsplitPhotos={asPhotoList(listing.padsplit_photos)}
            padsplitGallery={asPhotoList(listing.padsplit_gallery)}
            excludedUrls={asUrlList(listing.excluded_photo_urls)}
          />
        )}
        {activeTab === "activity" && (
          <ActivityTab
            listingId={listing.id}
            listingCreatedAt={listing.created_at}
            statusChanges={statusChanges}
            priceChanges={priceChanges}
            sends={sends}
            messages={enrichedMessages}
            pageEvents={pageEvents}
          />
        )}
      </div>
    </div>
  );
}
