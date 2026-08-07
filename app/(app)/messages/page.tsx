import { listConversations } from "@/lib/data/messages";
import { ConversationRow } from "@/components/messages/ConversationRow";

export default async function MessagesPage() {
  const conversations = await listConversations();

  return (
    <div className="mx-auto max-w-2xl">
      <div className="px-4 pt-6 pb-2">
        <h1 className="font-serif text-2xl font-semibold text-neutral-900">Messages</h1>
        <p className="mt-0.5 text-sm text-neutral-500">Recent calls and texts, most recent first.</p>
      </div>
      <div className="bg-white">
        {conversations.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-neutral-400">
            No calls or texts logged yet. Once Quo activity comes in, conversations show up here.
          </p>
        ) : (
          conversations.map((c) => <ConversationRow key={c.contact.id} conversation={c} />)
        )}
      </div>
    </div>
  );
}
