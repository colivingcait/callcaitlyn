import Link from "next/link";
import { listConversations, listTextableContacts } from "@/lib/data/messages";
import { listMergeCandidates } from "@/lib/data/contacts";
import { getUnmatchedInstagramThreads } from "@/lib/data/instagram";
import { createClient } from "@/lib/supabase/server";
import { ConversationRow } from "@/components/messages/ConversationRow";
import { NotOwedList } from "@/components/messages/NotOwedList";
import { NewMessageButton } from "@/components/messages/NewMessageButton";
import { InstagramStrangerRow } from "@/components/messages/InstagramStrangerRow";
import { MessageFilters } from "@/components/messages/MessageFilters";
import { SpamBucket } from "@/components/messages/SpamBucket";
import { InboxMobile } from "@/components/messages/mobile/InboxMobile";
import { Section } from "@/components/ui/Section";
import { ShieldAlert, ChevronRight } from "lucide-react";

export default async function MessagesPage({ searchParams }: { searchParams: Promise<{ hidden?: string; filter?: string; spam?: string }> }) {
  const { hidden: hiddenParam, filter: filterParam, spam: spamParam } = await searchParams;
  const hidden = hiddenParam === "1";
  const spam = !hidden && spamParam === "1";
  const filter: "owed" | "all" | "calls" = filterParam === "owed" || filterParam === "calls" ? filterParam : "all";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [conversations, spamConversations, contacts, instagramThreads, mergeCandidates] = await Promise.all([
    listConversations({ hidden }),
    hidden ? Promise.resolve([]) : listConversations({ spam: true }),
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

  if (spam) {
    return (
      <div className="mx-auto max-w-2xl overflow-x-hidden">
        <SpamBucket conversations={spamConversations} />
      </div>
    );
  }

  return (
    <>
      {!hidden && (
        <InboxMobile
          conversations={conversations}
          spamConversations={spamConversations}
          contacts={contacts}
          instagramThreads={instagramThreads}
          mergeCandidates={mergeCandidates}
          ownerId={user?.id ?? ""}
        />
      )}
      <div className={hidden ? "mx-auto max-w-2xl overflow-x-hidden" : "mx-auto hidden max-w-2xl overflow-x-hidden md:block"}>
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
        <MessageFilters activeFilter={filter} owedCount={owedCount} spamCount={spamConversations.length} />
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
            <NotOwedList conversations={notOwedVisible} />
          </>
        )}
      </div>

      {!hidden && filter === "all" && spamConversations.length > 0 && (
        <div className="px-4 pb-4">
          <Link
            href="/messages?spam=1"
            className="flex items-center gap-3 rounded-2xl border border-dashed border-neutral-300 bg-[#fcfbfa] px-4 py-3.5"
          >
            <ShieldAlert size={18} className="shrink-0 text-neutral-400" />
            <p className="min-w-0 flex-1 text-sm text-neutral-600">
              <span className="font-bold text-neutral-900">{spamConversations.length}</span> calls filed as spam today — kept out of the list
              above and out of the badge
            </p>
            <span className="shrink-0 text-sm font-semibold text-neutral-800">Review</span>
            <ChevronRight size={17} className="shrink-0 text-neutral-400" />
          </Link>
        </div>
      )}
      </div>
    </>
  );
}
