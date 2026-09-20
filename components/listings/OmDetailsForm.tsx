"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateListingOmFields } from "@/app/(app)/listings/actions";
import type { Listing } from "@/types/database";

const inputClass = "w-full rounded-xl border border-neutral-200 px-3 py-2 text-[15px]";
const labelClass = "mb-1 block text-sm font-medium text-neutral-700";

// Every field the public offering-memorandum page shows beyond the basics
// (price/beds/baths/photos, already in BasicsForm) - since the address is
// never shown there, this is the page's real identity plus everything the
// design surfaces. Grouped to match the page's own section order.
// Due-diligence / seller-support fields are intentionally not edited
// here — the public OM no longer renders that card.
export function OmDetailsForm({ listing }: { listing: Listing }) {
  const router = useRouter();
  const [nickname, setNickname] = useState(listing.nickname ?? "");
  const [omNumber, setOmNumber] = useState(listing.om_number ?? "");
  const [submarket, setSubmarket] = useState(listing.submarket ?? "");
  const [yearBuilt, setYearBuilt] = useState(listing.year_built?.toString() ?? "");
  const [yearRenovated, setYearRenovated] = useState(listing.year_renovated?.toString() ?? "");
  const [privateBathrooms, setPrivateBathrooms] = useState(listing.private_bathrooms?.toString() ?? "");
  const [padsplitSince, setPadsplitSince] = useState(listing.padsplit_since ?? "");
  const [parking, setParking] = useState(listing.parking ?? "");
  const [laundry, setLaundry] = useState(listing.laundry ?? "");
  const [furnishings, setFurnishings] = useState(listing.furnishings ?? "");
  const [publicDescription, setPublicDescription] = useState(listing.public_description ?? "");
  const [bandGrossRent, setBandGrossRent] = useState(listing.band_gross_rent ?? "");
  const [bandExpenseLoad, setBandExpenseLoad] = useState(listing.band_expense_load ?? "");
  const [bandCashOnCash, setBandCashOnCash] = useState(listing.band_cash_on_cash ?? "");
  const [bandCapRate, setBandCapRate] = useState(listing.band_cap_rate ?? "");
  const [coAgentName, setCoAgentName] = useState(listing.co_agent_name ?? "");
  const [coAgentBrokerage, setCoAgentBrokerage] = useState(listing.co_agent_brokerage ?? "");
  const [coAgentPhone, setCoAgentPhone] = useState(listing.co_agent_phone ?? "");
  const [coAgentEmail, setCoAgentEmail] = useState(listing.co_agent_email ?? "");
  const [showSellerSection, setShowSellerSection] = useState(listing.show_seller_section ?? true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    await updateListingOmFields(listing.id, {
      nickname: nickname || null,
      omNumber: omNumber || null,
      submarket: submarket || null,
      yearBuilt: yearBuilt ? Number(yearBuilt) : null,
      yearRenovated: yearRenovated ? Number(yearRenovated) : null,
      privateBathrooms: privateBathrooms ? Number(privateBathrooms) : null,
      padsplitSince: padsplitSince || null,
      parking: parking || null,
      laundry: laundry || null,
      furnishings: furnishings || null,
      publicDescription: publicDescription || null,
      bandGrossRent: bandGrossRent || null,
      bandExpenseLoad: bandExpenseLoad || null,
      bandCashOnCash: bandCashOnCash || null,
      bandCapRate: bandCapRate || null,
      coAgentName: coAgentName || null,
      coAgentBrokerage: coAgentBrokerage || null,
      coAgentPhone: coAgentPhone || null,
      coAgentEmail: coAgentEmail || null,
      showSellerSection,
    });
    setSaving(false);
    setSaved(true);
    router.refresh();
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="mb-2 text-sm font-semibold text-neutral-900">Identity (public page never shows the address)</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <label className={labelClass}>Nickname</label>
            <input value={nickname} onChange={(e) => setNickname(e.target.value)} className={inputClass} placeholder="The Westside 8" />
          </div>
          <div>
            <label className={labelClass}>OM number</label>
            <input value={omNumber} onChange={(e) => setOmNumber(e.target.value)} className={inputClass} placeholder="OM-2026-04" />
          </div>
          <div className="sm:col-span-3">
            <label className={labelClass}>Submarket</label>
            <input value={submarket} onChange={(e) => setSubmarket(e.target.value)} className={inputClass} placeholder="West Atlanta" />
          </div>
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-neutral-900">Property detail</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className={labelClass}>Year built</label>
            <input type="number" value={yearBuilt} onChange={(e) => setYearBuilt(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Year renovated</label>
            <input type="number" value={yearRenovated} onChange={(e) => setYearRenovated(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Private bathrooms</label>
            <input type="number" value={privateBathrooms} onChange={(e) => setPrivateBathrooms(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>On PadSplit since</label>
            <input type="date" value={padsplitSince} onChange={(e) => setPadsplitSince(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Parking</label>
            <input value={parking} onChange={(e) => setParking(e.target.value)} className={inputClass} placeholder="Driveway, 4 cars" />
          </div>
          <div>
            <label className={labelClass}>Laundry</label>
            <input value={laundry} onChange={(e) => setLaundry(e.target.value)} className={inputClass} placeholder="In-unit, conveys" />
          </div>
          <div className="sm:col-span-3">
            <label className={labelClass}>Furnishings</label>
            <input value={furnishings} onChange={(e) => setFurnishings(e.target.value)} className={inputClass} placeholder="All 8 rooms, convey" />
          </div>
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-neutral-900">The offering (public description)</h3>
        <textarea
          value={publicDescription}
          onChange={(e) => setPublicDescription(e.target.value)}
          rows={6}
          className="w-full rounded-xl border border-neutral-200 p-3 text-[15px] leading-6"
          placeholder={"Lede paragraph, then what it is / what conveys, then how the transition works.\n\nSeparate paragraphs with a blank line."}
        />
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-neutral-900">Public financial bands (deliberately imprecise)</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Gross Rents</label>
            <input value={bandGrossRent} onChange={(e) => setBandGrossRent(e.target.value)} className={inputClass} placeholder="$5.0–5.5k/mo" />
          </div>
          <div>
            <label className={labelClass}>Operating Expenses</label>
            <input value={bandExpenseLoad} onChange={(e) => setBandExpenseLoad(e.target.value)} className={inputClass} placeholder="high-teens%" />
          </div>
          <div>
            <label className={labelClass}>Cash-on-cash</label>
            <input value={bandCashOnCash} onChange={(e) => setBandCashOnCash(e.target.value)} className={inputClass} placeholder="high-teens to low-20s%" />
          </div>
          <div>
            <label className={labelClass}>Cap rate</label>
            <input value={bandCapRate} onChange={(e) => setBandCapRate(e.target.value)} className={inputClass} placeholder="low-10s%" />
          </div>
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-neutral-900">Co-listing agent (shows a card when a name is set)</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input value={coAgentName} onChange={(e) => setCoAgentName(e.target.value)} className={inputClass} placeholder="Name" />
          <input value={coAgentBrokerage} onChange={(e) => setCoAgentBrokerage(e.target.value)} className={inputClass} placeholder="Brokerage" />
          <input value={coAgentPhone} onChange={(e) => setCoAgentPhone(e.target.value)} className={inputClass} placeholder="Phone" />
          <input value={coAgentEmail} onChange={(e) => setCoAgentEmail(e.target.value)} className={inputClass} placeholder="Email" />
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm text-neutral-700">
          <input type="checkbox" checked={showSellerSection} onChange={(e) => setShowSellerSection(e.target.checked)} />
          Show &quot;sell your PadSplit&quot; section
        </label>
      </div>

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="rounded-xl bg-neutral-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {saving ? "Saving…" : saved ? "Saved" : "Save OM details"}
      </button>
    </div>
  );
}
