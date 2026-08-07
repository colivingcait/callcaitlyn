"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { Upload } from "lucide-react";
import { BulkImportModal } from "@/components/commissions/BulkImportModal";

export function BulkImportButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <Upload size={14} /> Bulk import
      </Button>
      {open && <BulkImportModal onClose={() => setOpen(false)} />}
    </>
  );
}
