import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Mail, ChevronRight } from "lucide-react";
import { CallButton } from "@/components/CallButton";
import { getContact, getContactInsights, getContactTasks, listStages, listTags } from "@/lib/data/contacts";
import { getContactEventHistory } from "@/lib/data/contact-events";
import { getContactThread } from "@/lib/data/messages";
import { fullName, formatPhone } from "@/lib/utils";
import { Avatar } from "@/components/ui";
import { ChatBubble } from "@/components/messages/ChatBubble";
import { CallLogEntry } from "@/components/messages/CallLogEntry";
import { ThreadComposer } from "@/components/messages/ThreadComposer";
import { ScrollToBottomOnLoad } from "@/components/messages/ScrollToBottomOnLoad";
import { ContactContextBar } from "@/components/messages/ContactContextBar";
import { ContactContextSidebar } from "@/components/messages/ContactContextSidebar";
import { ConversationActions } from "@/components/messages/ConversationActions";
import { SuggestedRow } from "@/components/contacts/SuggestedRow";
import { createClient } from "@/lib/supabase/server";
import { listTextTemplates } from "@/lib/data/text-templates";
import { inboxHref } from "@/lib/crm/inbox-href";

export default async function MessageThreadPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ draft?: string; from?: string; hidden?: string; spam?: string }>;
}) {
  const { id } = await params;
  const { draft, from, hidden, spam } = await searchParams;
  const backHref = inboxHref({ filter: from, hidden: hidden === "1", spam: spam === "1" });
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [contact, thread, stages, insights, textTemplates, tags, tasks, eventHistory] = await Promise.all([
    getContact(id),
    getContactThread(id),
    listStages(),
    getContactInsights(id),
    listTextTemplates(),
    listTags(),
    getContactTasks(id),
    getContactEventHistory(id),
  ]);

  if (!contact) notFound();

  const openTasks = tasks.filter((t) => !t.completed_at);
  const lastActivity = thread.at(-1);

  return (
    <div className="flex min-h-0 min-w-0 flex-col lg:h-full lg:flex-row">
      <div className="mx-auto flex min-h-0 min-w-0 w-full max-w-3xl flex-col lg:mx-0 lg:h-full lg:max-w-none">
        <div className="sticky top-0 z-10 bg-[#f7f1ea]/95 backdrop-blur">
          <div className="flex items-center gap-3 border-b border-[#eadfd6] px-3 py-2.5">
            <Link href={backHref} aria-label="Back to messages" className="text-neutral-500">
              <ArrowLeft size={20} />
            </Link>
            <Link href={`/contacts/${contact.id}`} data-contact-open={contact.id} aria-label={`Open ${fullName(contact)} record`} className="flex min-w-0 flex-1 items-center gap-2.5">
              <Avatar id={contact.id} firstName={contact.first_name} lastName={contact.last_name} size={36} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-neutral-900">{fullName(contact)}</p>
                <p className="truncate text-xs text-neutral-400">{formatPhone(contact.phone) || "Open record"}</p>
              </div>
              <ChevronRight size={16} className="shrink-0 text-neutral-300 lg:hidden" />
            </Link>
            {contact.phone && <CallButton phone={contact.phone} />}
            {contact.email && (
              <a href={`mailto:${contact.email}`} className="rounded-full p-2 text-neutral-500 hover:bg-neutral-100">
                <Mail size={18} />
              </a>
            )}
            <ConversationActions
              contactId={contact.id}
              hidden={contact.archived}
              afterDelete="back-to-messages"
              afterDeleteHref={backHref}
            />
          </div>
          <div className="lg:hidden">
            <ContactContextBar contact={contact} stages={stages} />
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-4 pb-[7.5rem] lg:pb-4">
          {insights.length > 0 && (
            <div className="overflow-hidden rounded-2xl border border-[#eadfd6] bg-[#fffbf8]">
              {insights.map((insight) => (
                <SuggestedRow
                  key={insight.id}
                  insight={insight}
                  contactId={contact.id}
                  ownerId={user?.id ?? contact.owner_id}
                  contactStageId={contact.stage_id}
                  contactName={fullName(contact)}
                  contactCreatedAt={contact.created_at}
                  representing={contact.representing}
                  stages={stages}
                  tags={tags}
                />
              ))}
            </div>
          )}

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
          <ScrollToBottomOnLoad token={thread.at(-1)?.id} />
        </div>

        <ThreadComposer
          contactId={contact.id}
          phone={contact.phone}
          firstName={contact.first_name}
          lastName={contact.last_name}
          textTemplates={textTemplates}
          initialBody={draft}
        />
      </div>

      <ContactContextSidebar
        contact={contact}
        stages={stages}
        lastActivity={lastActivity}
        openTasks={openTasks}
        events={eventHistory}
      />
    </div>
  );
}
