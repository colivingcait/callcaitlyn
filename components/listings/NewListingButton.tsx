"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button, Input, Label } from "@/components/ui";
import { createListing } from "@/app/(app)/listings/actions";

export function NewListingButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [address, setAddress] = useState("");
  const [listPrice, setListPrice] = useState("");
  const [beds, setBeds] = useState("");
  const [baths, setBaths] = useState("");
  const [sqft, setSqft] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [mlsNumber, setMlsNumber] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleCreate() {
    setSaving(true);
    setError("");
    const result = await createListing({
      address,
      listPrice: listPrice ? Number(listPrice) : undefined,
      beds: beds ? Number(beds) : undefined,
      baths: baths ? Number(baths) : undefined,
      sqft: sqft ? Number(sqft) : undefined,
      propertyType: propertyType || undefined,
      mlsNumber: mlsNumber || undefined,
    });
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setOpen(false);
    router.push(`/listings/${result.id}`);
  }

  if (!open) {
    return (
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus size={15} /> New listing
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4">
      <div className="max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:max-w-md sm:rounded-2xl">
        <p className="font-serif text-xl font-semibold text-neutral-900">New listing</p>
        <div className="mt-4 space-y-3">
          <div>
            <Label htmlFor="listing-address">Address</Label>
            <Input id="listing-address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="654 Gillette Ave" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label htmlFor="listing-price">List price</Label>
              <Input id="listing-price" type="number" step="1000" value={listPrice} onChange={(e) => setListPrice(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="listing-beds">Beds</Label>
              <Input id="listing-beds" type="number" value={beds} onChange={(e) => setBeds(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="listing-baths">Baths</Label>
              <Input id="listing-baths" type="number" step="0.5" value={baths} onChange={(e) => setBaths(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="listing-sqft">Square feet</Label>
              <Input id="listing-sqft" type="number" value={sqft} onChange={(e) => setSqft(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="listing-mls">MLS number</Label>
              <Input id="listing-mls" value={mlsNumber} onChange={(e) => setMlsNumber(e.target.value)} placeholder="FMLS 7412398" />
            </div>
          </div>
          <div>
            <Label htmlFor="listing-type">Property type</Label>
            <Input id="listing-type" value={propertyType} onChange={(e) => setPropertyType(e.target.value)} placeholder="Legal duplex" />
          </div>
        </div>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        <div className="mt-5 flex gap-3">
          <Button onClick={handleCreate} disabled={saving || !address.trim()} className="flex-1">
            {saving ? "Creating…" : "Create listing"}
          </Button>
          <Button variant="secondary" onClick={() => setOpen(false)} disabled={saving}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
