"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import { Search } from "lucide-react";
import { Input, Select } from "@/components/ui";
import { CONTACT_TYPE_LABELS } from "@/lib/utils";
import type { PipelineStage, Tag } from "@/types/database";

export function ContactFilters({ stages, tags }: { stages: PipelineStage[]; tags: Tag[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [, startTransition] = useTransition();

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  return (
    <div className="space-y-3 border-b border-neutral-100 bg-white px-4 py-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
        <Input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            updateParam("q", e.target.value);
          }}
          placeholder="Search name, email, phone…"
          className="pl-10"
        />
      </div>
      <div className="flex gap-2 overflow-x-auto">
        <Select
          className="w-auto shrink-0"
          defaultValue={searchParams.get("stage") ?? ""}
          onChange={(e) => updateParam("stage", e.target.value)}
        >
          <option value="">All stages</option>
          {stages.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
        <Select
          className="w-auto shrink-0"
          defaultValue={searchParams.get("type") ?? ""}
          onChange={(e) => updateParam("type", e.target.value)}
        >
          <option value="">All types</option>
          {Object.entries(CONTACT_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <Select
          className="w-auto shrink-0"
          defaultValue={searchParams.get("tag") ?? ""}
          onChange={(e) => updateParam("tag", e.target.value)}
        >
          <option value="">All tags</option>
          {tags.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}
