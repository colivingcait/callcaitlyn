"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { addListingPhoto, removeListingPhoto } from "@/app/(app)/listings/actions";

export function PhotoUploader({ listingId, photoUrls, photoPaths }: { listingId: string; photoUrls: string[]; photoPaths: string[] }) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setUploading(true);
    setError("");

    const supabase = createClient();
    for (const file of files) {
      const path = `${listingId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { error: uploadError } = await supabase.storage.from("listing-photos").upload(path, file);
      if (uploadError) {
        setError(uploadError.message);
        continue;
      }
      await addListingPhoto(listingId, path);
    }

    setUploading(false);
    if (fileInput.current) fileInput.current.value = "";
    router.refresh();
  }

  async function handleRemove(path: string) {
    await removeListingPhoto(listingId, path);
    router.refresh();
  }

  return (
    <div>
      <p className="mb-1.5 text-sm font-medium text-neutral-700">Photos — drop 3 to 6</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {photoUrls.map((url, i) => (
          <div key={photoPaths[i]} className="group relative aspect-square overflow-hidden rounded-xl border border-neutral-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => handleRemove(photoPaths[i])}
              className="absolute right-1.5 top-1.5 rounded-full bg-black/60 p-1 text-white"
            >
              <X size={13} />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          disabled={uploading}
          className="flex aspect-square items-center justify-center rounded-xl border-2 border-dashed border-neutral-300 text-sm font-medium text-neutral-400 disabled:opacity-50"
        >
          {uploading ? "Uploading…" : "+ Add"}
        </button>
      </div>
      <input ref={fileInput} type="file" accept="image/*" multiple className="hidden" onChange={handleFiles} />
      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
    </div>
  );
}
