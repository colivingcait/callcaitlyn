import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { listStages, listTags } from "@/lib/data/contacts";
import { StageManager } from "@/components/settings/StageManager";
import { TagManager } from "@/components/settings/TagManager";
import { GmailConnect } from "@/components/settings/GmailConnect";
import { Card, Button } from "@/components/ui";
import { Mail } from "lucide-react";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ gmail_connected?: string; gmail_error?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [stages, tags, gmailAccount] = await Promise.all([
    listStages(),
    listTags(),
    supabase.from("gmail_accounts").select("email_address").maybeSingle().then((r) => r.data),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-5 px-4 py-6">
      <h1 className="font-serif text-2xl font-semibold text-neutral-900">Settings</h1>

      {user && <StageManager stages={stages} ownerId={user.id} />}
      {user && <TagManager tags={tags} ownerId={user.id} />}

      <Card className="space-y-3">
        <h2 className="text-sm font-semibold text-neutral-700">Gmail</h2>
        <p className="text-sm text-neutral-500">
          Syncs email to and from contacts already in your CRM to their timeline, lets you send email from a
          contact&apos;s profile, and powers scheduled email sequences. Doesn&apos;t touch anything else in your
          inbox — no marketing/spam classification needed since it only looks at mail involving people you&apos;ve
          already added.
        </p>
        <GmailConnect connectedEmail={gmailAccount?.email_address ?? null} errorCode={params.gmail_error} />
        <Link href="/sequences" className="block md:hidden">
          <Button variant="secondary" size="sm">
            <Mail size={14} /> Manage sequences
          </Button>
        </Link>
      </Card>

      <Card className="space-y-2 bg-neutral-50">
        <h2 className="text-sm font-semibold text-neutral-700">Integrations</h2>
        <p className="text-sm text-neutral-500">
          Quo (calls/texts), Eventbrite, and Jotform are live — activity logs straight to each contact&apos;s
          timeline automatically. New calls/texts/emails also get read by AI, which suggests stage/timeline
          updates for you to approve on the contact page. Calendly is built, just needs setup (see the README).
        </p>
      </Card>
    </div>
  );
}
