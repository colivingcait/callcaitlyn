import Link from "next/link";
import { listSequencesWithSummary, getAllSequencesSummary } from "@/lib/data/sequences";
import { listTags, listStages } from "@/lib/data/contacts";
import { CreateSequenceForm } from "@/components/sequences/CreateSequenceForm";
import { SequencesDashboard } from "@/components/sequences/SequencesDashboard";
import { CampaignsTabNav } from "@/components/sequences/CampaignsTabNav";
import { Card, Badge } from "@/components/ui";
import { formatLocal } from "@/lib/format-time";
import { createClient } from "@/lib/supabase/server";

export default async function SequencesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [sequences, tags, stages, summary] = await Promise.all([
    listSequencesWithSummary(),
    listTags(),
    listStages(),
    getAllSequencesSummary(),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold text-neutral-900">Bulk Communication</h1>
        <p className="mt-0.5 text-sm text-neutral-500">
          Scheduled sequences, drip campaigns, one-off batch emails, and text reminders to your meetup community.
        </p>
      </div>

      <CampaignsTabNav />

      {summary.totalCount > 0 && <SequencesDashboard summary={summary} />}

      {user && <CreateSequenceForm tags={tags} stages={stages} ownerId={user.id} />}

      <div className="space-y-2">
        {sequences.map((seq) => (
          <Link key={seq.id} href={`/sequences/${seq.id}`}>
            <Card className="space-y-2 hover:bg-neutral-50">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-neutral-900">{seq.name}</p>
                  <p className="text-xs text-neutral-400">
                    {seq.type === "broadcast" ? "Scheduled" : seq.type === "batch" ? "Batch email" : "Drip"}
                    {!seq.active && " · Paused"}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap justify-end gap-1">
                  {seq.targetTags.map((t) => (
                    <Badge key={t.id} className="max-w-[8rem] truncate" color={t.color}>
                      {t.name}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500">
                {seq.type === "drip" && <span>{seq.activeEnrolled} enrolled</span>}
                {seq.type !== "drip" && seq.nextSendAt && <span>Next send: {formatLocal(seq.nextSendAt, "MMM d, h:mm a")}</span>}
                {seq.type !== "drip" && seq.sendingNow && <span className="font-medium text-amber-600">Sending…</span>}
                {seq.sentTotal > 0 && (
                  <span>
                    {seq.sentTotal} sent · {seq.openRate.toFixed(0)}% opened
                  </span>
                )}
              </div>
            </Card>
          </Link>
        ))}
        {sequences.length === 0 && <p className="text-sm text-neutral-500">No sequences yet — create one above.</p>}
      </div>
    </div>
  );
}
