"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { addListingDocument, removeListingDocument } from "@/app/(app)/listings/actions";
import type { ListingDocument, ListingDocumentType } from "@/types/database";

const LABELS: Record<ListingDocumentType, string> = {
  earnings_statement: "Earnings statement",
  t12: "T12",
};

// Mirrors PhotoUploader's shape (upload straight to storage from the
// browser, then record the path), but against the private
// "listing-documents" bucket and typed by doc type instead of a bare
// photo_paths array - these two files are what the public page's gate
// sends out, so there's exactly one slot each, not an open-ended list.
export function DocumentUploader({ listingId, documents }: { listingId: string; documents: ListingDocument[] }) {
  const router = useRouter();
  const [uploading, setUploading] = useState<ListingDocumentType | null>(null);
  const [error, setError] = useState("");
  const fileInputs = { earnings_statement: useRef<HTMLInputElement>(null), t12: useRef<HTMLInputElement>(null) };
  const byType = new Map(documents.map((d) => [d.doc_type, d]));

  async function handleFile(docType: ListingDocumentType, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(docType);
    setError("");

    const supabase = createClient();
    const path = `${listingId}/${docType}-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const { error: uploadError } = await supabase.storage.from("listing-documents").upload(path, file);
    if (uploadError) {
      setError(uploadError.message);
    } else {
      await addListingDocument(listingId, docType, path);
    }

    setUploading(null);
    const input = fileInputs[docType].current;
    if (input) input.value = "";
    router.refresh();
  }

  async function handleRemove(docType: ListingDocumentType) {
    await removeListingDocument(listingId, docType);
    router.refresh();
  }

  return (
    <div>
      <p className="mb-1.5 text-sm font-medium text-neutral-700">Financial documents</p>
      <p className="mb-2 text-xs text-neutral-400">Sent automatically (email + text) to anyone who requests the packet on the public page.</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {(Object.keys(LABELS) as ListingDocumentType[]).map((docType) => {
          const doc = byType.get(docType);
          return (
            <div key={docType} className="flex items-center justify-between gap-2 rounded-xl border border-neutral-200 px-3 py-2.5">
              <div className="flex min-w-0 items-center gap-2">
                <FileText size={16} className="shrink-0 text-neutral-400" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-neutral-800">{LABELS[docType]}</p>
                  <p className="truncate text-xs text-neutral-400">{doc ? "Uploaded" : "Not uploaded yet"}</p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                {doc && (
                  <button type="button" onClick={() => handleRemove(docType)} className="rounded-full p-1 text-neutral-400 hover:text-neutral-600">
                    <X size={14} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => fileInputs[docType].current?.click()}
                  disabled={uploading === docType}
                  className="rounded-lg border border-neutral-200 px-2.5 py-1.5 text-xs font-semibold text-neutral-700 disabled:opacity-50"
                >
                  {uploading === docType ? "Uploading…" : doc ? "Replace" : "Upload"}
                </button>
              </div>
              <input
                ref={fileInputs[docType]}
                type="file"
                accept=".pdf,.xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => handleFile(docType, e)}
              />
            </div>
          );
        })}
      </div>
      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
    </div>
  );
}
