"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { addListingPhoto, removeListingPhoto, updateListingHeroPhoto, updateListingPhotoOrder } from "@/app/(app)/listings/actions";

export function PhotoUploader({
  listingId,
  photoUrls,
  photoPaths,
  heroUrl,
}: {
  listingId: string;
  photoUrls: string[];
  photoPaths: string[];
  heroUrl?: string | null;
}) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
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

  async function persist(work: () => Promise<unknown>) {
    setSaving(true);
    await work();
    setSaving(false);
    router.refresh();
  }

  async function handleRemove(path: string) {
    await persist(() => removeListingPhoto(listingId, path));
  }

  async function setHero(url: string | null) {
    await persist(() => updateListingHeroPhoto(listingId, url));
  }

  async function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= photoPaths.length) return;
    const next = [...photoPaths];
    [next[index], next[target]] = [next[target], next[index]];
    await persist(() => updateListingPhotoOrder(listingId, next));
  }

  return (
    <div>
      <p className="mb-1.5 text-sm font-medium text-neutral-700">Uploaded gallery</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {photoUrls.map((url, i) => {
          const isHero = Boolean(heroUrl) && (heroUrl === url || heroUrl === photoPaths[i]);
          return (
            <div key={photoPaths[i]} className="group relative aspect-square overflow-hidden rounded-xl border border-neutral-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-full w-full object-cover" />
              <div className="absolute left-1.5 top-1.5 flex gap-1">
                <button
                  type="button"
                  onClick={() => move(i, -1)}
                  disabled={i === 0 || saving}
                  aria-label="Move earlier"
                  className="rounded-md bg-black/60 p-1 text-white disabled:opacity-30"
                >
                  <ArrowUp size={12} />
                </button>
                <button
                  type="button"
                  onClick={() => move(i, 1)}
                  disabled={i === photoUrls.length - 1 || saving}
                  aria-label="Move later"
                  className="rounded-md bg-black/60 p-1 text-white disabled:opacity-30"
                >
                  <ArrowDown size={12} />
                </button>
              </div>
              <button
                type="button"
                disabled={saving}
                onClick={() => setHero(isHero ? null : url)}
                className={`absolute bottom-1.5 left-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                  isHero ? "bg-brand-600 text-white" : "bg-black/60 text-white"
                }`}
              >
                {isHero ? "Hero" : "Set as hero"}
              </button>
              <button
                type="button"
                onClick={() => handleRemove(photoPaths[i])}
                className="absolute right-1.5 top-1.5 rounded-full bg-black/60 p-1 text-white"
              >
                <X size={13} />
              </button>
            </div>
          );
        })}
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
