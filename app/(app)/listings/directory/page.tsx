import Link from "next/link";
import { getAgentDirectory } from "@/lib/data/listings";
import { formatPhone, cn } from "@/lib/utils";
import { formatLocal } from "@/lib/format-time";
import { AddAgentButton } from "@/components/listings/AddAgentButton";

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

type Filter = "all" | "multi" | "manual" | "stale" | "opted_out";

export default async function AgentDirectoryPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const { filter: rawFilter } = await searchParams;
  const filter: Filter = (["all", "multi", "manual", "stale", "opted_out"] as Filter[]).includes(rawFilter as Filter) ? (rawFilter as Filter) : "all";

  const agents = await getAgentDirectory();
  const now = Date.now();

  const counts = {
    all: agents.length,
    multi: agents.filter((a) => a.listingCount >= 2).length,
    manual: agents.filter((a) => a.source === "manual").length,
    stale: agents.filter((a) => !a.opted_out_at && (!a.last_emailed_at || now - new Date(a.last_emailed_at).getTime() > NINETY_DAYS_MS)).length,
    opted_out: agents.filter((a) => a.opted_out_at).length,
  };

  const filtered = agents.filter((a) => {
    if (filter === "multi") return a.listingCount >= 2;
    if (filter === "manual") return a.source === "manual";
    if (filter === "stale") return !a.opted_out_at && (!a.last_emailed_at || now - new Date(a.last_emailed_at).getTime() > NINETY_DAYS_MS);
    if (filter === "opted_out") return !!a.opted_out_at;
    return true;
  });

  const FILTERS: { key: Filter; label: string }[] = [
    { key: "all", label: `All ${counts.all}` },
    { key: "multi", label: `On 2+ of my listings ${counts.multi}` },
    { key: "manual", label: `Added by hand ${counts.manual}` },
    { key: "stale", label: `Not emailed in 90 days ${counts.stale}` },
    { key: "opted_out", label: `Opted out ${counts.opted_out}` },
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="font-serif text-2xl font-semibold text-neutral-900 sm:text-[28px]">Listings</h1>
      <p className="mt-1 text-[15px] text-neutral-500">The directory spans every listing — it is not inside one.</p>

      <div className="mt-4 flex gap-1 border-b border-neutral-200">
        <Link href="/listings" className="border-b-2 border-transparent px-3 py-2.5 text-sm font-medium text-neutral-500 hover:text-neutral-700">
          Listings
        </Link>
        <span className="border-b-2 border-brand-600 px-3 py-2.5 text-sm font-medium text-brand-700">Agent directory</span>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-neutral-500">{agents.length} agents across every listing you&apos;ve imported, plus ones added by hand.</p>
        <AddAgentButton />
      </div>

      <div data-noscrollbar className="mt-3 flex gap-2 overflow-x-auto">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={f.key === "all" ? "/listings/directory" : `/listings/directory?filter=${f.key}`}
            className={cn(
              "flex h-9 shrink-0 items-center whitespace-nowrap rounded-full px-3 text-sm font-medium",
              filter === f.key ? "bg-neutral-900 text-white" : "border border-neutral-200 bg-white text-neutral-600",
            )}
          >
            {f.label}
          </Link>
        ))}
      </div>

      <div className="mt-3 space-y-2">
        {filtered.length === 0 ? (
          <p className="rounded-2xl border border-[#ebe9e7] bg-white px-4 py-8 text-center text-[15px] text-neutral-400">No one matches this filter.</p>
        ) : (
          filtered.map((a) => (
            <div key={a.id} className="flex items-start justify-between gap-3 rounded-2xl border border-[#ebe9e7] bg-white px-4 py-3.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold text-neutral-900">{a.name}</p>
                <p className="mt-0.5 truncate text-sm text-neutral-600">{a.brokerage || "—"}</p>
                <p className="mt-0.5 truncate text-sm text-neutral-400">{[a.email, formatPhone(a.phone)].filter(Boolean).join(" · ") || "No contact on file"}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm text-neutral-500">
                  {a.listingCount === 0 ? "Never on an RP list" : `${a.listingCount} listing${a.listingCount === 1 ? "" : "s"}`}
                  {a.opted_out_at ? ` · opted out ${formatLocal(a.opted_out_at, "MMM d")}` : a.last_emailed_at ? ` · last emailed ${formatLocal(a.last_emailed_at, "MMM d")}` : ""}
                </p>
                <p className="mt-0.5 text-sm text-neutral-400">{a.source === "manual" ? "Added manually" : a.source === "gamls" ? "GAMLS import" : "FMLS import"}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
