"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button, Input, Label, Select, Textarea } from "@/components/ui";
import { PROPERTY_TYPE_LABELS } from "@/lib/utils";
import { X } from "lucide-react";
import type { DealSide, PropertyType } from "@/types/database";

// For backfilling deals that closed before this CRM existed - inserts a
// brand-new 'won' row with no contact_id, so historical deals count
// toward this year's KW/KWRI caps without needing a full contact record
// re-created for each one.
export function AddPastDealModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [clientName, setClientName] = useState("");
  const [closedAt, setClosedAt] = useState(new Date().toISOString().slice(0, 10));
  const [address, setAddress] = useState("");
  const [propertyType, setPropertyType] = useState<PropertyType | "">("");
  const [side, setSide] = useState<DealSide | "">("");
  const [salePrice, setSalePrice] = useState("");
  const [grossCommission, setGrossCommission] = useState("");
  const [referralPct, setReferralPct] = useState("");
  const [miscFee, setMiscFee] = useState("");
  const [ozFee, setOzFee] = useState("");
  const [onFmls, setOnFmls] = useState(true);
  // Defaults on since a past deal's real fees are usually already known -
  // matches Bulk import's default for the same reason.
  const [manualSplit, setManualSplit] = useState(true);
  const [kwFee, setKwFee] = useState("");
  const [kwriFee, setKwriFee] = useState("");
  const [manualFmlsFee, setManualFmlsFee] = useState("");
  const [tcFee, setTcFee] = useState("");
  const [notes, setNotes] = useState("");

  async function handleSave() {
    setSaving(true);
    setError("");
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Your session expired. Please sign in again.");
      setSaving(false);
      return;
    }

    const { error: insertError } = await supabase.from("deals").insert({
      owner_id: user.id,
      contact_id: null,
      client_name: clientName || null,
      status: "won",
      closed_at: new Date(closedAt).toISOString(),
      address: address || null,
      property_type: propertyType || null,
      side: side || null,
      sale_price: salePrice ? Number(salePrice) : null,
      gross_commission: grossCommission ? Number(grossCommission) : null,
      misc_fee: miscFee ? Number(miscFee) : 0,
      oz_fee: ozFee ? Number(ozFee) : 0,
      manual_split: manualSplit,
      // Referral is always a percentage of gross, regardless of whether
      // KW/KWRI/FMLS/TC are being entered manually or calculated below.
      referral_pct: referralPct ? Number(referralPct) : null,
      ...(manualSplit
        ? {
            kw_fee: kwFee ? Number(kwFee) : 0,
            kwri_fee: kwriFee ? Number(kwriFee) : 0,
            fmls_fee: manualFmlsFee ? Number(manualFmlsFee) : 0,
            tc_fee: tcFee ? Number(tcFee) : 0,
          }
        : { on_fmls: onFmls }),
      notes: notes || null,
    });

    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    router.refresh();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4">
      <div className="max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:max-w-md sm:rounded-2xl">
        <div className="flex items-start justify-between">
          <p className="font-serif text-xl font-semibold text-neutral-900">Add past deal</p>
          <button onClick={onClose} className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100">
            <X size={18} />
          </button>
        </div>
        <p className="mt-0.5 text-sm text-neutral-500">
          For deals that closed before this CRM was tracking them — not linked to a contact record.
        </p>

        <div className="mt-4 space-y-3">
          <div>
            <Label htmlFor="past-client-name">Client name</Label>
            <Input id="past-client-name" value={clientName} onChange={(e) => setClientName(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="past-address">Property address</Label>
            <Input id="past-address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Main St" />
          </div>
          <div>
            <Label htmlFor="past-closed-at">Closing date</Label>
            <Input id="past-closed-at" type="date" value={closedAt} onChange={(e) => setClosedAt(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="past-property-type">Property type</Label>
              <Select id="past-property-type" value={propertyType} onChange={(e) => setPropertyType(e.target.value as PropertyType | "")}>
                <option value="">Select…</option>
                {Object.entries(PROPERTY_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="past-side">Side</Label>
              <Select id="past-side" value={side} onChange={(e) => setSide(e.target.value as DealSide | "")}>
                <option value="">Select…</option>
                <option value="buyer">Buyer side</option>
                <option value="seller">Seller side</option>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="past-sale-price">Sale price</Label>
              <Input id="past-sale-price" type="number" step="1000" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="past-gross-commission">Gross commission</Label>
              <Input
                id="past-gross-commission"
                type="number"
                step="100"
                value={grossCommission}
                onChange={(e) => setGrossCommission(e.target.value)}
                placeholder="Your side, before splits"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label htmlFor="past-referral-pct">Referral %</Label>
              <Input id="past-referral-pct" type="number" step="0.5" value={referralPct} onChange={(e) => setReferralPct(e.target.value)} placeholder="0" />
            </div>
            <div>
              <Label htmlFor="past-misc-fee">Misc fee</Label>
              <Input id="past-misc-fee" type="number" step="10" value={miscFee} onChange={(e) => setMiscFee(e.target.value)} placeholder="0" />
            </div>
            <div>
              <Label htmlFor="past-oz-fee">OZ fee</Label>
              <Input id="past-oz-fee" type="number" step="10" value={ozFee} onChange={(e) => setOzFee(e.target.value)} placeholder="0" />
            </div>
          </div>
          <p className="text-xs text-neutral-400">Referral is always taken off gross as a percentage, whether or not the fees below are entered exactly.</p>
          <label className="flex items-center gap-2 text-sm text-neutral-600">
            <input
              type="checkbox"
              checked={manualSplit}
              onChange={(e) => setManualSplit(e.target.checked)}
              className="h-4 w-4 rounded border-neutral-300"
            />
            Use exact fee amounts instead of calculating them
          </label>
          {manualSplit ? (
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label htmlFor="past-kw-fee">KW</Label>
                <Input id="past-kw-fee" type="number" step="10" value={kwFee} onChange={(e) => setKwFee(e.target.value)} placeholder="0" />
              </div>
              <div>
                <Label htmlFor="past-kwri-fee">KWRI</Label>
                <Input id="past-kwri-fee" type="number" step="10" value={kwriFee} onChange={(e) => setKwriFee(e.target.value)} placeholder="0" />
              </div>
              <div>
                <Label htmlFor="past-fmls-fee">FMLS</Label>
                <Input id="past-fmls-fee" type="number" step="10" value={manualFmlsFee} onChange={(e) => setManualFmlsFee(e.target.value)} placeholder="0" />
              </div>
              <div>
                <Label htmlFor="past-tc-fee">TC</Label>
                <Input id="past-tc-fee" type="number" step="10" value={tcFee} onChange={(e) => setTcFee(e.target.value)} placeholder="0" />
              </div>
            </div>
          ) : (
            <>
              <label className="flex items-center gap-2 text-sm text-neutral-600">
                <input
                  type="checkbox"
                  checked={onFmls}
                  onChange={(e) => setOnFmls(e.target.checked)}
                  className="h-4 w-4 rounded border-neutral-300"
                />
                On FMLS
              </label>
              <p className="text-xs text-neutral-400">
                KW, KWRI, and TC are calculated automatically once saved, same as any other deal. FMLS only applies
                if the box above is checked.
              </p>
            </>
          )}
          <div>
            <Label htmlFor="past-notes">Notes</Label>
            <Textarea id="past-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <div className="mt-5 flex gap-3">
          <Button onClick={handleSave} disabled={saving} className="flex-1">
            {saving ? "Saving…" : "Add deal"}
          </Button>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
