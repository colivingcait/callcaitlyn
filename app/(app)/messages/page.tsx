import Link from "next/link";
import { listConversations, listTextableContacts } from "@/lib/data/messages";
import { listStages } from "@/lib/data/contacts";
import { ConversationRow } from "@/components/messages/ConversationRow";
import { NewMessageButton } from "@/components/messages/NewMessageButton";

export default async function MessagesPage({ searchParams }: { searchParams: Promise<{ hidden?: string }> }) {
  const { hidden: hiddenParam } = await searchParams;
  const hidden = hiddenParam === "1";
  const [conversations, contacts, stages] = await Promise.all([
    listConversations({ hidden }),
    listTextableContacts(),
    listStages(),
  ]);

  return (
    <div className="mx-auto max-w-2xl overflow-x-hidden">
      <div className="flex items-start justify-between gap-3 px-4 pt-6 pb-2">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-neutral-900">{hidden ? "Hidden threads" : "Messages"}</h1>
          <p className="mt-0.5 text-sm text-neutral-500">
            {hidden ? "Spam/trash leads you've hidden from the inbox." : "Recent calls and texts, most recent first."}
          </p>
        </div>
        {!hidden && <NewMessageButton contacts={contacts} />}
      </div>
      <div className="px-4 pb-2">
        <Link href={hidden ? "/messages" : "/messages?hidden=1"} className="text-xs font-medium text-brand-600 hover:underline">
          {hidden ? "← Back to inbox" : "Hidden threads"}
        </Link>
      </div>
      <div className="bg-white">
        {conversations.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-neutral-400">
            {hidden
              ? "Nothing hidden."
              : "No calls or texts logged yet. Once Quo activity comes in, conversations show up here."}
          </p>
        ) : (
          conversations.map((c) => <ConversationRow key={c.contact.id} conversation={c} stages={stages} />)
        )}
      </div>
    </div>
  );
}
