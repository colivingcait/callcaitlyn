"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { Plus } from "lucide-react";
import { AddPastDealModal } from "@/components/commissions/AddPastDealModal";

export function AddPastDealButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <Plus size={14} /> Add past deal
      </Button>
      {open && <AddPastDealModal onClose={() => setOpen(false)} />}
    </>
  );
}
