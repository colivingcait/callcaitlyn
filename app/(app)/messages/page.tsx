import Link from "next/link";
import { listConversations, listTextableContacts } from "@/lib/data/messages";
import { listMergeCandidates } from "@/lib/data/contacts";
import { getUnmatchedInstagramThreads } from "@/lib/data/instagram";
import { ConversationRow } from "@/components/messages/ConversationRow";
import { NewMessageButton } from "@/components/messages/NewMessageButton";
import { InstagramStrangerRow } from "@/components/messages/InstagramStrangerRow";
import { MessageFilters } from "@/components/messages/MessageFilters";
import { Section } from "@/components/ui/Section";

export default async function MessagesPage({ searchParams }: { searchParams: Promise<{ hidden?: string; filter?: string }> }) {
  const { hidden: hiddenParam, filter: filterParam } = await searchParams;
  const hidden = hiddenParam === "1";
  const filter: "owed" | "all" | "calls" = filterParam === "owed" || filterParam === "calls" ? filterParam : "all";

  const [conversations, contacts, instagramThreads, mergeCandidates] = await Promise.all([
    listConversations({ hidden }),
    listTextableContacts(),
    hidden ? Promise.resolve([]) : getUnmatchedInstagramThreads(),
    hidden ? Promise.resolve([]) : listMergeCandidates(),
  ]);

  const owedCount = conversations.filter((c) => c.owed).length;
  const visible =
    filter === "owed"
      ? conversations.filter((c) => c.owed)
      : filter === "calls"
        ? conversations.filter((c) => c.lastActivity.type === "call")
        : conversations;
  const owedVisible = visible.filter((c) => c.owed);
  const notOwedVisible = visible.filter((c) => !c.owed);

  return (
    <div className="mx-auto max-w-2xl overflow-x-hidden">
      <div className="flex items-start justify-between gap-3 px-4 pt-6 pb-4">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-neutral-900">{hidden ? "Hidden threads" : "Messages"}</h1>
          <p className="mt-0.5 text-[15px] leading-[22px] text-neutral-600">
            {hidden
              ? "Spam/trash leads you've hidden from the inbox."
              : owedCount > 0
                ? `${owedCount} ${owedCount === 1 ? "person is" : "people are"} waiting on you.`
                : "Nothing waiting on you right now."}
          </p>
        </div>
        {!hidden && <NewMessageButton contacts={contacts} />}
      </div>

      {hidden ? (
        <div className="px-4 pb-4">
          <Link href="/messages" className="text-sm font-medium text-brand-600 hover:underline">
            ← Back to inbox
          </Link>
        </div>
      ) : (
        <MessageFilters activeFilter={filter} owedCount={owedCount} />
      )}

      {instagramThreads.length > 0 && (
        <div className="px-4 pt-3">
          <Section sectionKey="messages:instagram" title="Instagram · new" meta={`${instagramThreads.length}`}>
            {instagramThreads.map((thread) => (
              <InstagramStrangerRow key={thread.igSenderId} thread={thread} contacts={mergeCandidates} />
            ))}
          </Section>
        </div>
      )}

      <div className="space-y-2 px-4 py-3">
        {visible.length === 0 ? (
          <p className="py-10 text-center text-sm text-neutral-400">
            {hidden
              ? "Nothing hidden."
              : filter === "owed"
                ? "Nothing owed."
                : "No calls or texts logged yet. Once Quo activity comes in, conversations show up here."}
          </p>
        ) : (
          <>
            {owedVisible.map((c) => (
              <ConversationRow key={c.contact.id} conversation={c} />
            ))}
            {notOwedVisible.length > 0 && <p className="px-0.5 pb-1 pt-2 text-base font-semibold text-neutral-900">Nothing owed</p>}
            {notOwedVisible.map((c) => (
              <ConversationRow key={c.contact.id} conversation={c} />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
