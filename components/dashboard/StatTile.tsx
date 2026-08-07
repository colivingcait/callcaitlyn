import { cn } from "@/lib/utils";

export function StatTile({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number | string;
  tone?: "default" | "warning" | "critical" | "good";
}) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">{label}</p>
      <p
        className={cn(
          "mt-1 text-2xl font-semibold",
          tone === "default" && "text-neutral-900",
          tone === "warning" && "text-amber-600",
          tone === "critical" && "text-red-600",
          tone === "good" && "text-emerald-600",
        )}
      >
        {value}
      </p>
    </div>
  );
}
