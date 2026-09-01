import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { listStages, listTags } from "@/lib/data/contacts";
import { PipelineStagesAndTags } from "@/components/settings/PipelineStagesAndTags";
import { ConnectionsCard, type ConnectionRow } from "@/components/settings/ConnectionsCard";
import { NotificationsCard } from "@/components/settings/NotificationsCard";
import { GmailConnect } from "@/components/settings/GmailConnect";
import { QuoSyncBackfill } from "@/components/settings/QuoSyncBackfill";
import { EventbriteSyncBackfill } from "@/components/settings/EventbriteSyncBackfill";
import { JotformSyncBackfill } from "@/components/settings/JotformSyncBackfill";
import { GranolaConnect } from "@/components/settings/GranolaConnect";
import { GranolaMatchingSettings } from "@/components/settings/GranolaMatchingSettings";
import { RateManualEntry } from "@/components/settings/RateManualEntry";
import { DataRepairCard } from "@/components/settings/DataRepairCard";
import { SignOutButton } from "@/components/nav/SignOutButton";
import { RATE_PRODUCT } from "@/lib/crm/rate-feed";
import { Card, Button } from "@/components/ui";
import { BarChart3, Download } from "lucide-react";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ gmail_connected?: string; gmail_error?: string }>;
}) {
  const params = await searchParams;
  const granolaWebhookUrl =
    process.env.GRANOLA_WEBHOOK_SECRET && process.env.APP_BASE_URL
      ? `${process.env.APP_BASE_URL}/api/webhooks/granola?secret=${process.env.GRANOLA_WEBHOOK_SECRET}`
      : null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [stages, tags, gmailAccount, warmSettings, granolaMatchingSettings, latestRate, stageCountRows] = await Promise.all([
    listStages(),
    listTags(),
    supabase.from("gmail_accounts").select("email_address").maybeSingle().then((r) => r.data),
    supabase.from("warm_notification_settings").select("*").maybeSingle().then((r) => r.data),
    supabase.from("granola_matching_settings").select("*").maybeSingle().then((r) => r.data),
    supabase
      .from("daily_rates")
      .select("rate_pct, rate_date")
      .eq("product", RATE_PRODUCT)
      .order("rate_date", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then((r) => r.data),
    supabase.from("contacts").select("stage_id").eq("archived", false).then((r) => r.data),
  ]);

  const stageCounts: Record<string, number> = {};
  for (const row of stageCountRows ?? []) {
    if (!row.stage_id) continue;
    stageCounts[row.stage_id] = (stageCounts[row.stage_id] ?? 0) + 1;
  }

  const connectionRows: ConnectionRow[] = [
    {
      key: "gmail",
      name: "Gmail and Calendar",
      description: "Email on each timeline, sending from a contact, Meet invites, sequences.",
      status: gmailAccount ? "Connected" : "Not connected",
      connected: !!gmailAccount,
      manageContent: (
        <div className="space-y-3">
          <p className="text-[15px] leading-[22px] text-neutral-600">
            Syncs email to and from contacts already in your CRM to their timeline, lets you send email and schedule Google Meet
            invites from a contact&apos;s profile, and powers scheduled email sequences.
          </p>
          {gmailAccount && (
            <p className="text-[13px] leading-5 text-amber-700">
              Connected before Meet invites existed? Disconnect and reconnect once to grant calendar access.
            </p>
          )}
          <GmailConnect connectedEmail={gmailAccount?.email_address ?? null} errorCode={params.gmail_error} />
          <Link href="/sequences" className="block md:hidden">
            <Button variant="secondary" size="sm">
              Manage sequences
            </Button>
          </Link>
        </div>
      ),
    },
    {
      key: "quo",
      name: "Quo",
      description: "Calls and texts log automatically. New contacts push back so calls show a name.",
      status: process.env.QUO_API_KEY ? "Connected" : "Not set up",
      connected: !!process.env.QUO_API_KEY,
      manageContent: <QuoSyncBackfill />,
    },
    {
      key: "granola",
      name: "Granola",
      description: "Meetings, in-person notes and phone memos become changes you approve.",
      status: granolaWebhookUrl ? "Connected" : "Not set up",
      connected: !!granolaWebhookUrl,
      manageContent: (
        <div className="space-y-3.5">
          <GranolaConnect webhookUrl={granolaWebhookUrl} />
          <div className="border-t border-neutral-100 pt-3.5">
            <GranolaMatchingSettings settings={granolaMatchingSettings} />
          </div>
        </div>
      ),
    },
    {
      key: "eventbrite-jotform",
      name: "Eventbrite and Jotform",
      description: "Registrations and check-ins create or match contacts.",
      status: process.env.EVENTBRITE_API_TOKEN ? "Connected" : "Not set up",
      connected: !!process.env.EVENTBRITE_API_TOKEN,
      manageContent: (
        <div className="space-y-3.5">
          <EventbriteSyncBackfill />
          <JotformSyncBackfill />
        </div>
      ),
    },
    {
      key: "calendly",
      name: "Calendly",
      description: "Built, needs setup.",
      status: process.env.CALENDLY_API_TOKEN ? "Connected" : "Not set up",
      connected: !!process.env.CALENDLY_API_TOKEN,
      manageContent: (
        <p className="text-[15px] leading-[22px] text-neutral-600">
          See the README&apos;s &quot;Setting up Calendly&quot; section for the setup steps — nothing to configure here yet.
        </p>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-2xl space-y-3 px-4 py-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold text-neutral-900">Settings</h1>
        {user?.email && <p className="mt-1.5 text-[15px] leading-[22px] text-neutral-600">{user.email}</p>}
      </div>

      <Link href="/reports" className="block md:hidden">
        <Button variant="secondary" size="sm">
          <BarChart3 size={14} /> View reports
        </Button>
      </Link>

      {user && <PipelineStagesAndTags stages={stages} tags={tags} ownerId={user.id} stageCounts={stageCounts} />}

      <ConnectionsCard rows={connectionRows} />

      <NotificationsCard warmSettings={warmSettings} vapidPublicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY} />

      <Card>
        <RateManualEntry latestRatePct={latestRate?.rate_pct ?? null} latestRateDate={latestRate?.rate_date ?? null} />
      </Card>

      <DataRepairCard />

      <div className="flex items-center gap-2.5 border-t border-neutral-100 pt-4">
        <a href="/api/contacts/export">
          <Button variant="secondary" size="sm">
            <Download size={14} /> Export all contacts
          </Button>
        </a>
        <SignOutButton className="rounded-xl border border-neutral-200 bg-white px-4 py-2.5 font-semibold" />
      </div>
    </div>
  );
}
