import { listNewRegistrationsQueue, listEventFollowupQueue, listConfirmationQueue } from "@/lib/data/dialer";
import { getDefaultDraftTemplate } from "@/lib/data/text-templates";
import { confirmationItemToDialerContact } from "@/lib/crm/dialer-mapping";
import { DialerWorkspace } from "@/components/dialer/DialerWorkspace";

export default async function DialerPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const activeTab = tab === "followup" ? "followup" : tab === "confirm" ? "confirm" : "new";

  const [
    { contacts: registrations, error: registrationsError },
    { contacts: followups, error: followupError },
    { items: confirmations, events: confirmationEvents, error: confirmationError },
    defaultDraftTemplate,
  ] = await Promise.all([listNewRegistrationsQueue(), listEventFollowupQueue(), listConfirmationQueue(), getDefaultDraftTemplate()]);

  const contacts =
    activeTab === "followup" ? followups : activeTab === "confirm" ? confirmations.map(confirmationItemToDialerContact) : registrations;
  const error = activeTab === "followup" ? followupError : activeTab === "confirm" ? confirmationError : registrationsError;
  const mode = activeTab === "followup" ? "event-followup" : activeTab === "confirm" ? "confirmation" : "new-registration";

  const emptyMessage =
    activeTab === "followup"
      ? "No one's waiting on a follow-up call."
      : activeTab === "confirm"
        ? confirmationEvents.length === 0
          ? "Nothing happening in the next couple days to confirm."
          : "Everyone's confirmed."
        : "Nobody left to call — you're caught up.";

  return (
    <>
      {error && (
        <p className="mx-4 mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
          Couldn&apos;t load this queue: {error}. This usually means a database migration hasn&apos;t been run yet — check with your developer.
        </p>
      )}
      <DialerWorkspace
        contacts={contacts}
        mode={mode}
        activeTab={activeTab}
        newCount={registrations.length}
        followupCount={followups.length}
        confirmCount={confirmations.length}
        confirmationEvents={confirmationEvents}
        defaultDraftTemplate={defaultDraftTemplate}
        emptyMessage={emptyMessage}
      />
    </>
  );
}
