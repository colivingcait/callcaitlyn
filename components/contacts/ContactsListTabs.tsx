"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { ContactSegment } from "@/types/database";

const LIST_META_KEYS = new Set(["list", "view", "select"]);

export function ContactsListTabs({ segments, ownerId }: { segments: ContactSegment[]; ownerId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const activeList = searchParams.get("list");

  function go(params: URLSearchParams) {
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  function openAll() {
    go(new URLSearchParams());
  }

  function openSegment(seg: ContactSegment) {
    const params = new URLSearchParams(seg.filters as Record<string, string>);
    params.set("list", seg.id);
    go(params);
  }

  async function saveView() {
    if (!name.trim()) return;
    const filters = Object.fromEntries([...searchParams.entries()].filter(([key]) => !LIST_META_KEYS.has(key)));
    const supabase = createClient();
    const { data, error } = await supabase
      .from("contact_segments")
      .insert({ owner_id: ownerId, name: name.trim(), filters })
      .select("id")
      .maybeSingle();
    if (error || !data) return;
    setName("");
    setSaving(false);
    const params = new URLSearchParams(searchParams.toString());
    params.set("list", data.id);
    go(params);
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-[#eadfd6]">
      <button
        type="button"
        onClick={openAll}
        className={cn(
          "-mb-px border-b-2 px-3 py-2.5 text-[14px] font-medium",
          !activeList ? "border-[#c45c4a] font-semibold text-[#c45c4a]" : "border-transparent text-neutral-500 hover:text-neutral-800",
        )}
      >
        All contacts
      </button>
      {segments.map((seg) => (
        <button
          key={seg.id}
          type="button"
          onClick={() => openSegment(seg)}
          className={cn(
            "-mb-px border-b-2 px-3 py-2.5 text-[14px] font-medium",
            activeList === seg.id ? "border-[#c45c4a] font-semibold text-[#c45c4a]" : "border-transparent text-neutral-500 hover:text-neutral-800",
          )}
        >
          {seg.name}
        </button>
      ))}
      {saving ? (
        <form
          className="mb-1 ml-1 flex items-center gap-1.5"
          onSubmit={(e) => {
            e.preventDefault();
            void saveView();
          }}
        >
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="List name"
            className="h-8 w-36 rounded-lg border border-neutral-200 px-2 text-[13px] text-neutral-900"
          />
          <button type="submit" disabled={!name.trim()} className="text-[13px] font-semibold text-[#c45c4a] disabled:opacity-40">
            Save
          </button>
          <button type="button" onClick={() => setSaving(false)} className="text-[13px] text-neutral-400">
            Cancel
          </button>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setSaving(true)}
          className="mb-0.5 ml-1 inline-flex items-center gap-1 px-2 py-2.5 text-[14px] font-medium text-[#c45c4a]"
        >
          <Plus size={14} /> Save view as list
        </button>
      )}
    </div>
  );
}
