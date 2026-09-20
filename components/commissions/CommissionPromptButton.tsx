"use client";

import { useState } from "react";
import { DealCelebrationModal } from "@/components/contacts/DealCelebrationModal";
import { AddPastDealModal } from "@/components/commissions/AddPastDealModal";
import type { Deal } from "@/types/database";

export function CommissionPromptButton({
  deal,
  listing,
}: {
  deal?: Deal & { contacts?: { first_name: string; last_name: string } | null; client_name?: string | null };
  listing?: { id: string; address: string; list_price: number | null };
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-[12px] font-medium text-neutral-400 hover:text-brand-700"
      >
        Commissions prompt
      </button>
      {open && deal && (
        <DealCelebrationModal
          dealId={deal.id}
          contactName={deal.contacts ? `${deal.contacts.first_name} ${deal.contacts.last_name}`.trim() : deal.client_name ?? deal.address ?? "This deal"}
          defaultLeadStartedAt={deal.lead_started_at}
          defaultSide={null}
          initial={deal}
          mode="edit"
          onClose={() => setOpen(false)}
        />
      )}
      {open && !deal && listing && <AddPastDealModal onClose={() => setOpen(false)} initialAddress={listing.address} initialSalePrice={listing.list_price} pending />}
    </>
  );
}
