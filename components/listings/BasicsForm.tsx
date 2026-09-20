"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateListingBasics } from "@/app/(app)/listings/actions";
import { extractPadsplitListingId, padsplitListingUrlFromInput, PADSPLIT_LISTING_URL_BASE } from "@/lib/listings/padsplit-url";
import type { Listing } from "@/types/database";

export function BasicsForm({ listing }: { listing: Listing }) {
  const router = useRouter();
  const [address, setAddress] = useState(listing.address);
  const [listPrice, setListPrice] = useState(listing.list_price?.toString() ?? "");
  const [beds, setBeds] = useState(listing.beds?.toString() ?? "");
  const [baths, setBaths] = useState(listing.baths?.toString() ?? "");
  const [sqft, setSqft] = useState(listing.sqft?.toString() ?? "");
  const [propertyType, setPropertyType] = useState(listing.property_type ?? "");
  const [mlsNumber, setMlsNumber] = useState(listing.mls_number ?? "");
  const [zillowUrl, setZillowUrl] = useState(listing.zillow_url ?? "");
  const [padsplitListingId, setPadsplitListingId] = useState(() => extractPadsplitListingId(listing.padsplit_url));
  const [story, setStory] = useState(listing.story ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function handlePadsplitIdChange(raw: string) {
    const extracted = extractPadsplitListingId(raw);
    if (extracted && raw.trim() !== extracted) {
      setPadsplitListingId(extracted);
      return;
    }
    setPadsplitListingId(raw.replace(/[^\d]/g, ""));
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    await updateListingBasics(listing.id, {
      address,
      listPrice: listPrice ? Number(listPrice) : null,
      beds: beds ? Number(beds) : null,
      baths: baths ? Number(baths) : null,
      sqft: sqft ? Number(sqft) : null,
      propertyType: propertyType || null,
      mlsNumber: mlsNumber || null,
      zillowUrl: zillowUrl || null,
      padsplitUrl: padsplitListingUrlFromInput(padsplitListingId),
      story: story || null,
    });
    setSaving(false);
    setSaved(true);
    router.refresh();
    setTimeout(() => setSaved(false), 1500);
  }

  const inputClass = "w-full rounded-xl border border-neutral-200 px-3 py-2 text-[15px]";
  const builtUrl = padsplitListingUrlFromInput(padsplitListingId);

  return (
    <div>
      <h2 className="mb-3 text-base font-semibold text-neutral-900">The basics</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="sm:col-span-3">
          <label className="mb-1 block text-sm font-medium text-neutral-700">Address</label>
          <input value={address} onChange={(e) => setAddress(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">List price</label>
          <input type="number" step="1000" value={listPrice} onChange={(e) => setListPrice(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">Beds / baths</label>
          <div className="flex gap-1.5">
            <input type="number" value={beds} onChange={(e) => setBeds(e.target.value)} className={inputClass} placeholder="Beds" />
            <input type="number" step="0.5" value={baths} onChange={(e) => setBaths(e.target.value)} className={inputClass} placeholder="Baths" />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">Square feet</label>
          <input type="number" value={sqft} onChange={(e) => setSqft(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">Property type</label>
          <input value={propertyType} onChange={(e) => setPropertyType(e.target.value)} className={inputClass} placeholder="Legal duplex" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">MLS number</label>
          <input value={mlsNumber} onChange={(e) => setMlsNumber(e.target.value)} className={inputClass} placeholder="FMLS 7412398" />
        </div>
        <div className="sm:col-span-3">
          <label className="mb-1 block text-sm font-medium text-neutral-700">Zillow link</label>
          <input
            type="url"
            value={zillowUrl}
            onChange={(e) => setZillowUrl(e.target.value)}
            className={inputClass}
            placeholder="https://www.zillow.com/homedetails/..."
          />
          <p className="mt-1 text-xs text-neutral-400">Dropped into agent texts so they can tap through and see the photos.</p>
        </div>
        <div className="sm:col-span-3">
          <label className="mb-1 block text-sm font-medium text-neutral-700">PadSplit listing ID</label>
          <input
            inputMode="numeric"
            value={padsplitListingId}
            onChange={(e) => handlePadsplitIdChange(e.target.value)}
            className={inputClass}
            placeholder="12345"
          />
          <p className="mt-1 text-xs text-neutral-400">
            The number from the PadSplit URL — not the full link. Occupancy, pricing, and photos are pulled from{" "}
            {builtUrl ? (
              <span className="break-all text-neutral-500">{builtUrl}</span>
            ) : (
              <>
                {PADSPLIT_LISTING_URL_BASE}/<span className="text-neutral-500">ID</span>
              </>
            )}{" "}
            automatically once a day.
          </p>
        </div>
      </div>
      <div className="mt-3">
        <label className="mb-1 block text-sm font-medium text-neutral-700">What makes it special — the story you&apos;d tell at the meetup</label>
        <textarea value={story} onChange={(e) => setStory(e.target.value)} rows={4} className="w-full rounded-xl border border-neutral-200 p-3 text-[15px] leading-6" />
      </div>
      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="mt-3 rounded-xl bg-neutral-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {saving ? "Saving…" : saved ? "Saved" : "Save basics"}
      </button>
    </div>
  );
}
