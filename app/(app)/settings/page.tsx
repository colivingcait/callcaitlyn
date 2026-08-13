import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { listStages, listTags } from "@/lib/data/contacts";
import { StageManager } from "@/components/settings/StageManager";
import { TagManager } from "@/components/settings/TagManager";
import { GmailConnect } from "@/components/settings/GmailConnect";
import { QuoSyncBackfill } from "@/components/settings/QuoSyncBackfill";
import { EventbriteSyncBackfill } from "@/components/settings/EventbriteSyncBackfill";
import { PushNotifications } from "@/components/settings/PushNotifications";
import { Card, Button } from "@/components/ui";
import { Mail, BarChart3 } from "lucide-react";

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

      <Link href="/reports" className="block md:hidden">
        <Button variant="secondary" size="sm">
          <BarChart3 size={14} /> View reports
        </Button>
      </Link>

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

      <Card className="space-y-3">
        <h2 className="text-sm font-semibold text-neutral-700">Notifications</h2>
        <PushNotifications vapidPublicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY} />
      </Card>

      <Card className="space-y-2 bg-neutral-50">
        <h2 className="text-sm font-semibold text-neutral-700">Integrations</h2>
        <p className="text-sm text-neutral-500">
          Quo (calls/texts), Eventbrite, and Jotform are live — activity logs straight to each contact&apos;s
          timeline automatically. New calls/texts/emails also get read by AI, which suggests stage/timeline
          updates for you to approve on the contact page. Calendly is built, just needs setup (see the README).
        </p>
        <p className="text-sm text-neutral-500">
          New and edited contacts with a phone number now push automatically into Quo, so calls and texts there
          show a name instead of a raw number. Run this once to backfill everyone already in the CRM.
        </p>
        <QuoSyncBackfill />
        <p className="text-sm text-neutral-500">
          If a webhook was ever misconfigured or missing (like the House Hacking one just was), any registrations
          it missed won&apos;t show up on their own. Run this to pull the last 90 days of orders from both
          Eventbrite accounts and catch up anyone who fell through — safe to run anytime, existing contacts just
          get matched instead of duplicated.
        </p>
        <EventbriteSyncBackfill />
      </Card>
    </div>
  );
}
