"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy } from "lucide-react";
import { setListingPublicPage } from "@/app/(app)/listings/actions";

// For a listing with no real MLS/Zillow presence: her own "own Zillow"
// public marketing page. Turning this on is the entire integration with
// the existing agent-outreach templates - see setListingPublicPage's
// comment for why (auto-fills the Zillow field rather than needing the
// template code to know about a second kind of link).
export function PublicPageToggle({ listingId, publicSlug, appOrigin }: { listingId: string; publicSlug: string | null; appOrigin: string }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const url = publicSlug ? `${appOrigin}/listing/${publicSlug}` : null;

  async function toggle(enabled: boolean) {
    setSaving(true);
    setError("");
    const result = await setListingPublicPage(listingId, enabled);
    setSaving(false);
    if (!result.ok) setError(result.error);
    router.refresh();
  }

  async function copyLink() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard blocked (permissions, non-secure context) - the link is
      // still shown on screen to copy by hand, nothing else to do here.
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-neutral-200 p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-neutral-800">Public marketing page</p>
          <p className="text-xs text-neutral-400">Your own &quot;Zillow&quot; page for listings not on the MLS.</p>
        </div>
        <button
          type="button"
          onClick={() => toggle(!publicSlug)}
          disabled={saving}
          className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold disabled:opacity-50 ${
            publicSlug ? "bg-brand-600 text-white" : "border border-neutral-200 text-neutral-700"
          }`}
        >
          {saving ? "Saving…" : publicSlug ? "On" : "Off"}
        </button>
      </div>
      {url && (
        <div className="flex items-center gap-2 rounded-lg bg-neutral-50 px-2.5 py-2">
          <p className="min-w-0 flex-1 truncate text-xs text-neutral-600">{url}</p>
          <button type="button" onClick={copyLink} className="shrink-0 text-neutral-400 hover:text-neutral-600">
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </button>
        </div>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
