import { notFound } from "next/navigation";
import {
  getContact,
  getContactActivities,
  getContactTasks,
  getContactInsights,
  getContactDeals,
  listStages,
  listMergeCandidates,
  listTags,
} from "@/lib/data/contacts";
import { fullName, formatPhone, initials, CONTACT_TYPE_LABELS } from "@/lib/utils";
import { formatLocal } from "@/lib/format-time";
import { Section } from "@/components/ui/Section";
import { QuickActions } from "@/components/contacts/QuickActions";
import { SendMessageCard } from "@/components/contacts/SendMessageCard";
import { SuggestedRow } from "@/components/contacts/SuggestedRow";
import { ContactDetailsCard } from "@/components/contacts/ContactDetailsCard";
import { ActivityTimeline } from "@/components/contacts/ActivityTimeline";
import { AddActivityForm } from "@/components/contacts/AddActivityForm";
import { TaskList } from "@/components/contacts/TaskList";
import { ArchiveButton } from "@/components/contacts/ArchiveButton";
import { MergeContactButton } from "@/components/contacts/MergeContactButton";
import { DealsList } from "@/components/contacts/DealsList";
import { computeLikelihood } from "@/lib/crm/likelihood";
import { getLatestReadyTranscriptForContact } from "@/lib/data/meeting-transcripts";
import { ApprovePanel } from "@/components/transcripts/ApprovePanel";
import { ConsentStatus } from "@/components/contacts/ConsentStatus";
import { getInstagramSenderId } from "@/lib/data/instagram";
import { getContactEventHistory } from "@/lib/data/contact-events";
import { ContactEventHistory } from "@/components/contacts/ContactEventHistory";
import { listTextTemplates } from "@/lib/data/text-templates";
import { countRecentTexts } from "@/lib/crm/engagement";
import { createAdminClient } from "@/lib/supabase/admin";
import { ContactRecordMobile } from "@/components/contacts/mobile/ContactRecordMobile";

