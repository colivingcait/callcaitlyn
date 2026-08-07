"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button, Input, Label, Select, Textarea } from "@/components/ui";
import { PROPERTY_TYPE_LABELS } from "@/lib/utils";
import { X, PartyPopper } from "lucide-react";
import type { Deal, DealSide, PropertyType } from "@/types/database";

// The deal row itself already exists by the time this opens (see
// stage-transition.ts) - this only ever UPDATEs it, so skipping/closing
// early loses nothing but the extra detail. Reused for both the
// just-closed celebration and later editing from DealsList.
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
  mode: "celebrate" | "edit";
  onClose: () => void;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [address, setAddress] = useState(initial?.address ?? "");
  const [propertyType, setPropertyType] = useState<PropertyType | "">(initial?.property_type ?? "");
  const [side, setSide] = useState<DealSide | "">(initial?.side ?? defaultSide ?? "");
  const [salePrice, setSalePrice] = useState(initial?.sale_price?.toString() ?? "");
  const [commissionAmount, setCommissionAmount] = useState(initial?.commission_amount?.toString() ?? "");
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
        commission_amount: commissionAmount ? Number(commissionAmount) : null,
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
          {mode === "celebrate" ? (
            <div>
              <p className="flex items-center gap-1.5 font-serif text-xl font-semibold text-neutral-900">
                <PartyPopper size={20} className="text-brand-600" /> Nice work!
              </p>
              <p className="mt-0.5 text-sm text-neutral-500">
                {contactName} just closed. Add the deal details while it&apos;s fresh — or skip and fill it in later.
              </p>
            </div>
          ) : (
            <p className="font-serif text-xl font-semibold text-neutral-900">Edit deal</p>
          )}
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
              <Label htmlFor="deal-commission">What you made</Label>
              <Input
                id="deal-commission"
                type="number"
                step="100"
                value={commissionAmount}
                onChange={(e) => setCommissionAmount(e.target.value)}
              />
            </div>
          </div>
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
            {mode === "celebrate" ? "Skip for now" : "Cancel"}
          </Button>
        </div>
      </div>
    </div>
  );
}
