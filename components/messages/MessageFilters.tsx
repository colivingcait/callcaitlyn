import Link from "next/link";
import { cn } from "@/lib/utils";

const FILTERS: { key: "owed" | "all" | "calls"; label: string }[] = [
  { key: "owed", label: "Needs a reply" },
  { key: "all", label: "All threads" },
  { key: "calls", label: "Calls only" },
];

export function MessageFilters({ activeFilter, owedCount }: { activeFilter: "owed" | "all" | "calls"; owedCount: number }) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto border-b border-neutral-100 px-4 pb-4">
      {FILTERS.map((f) => (
        <Link
          key={f.key}
          href={f.key === "all" ? "/messages" : `/messages?filter=${f.key}`}
          className={cn(
            "shrink-0 whitespace-nowrap rounded-[10px] px-3.5 py-2 text-sm font-medium",
            activeFilter === f.key ? "bg-neutral-900 font-semibold text-white" : "border border-neutral-200 bg-white text-neutral-600",
          )}
        >
          {f.label}
          {f.key === "owed" && ` · ${owedCount}`}
        </Link>
      ))}
      <Link
        href="/messages?hidden=1"
        className="ml-auto shrink-0 whitespace-nowrap rounded-[10px] border border-neutral-200 bg-white px-3.5 py-2 text-sm font-medium text-neutral-600"
      >
        Hidden
      </Link>
    </div>
  );
}
