import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getSequence,
  getSequenceSteps,
  getSequenceStepStats,
  getSequenceEnrollmentCount,
  getSequenceExclusions,
} from "@/lib/data/sequences";
import { StepManager } from "@/components/sequences/StepManager";
import { SequenceToggle } from "@/components/sequences/SequenceToggle";
import { Card, Badge } from "@/components/ui";
import { formatLocal } from "@/lib/format-time";
import { fullName } from "@/lib/utils";
import { ChevronLeft } from "lucide-react";

export default async function SequenceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [sequence, steps, stats, exclusions] = await Promise.all([
    getSequence(id),
    getSequenceSteps(id),
    getSequenceStepStats(id),
    getSequenceExclusions(id),
  ]);
  if (!sequence) notFound();

  const enrollmentCount = sequence.type === "drip" ? await getSequenceEnrollmentCount(id) : null;

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-6">
      <Link href="/sequences" className="flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700">
        <ChevronLeft size={16} /> Sequences
      </Link>

      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-neutral-900">{sequence.name}</h1>
          <p className="mt-0.5 flex items-center gap-2 text-sm text-neutral-500">
            {sequence.type === "broadcast" ? "Scheduled" : "Drip"}
            {sequence.tags && <Badge color={sequence.tags.color}>{sequence.tags.name}</Badge>}
            {!sequence.active && <Badge className="bg-neutral-100 text-neutral-600">Paused</Badge>}
          </p>
          {enrollmentCount !== null && (
            <p className="mt-1 text-xs text-neutral-400">{enrollmentCount} actively enrolled</p>
          )}
        </div>
        <SequenceToggle sequenceId={sequence.id} active={sequence.active} />
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-neutral-700">Steps</h2>
        <StepManager sequenceId={sequence.id} type={sequence.type} steps={steps} stats={stats} />
      </div>

      {exclusions.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-semibold text-neutral-700">Unsubscribed from this sequence</h2>
          <Card className="divide-y divide-neutral-100 p-0">
            {exclusions.map((ex, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <span className="text-neutral-700">{ex.contacts ? fullName(ex.contacts) : "Unknown"}</span>
                <span className="text-xs text-neutral-400">{formatLocal(ex.excluded_at, "MMM d, yyyy")}</span>
              </div>
            ))}
          </Card>
        </div>
      )}
    </div>
  );
}
