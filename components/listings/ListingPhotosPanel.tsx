"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { pullPadsplitGallery, updateListingPhotoSource } from "@/app/(app)/listings/actions";
import { asPhotoList, asUrlList } from "@/lib/listings/crm-marketing-fields";
import { hasCuratedPadsplitGallery, importablePadsplitPhotos, listingPhotoSource } from "@/lib/listings/padsplit-photos";
import { PhotoExcludeManager } from "@/components/listings/PhotoExcludeManager";
import { PhotoUploader } from "@/components/listings/PhotoUploader";
import { cn } from "@/lib/utils";
import type { ListingPhotoSource, PadsplitPhoto } from "@/types/database";

export function ListingPhotosPanel({
  listingId,
  photoSource,
  heroPhotoUrl,
  photoUrls,
  photoPaths,
  padsplitPhotos,
  padsplitGallery,
  excludedUrls,
}: {
  listingId: string;
  photoSource: unknown;
  heroPhotoUrl: string | null;
  photoUrls: string[];
  photoPaths: string[];
  padsplitPhotos: PadsplitPhoto[] | null;
  padsplitGallery: PadsplitPhoto[] | null;
  excludedUrls: string[] | null;
}) {
  const router = useRouter();
  const source = listingPhotoSource({
    photo_source: photoSource === "padsplit" || photoSource === "manual" ? photoSource : undefined,
    padsplit_photos: asPhotoList(padsplitPhotos),
    excluded_photo_urls: asUrlList(excludedUrls),
  });
  const curated = asPhotoList(padsplitGallery);
  const pulled = hasCuratedPadsplitGallery({ padsplit_gallery: curated });
  const importableCount = importablePadsplitPhotos({ padsplit_photos: asPhotoList(padsplitPhotos) }).length;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function setSource(next: ListingPhotoSource) {
    if (next === source) return;
    setSaving(true);
    setError("");
    const result = await updateListingPhotoSource(listingId, next);
    setSaving(false);
    if (!result.ok) setError(result.error);
    router.refresh();
  }

  async function pull() {
    if (pulled && !confirm("Replace the curated PadSplit gallery with the current scrape? Order will reset. Hero stays if that photo is still included.")) {
      return;
    }
    setSaving(true);
    setError("");
    const result = await pullPadsplitGallery(listingId);
    setSaving(false);
    if (!result.ok) setError(result.error);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[#ebe9e7] bg-white p-[18px]">
        <h2 className="text-base font-semibold text-neutral-900">Public photo source</h2>
        <p className="mt-1 text-sm text-neutral-500">
          The offering memorandum and listing cards use one source. Switching keeps the other gallery.
        </p>
        <div className="mt-3 inline-flex rounded-full border border-neutral-200 bg-white p-0.5 text-xs font-medium">
          {(
            [
              ["padsplit", "PadSplit snapshot"],
              ["manual", "My uploads"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              disabled={saving}
              onClick={() => setSource(value)}
              className={cn("rounded-full px-3 py-1.5 disabled:opacity-50", source === value ? "bg-brand-600 text-white" : "text-neutral-500")}
            >
              {label}
            </button>
          ))}
        </div>
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      </div>

      {source === "padsplit" ? (
        <div className="rounded-2xl border border-[#ebe9e7] bg-white p-[18px]">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-neutral-900">PadSplit photos</h2>
              <p className="mt-1 text-sm text-neutral-500">
                {pulled
                  ? "Curated snapshot. Daily occupancy scrape will not replace this gallery, order, or hero."
                  : "Not pulled yet. Public OM still uses last-scrape interiors until you pull a curated copy."}
              </p>
            </div>
            <button
              type="button"
              onClick={pull}
              disabled={saving || importableCount === 0}
              className="shrink-0 rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-semibold text-neutral-700 disabled:opacity-50"
            >
              {saving ? "Saving…" : pulled ? "Re-pull from PadSplit" : "Pull from PadSplit"}
            </button>
          </div>
          <PhotoExcludeManager
            listingId={listingId}
            photos={pulled ? curated : asPhotoList(padsplitPhotos)}
            excludedUrls={asUrlList(excludedUrls)}
            heroUrl={heroPhotoUrl}
            canReorder={pulled}
          />
        </div>
      ) : (
        <div className="rounded-2xl border border-[#ebe9e7] bg-white p-[18px]">
          <h2 className="mb-3 text-base font-semibold text-neutral-900">Uploaded photos</h2>
          <PhotoUploader listingId={listingId} photoUrls={photoUrls} photoPaths={photoPaths} heroUrl={heroPhotoUrl} />
        </div>
      )}
    </div>
  );
}
