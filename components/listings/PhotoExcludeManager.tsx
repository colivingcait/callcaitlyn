"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp } from "lucide-react";
import { updateExcludedPhotos, updateListingHeroPhoto, updatePadsplitGallery } from "@/app/(app)/listings/actions";
import { asPhotoList, asUrlList } from "@/lib/listings/crm-marketing-fields";
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

  async function persist(work: () => Promise<unknown>) {
    setSaving(true);
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

  async function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= safePhotos.length) return;
    const next = [...safePhotos];
    [next[index], next[target]] = [next[target], next[index]];
    await persist(() => updatePadsplitGallery(listingId, next));
  }

  if (safePhotos.length === 0) return <p className="text-xs text-neutral-400">No PadSplit photos scraped yet.</p>;

  return (
    <div>
      <p className="mb-2 text-xs text-neutral-500">{saving ? "Saving…" : "Uncheck a photo to keep it off the public page."}</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {safePhotos.map((photo, index) => {
          const autoFiltered = isExteriorPadsplitPhoto(photo);
          const isExcluded = excluded.has(photo.url) || autoFiltered;
          const isHero = !isExcluded && Boolean(heroUrl) && heroUrl === photo.url;
          return (
            <div key={photo.url} className="relative overflow-hidden rounded-xl border border-neutral-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.url} alt="" className={`aspect-square w-full object-cover ${isExcluded ? "opacity-40" : ""}`} />
              <div className="absolute left-1.5 top-1.5 flex gap-1">
                {canReorder && (
                  <>
                    <button
                      type="button"
                      onClick={() => move(index, -1)}
                      disabled={index === 0 || saving}
                      aria-label="Move earlier"
                      className="rounded-md bg-black/60 p-1 text-white disabled:opacity-30"
                    >
                      <ArrowUp size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() => move(index, 1)}
                      disabled={index === safePhotos.length - 1 || saving}
                      aria-label="Move later"
                      className="rounded-md bg-black/60 p-1 text-white disabled:opacity-30"
                    >
                      <ArrowDown size={12} />
                    </button>
                  </>
                )}
              </div>
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
        })}
      </div>
    </div>
  );
}
