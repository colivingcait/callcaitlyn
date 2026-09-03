import Link from "next/link";
import { listNewRegistrationsQueue, listEventFollowupQueue } from "@/lib/data/dialer";
import { listStages } from "@/lib/data/contacts";
import { getDefaultDraftTemplate } from "@/lib/data/text-templates";
import { DialerQueue } from "@/components/dialer/DialerQueue";
import { FollowUpQueueMobile } from "@/components/dialer/mobile/FollowUpQueueMobile";
import { cn } from "@/lib/utils";

export default async function DialerPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const activeTab = tab === "followup" ? "followup" : "new";

  const [{ contacts: registrations, error: registrationsError }, { contacts: followups, error: followupError }, stages, defaultDraftTemplate] =
    await Promise.all([listNewRegistrationsQueue(), listEventFollowupQueue(), listStages(), getDefaultDraftTemplate()]);

  const contacts = activeTab === "followup" ? followups : registrations;
  const error = activeTab === "followup" ? followupError : registrationsError;

  return (
    <>
      <FollowUpQueueMobile
        contacts={contacts}
        mode={activeTab === "followup" ? "event-followup" : "new-registration"}
        activeTab={activeTab}
        newCount={registrations.length}
        followupCount={followups.length}
        defaultDraftTemplate={defaultDraftTemplate}
      />
      <div className="mx-auto hidden max-w-2xl overflow-x-hidden md:block">
      <div className="px-4 pt-6 pb-2">
        <h1 className="font-serif text-2xl font-semibold text-neutral-900">Dialer</h1>
        <p className="mt-0.5 text-sm text-neutral-500">
          {activeTab === "followup"
            ? "People who attended - call to follow up while it's fresh."
            : "Everyone with an untouched registration - new and returning both."}
        </p>
      </div>

      <div className="flex gap-1 border-b border-neutral-100 px-4">
        <Link
          href="/dialer"
          className={cn(
            "border-b-2 px-3 py-2 text-sm font-medium",
            activeTab === "new" ? "border-brand-600 text-brand-700" : "border-transparent text-neutral-500",
          )}
        >
          New registrations ({registrations.length})
        </Link>
        <Link
          href="/dialer?tab=followup"
          className={cn(
            "border-b-2 px-3 py-2 text-sm font-medium",
            activeTab === "followup" ? "border-brand-600 text-brand-700" : "border-transparent text-neutral-500",
          )}
        >
          Post-event follow-ups ({followups.length})
        </Link>
      </div>

      {error && (
        <p className="mx-4 mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">
          Couldn&apos;t load this queue: {error}. This usually means a database migration hasn&apos;t been run yet — check
          with your developer.
        </p>
      )}

      <DialerQueue
        contacts={contacts}
        stages={stages}
        mode={activeTab === "followup" ? "event-followup" : "new-registration"}
        emptyMessage={
          activeTab === "followup" ? "No one's waiting on a follow-up call." : "Nobody left to call — you're caught up."
        }
        defaultDraftTemplate={defaultDraftTemplate}
      />
      </div>
    </>
  );
}
