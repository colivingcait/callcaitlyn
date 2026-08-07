import { createClient } from "@/lib/supabase/server";
import { listStages, listTags } from "@/lib/data/contacts";
import { StageManager } from "@/components/settings/StageManager";
import { TagManager } from "@/components/settings/TagManager";
import { Card } from "@/components/ui";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [stages, tags] = await Promise.all([listStages(), listTags()]);

  return (
    <div className="mx-auto max-w-2xl space-y-5 px-4 py-6">
      <h1 className="text-xl font-semibold text-neutral-900">Settings</h1>

      {user && <StageManager stages={stages} ownerId={user.id} />}
      {user && <TagManager tags={tags} ownerId={user.id} />}

      <Card className="space-y-2 bg-neutral-50">
        <h2 className="text-sm font-semibold text-neutral-700">Coming next</h2>
        <p className="text-sm text-neutral-500">
          Quo call/text sync, Gmail lead capture, mass email &amp; newsletters, AI status detection and insights,
          Eventbrite / Jotform / Calendly lead capture. Each connects here once it&apos;s wired up.
        </p>
      </Card>
    </div>
  );
}
