"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { addListingPhoto, removeListingPhoto, updateListingHeroPhoto, updateListingPhotoOrder } from "@/app/(app)/listings/actions";
import { SortablePhotoGrid } from "@/components/listings/SortablePhotoGrid";
import { useOrderedItems } from "@/components/listings/useOrderedItems";
import { PHOTO_ORDER_SAVE_ERROR, listKey, revertOrderIfSameMembers, shouldReleaseOrderHold } from "@/lib/listings/photo-order";
import { createClient } from "@/lib/supabase/client";

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
  const [holdKey, setHoldKey] = useState<string | null>(null);
  const [paths, setPaths] = useOrderedItems(photoPaths, holdKey);
  if (shouldReleaseOrderHold(holdKey, photoPaths, paths)) setHoldKey(null);

  const items = paths.map((path) => ({
    id: path,
    path,
    url: photoUrls[photoPaths.indexOf(path)] ?? "",
  }));

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
    setError("");
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

  function reorder(nextPaths: string[]) {
    const previous = paths;
    const nextKey = listKey(nextPaths);
    setHoldKey(nextKey);
    setPaths(nextPaths);
    setSaving(true);
    setError("");
    void saveOrder(nextPaths, previous, nextKey);
  }

  async function saveOrder(nextPaths: string[], previous: string[], nextKey: string) {
    try {
      const result = await updateListingPhotoOrder(listingId, nextPaths);
      if (!result.ok) {
        setHoldKey((current) => (current === nextKey ? null : current));
        setPaths((current) => revertOrderIfSameMembers(current, previous, (path) => path) ?? current);
        setError(result.error || PHOTO_ORDER_SAVE_ERROR);
        return;
      }
      router.refresh();
    } catch {
      setHoldKey((current) => (current === nextKey ? null : current));
      setPaths((current) => revertOrderIfSameMembers(current, previous, (path) => path) ?? current);
      setError(PHOTO_ORDER_SAVE_ERROR);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <p className="mb-1.5 text-sm font-medium text-neutral-700">Uploaded gallery</p>
      {paths.length > 1 && <p className="mb-2 text-xs text-neutral-500">Drag the handle to reorder. The public gallery follows this order.</p>}
      <SortablePhotoGrid
        items={items}
        disabled={saving}
        onReorder={(next) => reorder(next.map((item) => item.path))}
        renderOverlay={(item) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.url} alt="" draggable={false} className="aspect-square w-full object-cover" />
        )}
        trailing={
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            disabled={uploading}
            className="flex aspect-square items-center justify-center rounded-xl border-2 border-dashed border-neutral-300 text-sm font-medium text-neutral-400 disabled:opacity-50"
          >
            {uploading ? "Uploading…" : "+ Add"}
          </button>
        }
        renderItem={(item) => {
          const isHero = Boolean(heroUrl) && (heroUrl === item.url || heroUrl === item.path);
          return (
            <div className="group relative aspect-square overflow-hidden rounded-xl border border-neutral-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.url} alt="" draggable={false} className="h-full w-full object-cover" />
              <button
                type="button"
                disabled={saving}
                onClick={() => setHero(isHero ? null : item.url)}
                className={`absolute bottom-1.5 left-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                  isHero ? "bg-brand-600 text-white" : "bg-black/60 text-white"
                }`}
              >
                {isHero ? "Hero" : "Set as hero"}
              </button>
              <button
                type="button"
                onClick={() => handleRemove(item.path)}
                aria-label="Remove photo"
                className="absolute right-1.5 top-1.5 rounded-full bg-black/60 p-1 text-white"
              >
                <X size={13} />
              </button>
            </div>
          );
        }}
      />
      <input ref={fileInput} type="file" accept="image/*" multiple className="hidden" onChange={handleFiles} />
      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
    </div>
  );
}
