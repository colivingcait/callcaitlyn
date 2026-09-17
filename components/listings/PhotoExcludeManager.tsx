"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateExcludedPhotos } from "@/app/(app)/listings/actions";
import { asPhotoList, asUrlList } from "@/lib/listings/crm-marketing-fields";
import type { PadsplitPhoto } from "@/types/database";

const EXTERIOR = /exterior|front|back|yard|street|curb|driveway|porch|roof|outside/i;

// The public page auto-filters exterior shots by category (withheld at the
// seller's request), but the regex will miss things - this is the manual
// override on top, per the client's explicit requirement. Every scraped
// photo is shown here with its auto-filter result, so she can see what got
// dropped and why, and override any individual one either direction.
export function PhotoExcludeManager({ listingId, photos, excludedUrls }: { listingId: string; photos: PadsplitPhoto[] | null; excludedUrls: string[] | null }) {
  const router = useRouter();
  const safePhotos = asPhotoList(photos);
  const [excluded, setExcluded] = useState(new Set(asUrlList(excludedUrls)));
  const [saving, setSaving] = useState(false);

  async function toggle(url: string) {
    const next = new Set(excluded);
    if (next.has(url)) next.delete(url);
    else next.add(url);
    setExcluded(next);
    setSaving(true);
    await updateExcludedPhotos(listingId, [...next]);
    setSaving(false);
    router.refresh();
  }

  if (safePhotos.length === 0) return <p className="text-xs text-neutral-400">No PadSplit photos scraped yet.</p>;

  return (
    <div>
      <p className="mb-2 text-xs text-neutral-500">{saving ? "Saving…" : "Uncheck a photo to keep it off the public page."}</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {safePhotos.map((photo) => {
          const autoFiltered = EXTERIOR.test(photo.category ?? "");
          const isExcluded = excluded.has(photo.url) || autoFiltered;
          return (
            <label key={photo.url} className="relative block cursor-pointer overflow-hidden rounded-xl border border-neutral-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.url} alt="" className={`aspect-square w-full object-cover ${isExcluded ? "opacity-40" : ""}`} />
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-black/60 px-1.5 py-1">
                <span className="truncate text-[10px] text-white">{autoFiltered ? "auto-excluded" : (photo.category ?? "").replace(/_/g, " ") || "—"}</span>
                <input type="checkbox" checked={!excluded.has(photo.url)} disabled={autoFiltered} onChange={() => toggle(photo.url)} />
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
}
