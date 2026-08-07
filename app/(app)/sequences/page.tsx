import Link from "next/link";
import { listSequences } from "@/lib/data/sequences";
import { listTags } from "@/lib/data/contacts";
import { CreateSequenceForm } from "@/components/sequences/CreateSequenceForm";
import { Card, Badge } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";

export default async function SequencesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [sequences, tags] = await Promise.all([listSequences(), listTags()]);

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold text-neutral-900">Sequences</h1>
        <p className="mt-0.5 text-sm text-neutral-500">
          Scheduled event reminders and drip campaigns, both triggered off a tag.
        </p>
      </div>

      {user && <CreateSequenceForm tags={tags} ownerId={user.id} />}

      <div className="space-y-2">
        {sequences.map((seq) => (
          <Link key={seq.id} href={`/sequences/${seq.id}`}>
            <Card className="flex items-center justify-between gap-3 hover:bg-neutral-50">
              <div>
                <p className="font-medium text-neutral-900">{seq.name}</p>
                <p className="text-xs text-neutral-400">
                  {seq.type === "broadcast" ? "Scheduled" : "Drip"}
                  {!seq.active && " · Paused"}
                </p>
              </div>
              {seq.tags && <Badge color={seq.tags.color}>{seq.tags.name}</Badge>}
            </Card>
          </Link>
        ))}
        {sequences.length === 0 && <p className="text-sm text-neutral-500">No sequences yet — create one above.</p>}
      </div>
    </div>
  );
}
