import { listConversations, listTextableContacts } from "@/lib/data/messages";
import { listStages } from "@/lib/data/contacts";
import { ConversationRow } from "@/components/messages/ConversationRow";
import { NewMessageButton } from "@/components/messages/NewMessageButton";

export default async function MessagesPage() {
  const [conversations, contacts, stages] = await Promise.all([listConversations(), listTextableContacts(), listStages()]);

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-start justify-between gap-3 px-4 pt-6 pb-2">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-neutral-900">Messages</h1>
          <p className="mt-0.5 text-sm text-neutral-500">Recent calls and texts, most recent first.</p>
        </div>
        <NewMessageButton contacts={contacts} />
      </div>
      <div className="bg-white">
        {conversations.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-neutral-400">
            No calls or texts logged yet. Once Quo activity comes in, conversations show up here.
          </p>
        ) : (
          conversations.map((c) => <ConversationRow key={c.contact.id} conversation={c} stages={stages} />)
        )}
      </div>
    </div>
  );
}
