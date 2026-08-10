import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Mail } from "lucide-react";
import { CallButton } from "@/components/CallButton";
import { getContact, getContactInsights, listStages } from "@/lib/data/contacts";
import { getContactThread } from "@/lib/data/messages";
import { fullName, formatPhone, initials } from "@/lib/utils";
import { ChatBubble } from "@/components/messages/ChatBubble";
import { CallLogEntry } from "@/components/messages/CallLogEntry";
import { ThreadComposer } from "@/components/messages/ThreadComposer";
import { ScrollToBottomOnLoad } from "@/components/messages/ScrollToBottomOnLoad";
import { ContactContextBar } from "@/components/messages/ContactContextBar";
import { ConversationActions } from "@/components/messages/ConversationActions";
import { AiInsightCard } from "@/components/contacts/AiInsightCard";
import { createClient } from "@/lib/supabase/server";

export default async function MessageThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [contact, thread, stages, insights] = await Promise.all([
    getContact(id),
    getContactThread(id),
    listStages(),
    getContactInsights(id),
  ]);

  if (!contact) notFound();

  return (
    <div className="mx-auto flex max-w-2xl flex-col overflow-x-hidden">
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur">
        <div className="flex items-center gap-3 border-b border-neutral-200 px-3 py-2.5">
          <Link href="/messages" aria-label="Back to messages" className="text-neutral-500">
            <ArrowLeft size={20} />
          </Link>
          <Link href={`/contacts/${contact.id}`} className="flex min-w-0 flex-1 items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700">
              {initials(contact.first_name, contact.last_name)}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-neutral-900">{fullName(contact)}</p>
              <p className="truncate text-xs text-neutral-400">{formatPhone(contact.phone)}</p>
            </div>
          </Link>
          {contact.phone && <CallButton phone={contact.phone} />}
          {contact.email && (
            <a href={`mailto:${contact.email}`} className="rounded-full p-2 text-neutral-500 hover:bg-neutral-100">
              <Mail size={18} />
            </a>
          )}
          <ConversationActions contactId={contact.id} hidden={contact.archived} afterDelete="back-to-messages" />
        </div>
        <ContactContextBar contact={contact} stages={stages} />
      </div>

      <div className="flex-1 space-y-3 px-3 py-4">
        {insights.map((insight) => (
          <AiInsightCard
            key={insight.id}
            insight={insight}
            contactId={contact.id}
            ownerId={user?.id ?? contact.owner_id}
            contactStageId={contact.stage_id}
            contactName={fullName(contact)}
            contactCreatedAt={contact.created_at}
            representing={contact.representing}
            stages={stages}
          />
        ))}

        {thread.length === 0 ? (
          <p className="py-10 text-center text-sm text-neutral-400">No calls or texts with {contact.first_name} yet.</p>
        ) : (
          thread.map((activity) =>
            activity.type === "call" ? (
              <CallLogEntry key={activity.id} activity={activity} />
            ) : (
              <ChatBubble key={activity.id} activity={activity} />
            ),
          )
        )}
        <ScrollToBottomOnLoad />
      </div>

      <ThreadComposer contactId={contact.id} phone={contact.phone} />
    </div>
  );
}