export default async function ContactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = createAdminClient();
  const [contact, activities, tasks, stages, insights, deals, mergeCandidates, tags, readyTranscript, instagramSenderId, eventHistory, textTemplates, textsThisWeek] =
    await Promise.all([
      getContact(id),
      getContactActivities(id),
      getContactTasks(id),
      listStages(),
      getContactInsights(id),
      getContactDeals(id),
      listMergeCandidates(),
      listTags(),
      getLatestReadyTranscriptForContact(id),
      getInstagramSenderId(id),
      getContactEventHistory(id),
      listTextTemplates(),
      countRecentTexts(admin, id),
    ]);

  if (!contact) notFound();

  const openTasks = tasks.filter((t) => !t.completed_at);
  const doneTasks = tasks.filter((t) => t.completed_at);
  const likelihood = computeLikelihood(contact, stages);

  const isOverdue = !!contact.next_follow_up_at && new Date(contact.next_follow_up_at).getTime() < Date.now();
  const daysLate = isOverdue
    ? Math.max(1, Math.floor((Date.now() - new Date(contact.next_follow_up_at!).getTime()) / (24 * 60 * 60 * 1000)))
    : 0;

  return (
    <>
      <ContactRecordMobile
        contact={contact}
        stages={stages}
        tags={tags}
        activities={activities}
        deals={deals}
        insights={insights}
        mergeCandidates={mergeCandidates}
        textTemplates={textTemplates}
        ownerId={contact.owner_id}
        textsThisWeek={textsThisWeek}
        openTasks={openTasks.map((t) => ({ id: t.id, title: t.title, due_at: t.due_at }))}
      />
      <div className="mx-auto hidden max-w-3xl px-4 py-6 md:block">
      <div className="flex flex-wrap items-start gap-[18px]">
        <div className="flex h-[60px] w-[60px] shrink-0 items-center justify-center rounded-full bg-neutral-100 text-xl font-semibold text-neutral-600">
          {initials(contact.first_name, contact.last_name)}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="font-serif text-2xl font-semibold leading-9 text-neutral-900 sm:text-[28px]">{fullName(contact)}</h1>
          <p className="mt-1.5 text-base leading-6 text-neutral-600">
            {[formatPhone(contact.phone), contact.email].filter(Boolean).join(" · ") || "No contact info on file"}
          </p>
          <p className="mt-1 text-base leading-6 text-neutral-600">
            {[CONTACT_TYPE_LABELS[contact.contact_type], contact.representing ? `${contact.representing} side` : null, likelihood ? `likelihood ${likelihood}` : null]
              .filter(Boolean)
              .join(" · ")}
          </p>
          {contact.last_event_name && (
            <p className="mt-1 text-base leading-6 text-neutral-500">
              Last event: {contact.last_event_name}
              {contact.last_event_at && ` (${formatLocal(contact.last_event_at, "MMM d, yyyy")})`}
            </p>
          )}
          <ConsentStatus contactId={contact.id} optedOutAt={contact.opted_out_at} />
          {isOverdue && (
            <p className="mt-3 flex flex-wrap items-center gap-2.5 text-[15px] font-semibold text-red-700">
              Follow-up was due {formatLocal(contact.next_follow_up_at!, "MMM d")} — {daysLate} day{daysLate === 1 ? "" : "s"} late
              <a href="#details" className="rounded-[9px] border border-neutral-200 bg-white px-3 py-1.5 text-sm font-semibold text-neutral-800">
                Reschedule
              </a>
            </p>
          )}
        </div>
      </div>

      <div className="mt-4">
        <QuickActions contactId={contact.id} contactName={fullName(contact)} phone={contact.phone} email={contact.email} instagramSenderId={instagramSenderId} />
      </div>

      <div className="mt-5 space-y-3">
        {readyTranscript && (
          <ApprovePanel
            transcript={readyTranscript.transcript}
            proposals={readyTranscript.proposals}
            contactId={contact.id}
            contactName={fullName(contact)}
            ownerId={contact.owner_id}
            contactStageId={contact.stage_id}
            contactCreatedAt={contact.created_at}
            representing={contact.representing}
            stages={stages}
          />
        )}

        <Section sectionKey="contact-detail:message" title="Send a message" meta="text or email" defaultOpen={false}>
          <SendMessageCard contactId={contact.id} phone={contact.phone} email={contact.email} />
        </Section>

        {insights.length > 0 && (
          <Section sectionKey="contact-detail:suggested" title="Suggested" meta={`${insights.length}`}>
            {insights.map((insight) => (
              <SuggestedRow
                key={insight.id}
                insight={insight}
                contactId={contact.id}
                ownerId={contact.owner_id}
                contactStageId={contact.stage_id}
                contactName={fullName(contact)}
                contactCreatedAt={contact.created_at}
                representing={contact.representing}
                stages={stages}
                tags={tags}
              />
            ))}
          </Section>
        )}

        <div id="details">
          <Section sectionKey="contact-detail:details" title="Details">
            <ContactDetailsCard contact={contact} tags={tags} stages={stages} contacts={mergeCandidates} />
          </Section>
        </div>

        {eventHistory.length > 0 && (
          <Section sectionKey="contact-detail:events" title="Events" meta={`${eventHistory.length}`} defaultOpen={false}>
            <ContactEventHistory events={eventHistory} />
          </Section>
        )}

        <Section sectionKey="contact-detail:deals" title="Deals" meta={`${deals.length}`} defaultOpen={false}>
          <div className="p-[18px]">
            <DealsList
              deals={deals}
              contactId={contact.id}
              ownerId={contact.owner_id}
              contactName={fullName(contact)}
              contactCreatedAt={contact.created_at}
              representing={contact.representing}
            />
          </div>
        </Section>

        <Section sectionKey="contact-detail:tasks" title="Tasks" meta={`${openTasks.length} open`}>
          <TaskList contactId={contact.id} ownerId={contact.owner_id} tasks={[...openTasks, ...doneTasks]} />
        </Section>

        <Section sectionKey="contact-detail:activity" title="Activity" meta={`${activities.length} entries`}>
          <div className="border-b border-neutral-100 p-[18px] pb-0">
            <AddActivityForm contactId={contact.id} ownerId={contact.owner_id} />
          </div>
          <ActivityTimeline activities={activities} />
        </Section>
      </div>

      <div className="mt-6 flex items-center gap-2 border-t border-neutral-100 pt-5">
        <MergeContactButton contactId={contact.id} contactName={fullName(contact)} candidates={mergeCandidates} />
        <ArchiveButton contactId={contact.id} archived={contact.archived} />
      </div>
      </div>
    </>
  );
}
