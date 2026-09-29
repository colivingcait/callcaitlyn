"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateExcludedPhotos, updateListingHeroPhoto, updatePadsplitGallery } from "@/app/(app)/listings/actions";
import { SortablePhotoGrid } from "@/components/listings/SortablePhotoGrid";
import { useOrderedItems } from "@/components/listings/useOrderedItems";
import { asPhotoList, asUrlList } from "@/lib/listings/crm-marketing-fields";
import { PHOTO_ORDER_SAVE_ERROR, listKey, revertOrderIfSameMembers, shouldReleaseOrderHold } from "@/lib/listings/photo-order";
import { isExteriorPadsplitPhoto } from "@/lib/listings/padsplit-photos";
import type { PadsplitPhoto } from "@/types/database";

// The public page auto-filters exterior shots (category, tags, alt/title,
// filename — see lib/listings/padsplit-photos.ts). This is the manual
// override on top. Every photo in the active PadSplit set is shown with
// its auto-filter result, so she can see what got dropped and why, and
// override any individual one either direction. Reorder only after Pull
// (curated snapshot); live scrape preview stays read-only for order.
export function PhotoExcludeManager({
  listingId,
  photos,
  excludedUrls,
  heroUrl,
  canReorder = false,
}: {
  listingId: string;
  photos: PadsplitPhoto[] | null;
  excludedUrls: string[] | null;
  heroUrl?: string | null;
  canReorder?: boolean;
}) {
  const router = useRouter();
  const safePhotos = asPhotoList(photos);
  const [excluded, setExcluded] = useState(new Set(asUrlList(excludedUrls)));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [holdKey, setHoldKey] = useState<string | null>(null);
  const [ordered, setOrdered] = useOrderedItems(safePhotos, holdKey, (photo) => photo.url);
  if (shouldReleaseOrderHold(holdKey, safePhotos.map((photo) => photo.url), ordered.map((photo) => photo.url))) setHoldKey(null);

  const items = ordered.map((photo) => ({ id: photo.url, photo }));

  async function persist(work: () => Promise<unknown>) {
    setSaving(true);
    setError("");
    await work();
    setSaving(false);
    router.refresh();
  }

  async function toggle(url: string) {
    const next = new Set(excluded);
    if (next.has(url)) next.delete(url);
    else next.add(url);
    setExcluded(next);
    await persist(() => updateExcludedPhotos(listingId, [...next]));
  }

  async function setHero(url: string | null) {
    await persist(() => updateListingHeroPhoto(listingId, url));
  }

  function reorder(next: PadsplitPhoto[]) {
    const previous = ordered;
    const nextKey = listKey(next, (photo) => photo.url);
    setHoldKey(nextKey);
    setOrdered(next);
    setSaving(true);
    setError("");
    void saveOrder(next, previous, nextKey);
  }

  async function saveOrder(next: PadsplitPhoto[], previous: PadsplitPhoto[], nextKey: string) {
    try {
      const result = await updatePadsplitGallery(listingId, next);
      if (!result.ok) {
        setHoldKey((current) => (current === nextKey ? null : current));
        setOrdered((current) => revertOrderIfSameMembers(current, previous, (photo) => photo.url) ?? current);
        setError(result.error || PHOTO_ORDER_SAVE_ERROR);
        return;
      }
      router.refresh();
    } catch {
      setHoldKey((current) => (current === nextKey ? null : current));
      setOrdered((current) => revertOrderIfSameMembers(current, previous, (photo) => photo.url) ?? current);
      setError(PHOTO_ORDER_SAVE_ERROR);
    } finally {
      setSaving(false);
    }
  }

  if (safePhotos.length === 0) return <p className="text-xs text-neutral-400">No PadSplit photos scraped yet.</p>;

  return (
    <div>
      <p className="mb-2 text-xs text-neutral-500">
        {saving
          ? "Saving…"
          : canReorder
            ? "Drag the handle to reorder. Uncheck a photo to keep it off the public page."
            : "Uncheck a photo to keep it off the public page."}
      </p>
      <SortablePhotoGrid
        items={items}
        enabled={canReorder}
        disabled={saving}
        onReorder={(next) => reorder(next.map((item) => item.photo))}
        renderOverlay={(item) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.photo.url} alt="" draggable={false} className="aspect-square w-full object-cover" />
        )}
        renderItem={(item) => {
          const photo = item.photo;
          const autoFiltered = isExteriorPadsplitPhoto(photo);
          const isExcluded = excluded.has(photo.url) || autoFiltered;
          const isHero = !isExcluded && Boolean(heroUrl) && heroUrl === photo.url;
          return (
            <div className="relative overflow-hidden rounded-xl border border-neutral-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.url} alt="" draggable={false} className={`aspect-square w-full object-cover ${isExcluded ? "opacity-40" : ""}`} />
              <button
                type="button"
                disabled={autoFiltered || excluded.has(photo.url) || saving}
                onClick={() => setHero(isHero ? null : photo.url)}
                className={`absolute right-1.5 top-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold disabled:opacity-30 ${
                  isHero ? "bg-brand-600 text-white" : "bg-black/60 text-white"
                }`}
              >
                {isHero ? "Hero" : "Set as hero"}
              </button>
              <label className="absolute inset-x-0 bottom-0 flex cursor-pointer items-center justify-between gap-1 bg-black/60 px-1.5 py-1">
                <span className="truncate text-[10px] text-white">{autoFiltered ? "auto-excluded" : (photo.category ?? "").replace(/_/g, " ") || "—"}</span>
                <input type="checkbox" checked={!excluded.has(photo.url)} disabled={autoFiltered} onChange={() => toggle(photo.url)} />
              </label>
            </div>
          );
        }}
      />
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
