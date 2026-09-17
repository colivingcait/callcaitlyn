"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { buildAgentTemplates } from "@/lib/listings/agent-templates";

export function CopyBlocks({
  address,
  listPrice,
  specs,
  story,
  zillowUrl,
}: {
  address: string;
  listPrice: number | null;
  specs: string;
  story: string | null;
  zillowUrl: string | null;
}) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const price = formatCurrency(listPrice);
  const teaser = story ? story.split(/\.\s/)[0] : `${specs}.`;
  // Same wording the composer's "Just listed" template sends, so pasting
  // this somewhere and sending the actual text read the same way.
  const agentText = buildAgentTemplates(address, price, zillowUrl).find((t) => t.label === "Just listed")?.body ?? "";

  const blocks = [
    { key: "fb", label: "Facebook post", body: `Just listed — ${address}, ${price}. ${teaser}. DM me for the numbers.` },
    { key: "ig", label: "Instagram caption", body: `New listing 🏠 ${address} — ${price} — ${specs}. ${teaser}.` },
    { key: "agentEmail", label: "Email to matched agents", body: `Your buyer came up on reverse prospecting for my new listing at ${address} — ${price}, ${specs}. Full photos and showing instructions are in FMLS; happy to open it up this weekend if that helps.` },
    { key: "agentText", label: "Text to matched agents", body: agentText },
  ];

  async function copy(key: string, body: string) {
    try {
      await navigator.clipboard.writeText(body);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), 1500);
    } catch {
      // Clipboard access denied - nothing to fall back to worth building for a "Copy" button.
    }
  }

  return (
    <div className="space-y-2.5">
      {blocks.map((b) => (
        <div key={b.key} className="rounded-xl border border-neutral-100 bg-neutral-50 p-3.5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">{b.label}</p>
            <button type="button" onClick={() => copy(b.key, b.body)} className="text-sm font-medium text-brand-700">
              {copiedKey === b.key ? "Copied" : "Copy"}
            </button>
          </div>
          <p className="mt-1.5 text-sm leading-5 text-neutral-800">{b.body}</p>
        </div>
      ))}
    </div>
  );
}
