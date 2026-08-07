"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button, Input, Label, Select, Textarea } from "@/components/ui";
import { PROPERTY_TYPE_LABELS } from "@/lib/utils";
import { X, PartyPopper, Handshake } from "lucide-react";
import type { Deal, DealSide, PropertyType } from "@/types/database";

// The deal row itself already exists by the time this opens (see
// stage-transition.ts) - this only ever UPDATEs it, so skipping/closing
// early loses nothing but the extra detail. Reused for the under-contract
// capture, the closed-deal celebration, and later editing from DealsList.
export function DealCelebrationModal({
  dealId,
  contactName,
  defaultLeadStartedAt,
  defaultSide,
  initial,
  mode,
  onClose,
}: {
  dealId: string;
  contactName: string;
  defaultLeadStartedAt: string | null;
  defaultSide: DealSide | null;
  initial?: Partial<Deal>;
  mode: "under_contract" | "celebrate" | "edit";
  onClose: () => void;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [address, setAddress] = useState(initial?.address ?? "");
  const [propertyType, setPropertyType] = useState<PropertyType | "">(initial?.property_type ?? "");
  const [side, setSide] = useState<DealSide | "">(initial?.side ?? defaultSide ?? "");
  const [salePrice, setSalePrice] = useState(initial?.sale_price?.toString() ?? "");
  const [grossCommission, setGrossCommission] = useState(initial?.gross_commission?.toString() ?? "");
  const [referralPct, setReferralPct] = useState(initial?.referral_pct?.toString() ?? "");
  const [miscFee, setMiscFee] = useState(initial?.misc_fee?.toString() ?? "");
  const [ozFee, setOzFee] = useState(initial?.oz_fee?.toString() ?? "");
  const [leadStartedAt, setLeadStartedAt] = useState(
    (initial?.lead_started_at ?? defaultLeadStartedAt)?.slice(0, 10) ?? "",
  );
  const [notes, setNotes] = useState(initial?.notes ?? "");

  async function handleSave() {
    setSaving(true);
    const supabase = createClient();
    await supabase
      .from("deals")
      .update({
        address: address || null,
        property_type: propertyType || null,
        side: side || null,
        sale_price: salePrice ? Number(salePrice) : null,
        gross_commission: grossCommission ? Number(grossCommission) : null,
        referral_pct: referralPct ? Number(referralPct) : null,
        misc_fee: miscFee ? Number(miscFee) : 0,
        oz_fee: ozFee ? Number(ozFee) : 0,
        lead_started_at: leadStartedAt ? new Date(leadStartedAt).toISOString() : null,
        notes: notes || null,
      })
      .eq("id", dealId);
    setSaving(false);
    router.refresh();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4">
      <div className="max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:max-w-md sm:rounded-2xl">
        <div className="flex items-start justify-between">
          {mode === "celebrate" && (
            <div>
              <p className="flex items-center gap-1.5 font-serif text-xl font-semibold text-neutral-900">
                <PartyPopper size={20} className="text-brand-600" /> Nice work!
              </p>
              <p className="mt-0.5 text-sm text-neutral-500">
                {contactName} just closed. Add the deal details while it&apos;s fresh — or skip and fill it in later.
              </p>
            </div>
          )}
          {mode === "under_contract" && (
            <div>
              <p className="flex items-center gap-1.5 font-serif text-xl font-semibold text-neutral-900">
                <Handshake size={20} className="text-brand-600" /> Under contract!
              </p>
              <p className="mt-0.5 text-sm text-neutral-500">
                Lock in what you know about {contactName}&apos;s deal now — you&apos;ll get asked for the rest
                (commission, splits) once it actually closes.
              </p>
            </div>
          )}
          {mode === "edit" && <p className="font-serif text-xl font-semibold text-neutral-900">Edit deal</p>}
          <button onClick={onClose} className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100">
            <X size={18} />
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <div>
            <Label htmlFor="deal-address">Property address</Label>
            <Input id="deal-address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Main St" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="deal-property-type">Property type</Label>
              <Select
                id="deal-property-type"
                value={propertyType}
                onChange={(e) => setPropertyType(e.target.value as PropertyType | "")}
              >
                <option value="">Select…</option>
                {Object.entries(PROPERTY_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="deal-side">Side</Label>
              <Select id="deal-side" value={side} onChange={(e) => setSide(e.target.value as DealSide | "")}>
                <option value="">Select…</option>
                <option value="buyer">Buyer side</option>
                <option value="seller">Seller side</option>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="deal-sale-price">Sale price</Label>
              <Input
                id="deal-sale-price"
                type="number"
                step="1000"
                value={salePrice}
                onChange={(e) => setSalePrice(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="deal-gross-commission">Gross commission</Label>
              <Input
                id="deal-gross-commission"
                type="number"
                step="100"
                value={grossCommission}
                onChange={(e) => setGrossCommission(e.target.value)}
                placeholder="Your side, before splits"
              />
            </div>
          </div>
          {mode !== "under_contract" && (
            <>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="deal-referral-pct">Referral %</Label>
                  <Input
                    id="deal-referral-pct"
                    type="number"
                    step="0.5"
                    value={referralPct}
                    onChange={(e) => setReferralPct(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="deal-misc-fee">Misc fee</Label>
                  <Input id="deal-misc-fee" type="number" step="10" value={miscFee} onChange={(e) => setMiscFee(e.target.value)} placeholder="0" />
                </div>
                <div>
                  <Label htmlFor="deal-oz-fee">OZ fee</Label>
                  <Input id="deal-oz-fee" type="number" step="10" value={ozFee} onChange={(e) => setOzFee(e.target.value)} placeholder="0" />
                </div>
              </div>
              <p className="text-xs text-neutral-400">
                KW (30% to $15k cap), KWRI (3% to $3k cap), FMLS (0.12% of price), and TC ($500) are calculated
                automatically on the Commissions page — referral, misc, and OZ are the only splits you enter directly.
              </p>
            </>
          )}
          <div>
            <Label htmlFor="deal-lead-started">Started working with them</Label>
            <Input
              id="deal-lead-started"
              type="date"
              value={leadStartedAt}
              onChange={(e) => setLeadStartedAt(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="deal-notes">Notes</Label>
            <Textarea
              id="deal-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What worked, what almost fell through, anything useful for predicting the next one…"
            />
          </div>
        </div>

        <div className="mt-5 flex gap-3">
          <Button onClick={handleSave} disabled={saving} className="flex-1">
            {saving ? "Saving…" : "Save deal"}
          </Button>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            {mode === "edit" ? "Cancel" : "Skip for now"}
          </Button>
        </div>
      </div>
    </div>
  );
}
