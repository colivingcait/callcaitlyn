import { createClient } from "@/lib/supabase/server";

export type ConsentSummary = {
  total: number;
  optedOut: number;
  bySource: { label: string; count: number }[];
};

// Buckets the free-text consent_source into the categories the design
// brief shows ("Registered for an event", "Gave you their number in
// person", "Messaged you first") - checked-in-at strings carry the event
// name/date and are never identical twice, so they're matched by prefix
// rather than exact value.
function bucketLabel(source: string | null): string {
  if (!source) return "Other";
  if (source.startsWith("checked in at")) return "Gave you their number in person";
  if (source === "registered for an event") return "Registered for an event";
  if (source === "texted you first") return "Messaged you first";
  return "Manual entry";
}

export async function getConsentSummary(): Promise<ConsentSummary> {
  const supabase = await createClient();
  const { data } = await supabase.from("contacts").select("consent_source, consent_at, opted_out_at").eq("archived", false);
  const rows = data ?? [];

  const optedOut = rows.filter((r) => r.opted_out_at).length;
  const consented = rows.filter((r) => r.consent_at && !r.opted_out_at);

  const buckets = new Map<string, number>();
  for (const r of consented) {
    const label = bucketLabel(r.consent_source);
    buckets.set(label, (buckets.get(label) ?? 0) + 1);
  }

  const bySource = [...buckets.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);

  return { total: consented.length, optedOut, bySource };
}
