import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getContact,
  getContactActivities,
  getContactTasks,
  getContactInsights,
  getContactDeals,
  listStages,
  listMergeCandidates,
} from "@/lib/data/contacts";
import { fullName, formatPhone, initials, CONTACT_TYPE_LABELS, TIMELINE_LABELS } from "@/lib/utils";
import { formatLocal } from "@/lib/format-time";
import { Card, Badge, Button } from "@/components/ui";
import { QuickActions } from "@/components/contacts/QuickActions";
import { StageSelector } from "@/components/contacts/StageSelector";
import { ActivityTimeline } from "@/components/contacts/ActivityTimeline";
import { AddActivityForm } from "@/components/contacts/AddActivityForm";
import { TaskList } from "@/components/contacts/TaskList";
import { ArchiveButton } from "@/components/contacts/ArchiveButton";
import { MergeContactButton } from "@/components/contacts/MergeContactButton";
import { AiInsightCard } from "@/components/contacts/AiInsightCard";
import { DealsList } from "@/components/contacts/DealsList";
import { RepresentingBadge } from "@/components/contacts/RepresentingBadge";
import { LikelihoodBadge } from "@/components/contacts/LikelihoodBadge";
import { computeLikelihood } from "@/lib/crm/likelihood";
import { SendTextForm } from "@/components/contacts/SendTextForm";
import { SendEmailForm } from "@/components/contacts/SendEmailForm";
import { Pencil, MapPin, DollarSign, Clock, Tag as TagIcon, CalendarHeart, Home } from "lucide-react";

export default async function ContactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [contact, activities, tasks, stages, insights, deals, mergeCandidates] = await Promise.all([
    getContact(id),
    getContactActivities(id),
    getContactTasks(id),
    listStages(),
    getContactInsights(id),
    getContactDeals(id),
    listMergeCandidates(),
  ]);

  if (!contact) notFound();

  const openTasks = tasks.filter((t) => !t.completed_at);
  const doneTasks = tasks.filter((t) => t.completed_at);
  const budgetLabel =
    contact.budget_min || contact.budget_max
      ? `$${(contact.budget_min ?? 0).toLocaleString()} – $${(contact.budget_max ?? 0).toLocaleString()}`
      : null;
  const likelihood = computeLikelihood(contact, stages);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand-50 text-lg font-semibold text-brand-700">
            {initials(contact.first_name, contact.last_name)}
          </div>
          <div>
            <h1 className="flex items-center gap-2 font-serif text-2xl font-semibold text-neutral-900">
              {fullName(contact)}
              <RepresentingBadge representing={contact.representing} />
            </h1>
            <p className="text-sm text-neutral-500">{formatPhone(contact.phone) || contact.email}</p>
            {likelihood && (
              <div className="mt-1">
                <LikelihoodBadge likelihood={likelihood} />
              </div>
            )}
          </div>
        </div>
        <Link href={`/contacts/${contact.id}/edit`}>
          <Button variant="secondary" size="sm">
            <Pencil size={14} /> Edit
          </Button>
        </Link>
      </div>

      <div className="mt-4">
        <QuickActions phone={contact.phone} email={contact.email} />
      </div>

      <div className="mt-4">
        <SendTextForm contactId={contact.id} phone={contact.phone} />
      </div>

      <div className="mt-4">
        <SendEmailForm contactId={contact.id} email={contact.email} />
      </div>

      {insights.length > 0 && (
        <div className="mt-4 space-y-3">
          {insights.map((insight) => (
            <AiInsightCard
              key={insight.id}
              insight={insight}
              contactId={contact.id}
              ownerId={contact.owner_id}
              contactStageId={contact.stage_id}
              contactName={fullName(contact)}
              contactCreatedAt={contact.created_at}
              representing={contact.representing}
              stages={stages}
            />
          ))}
        </div>
      )}

      <Card className="mt-4 space-y-3">
        <div>
          <p className="mb-1 text-xs font-medium text-neutral-400">Stage</p>
          <StageSelector
            contactId={contact.id}
            ownerId={contact.owner_id}
            currentStageId={contact.stage_id}
            stages={stages}
            contactName={fullName(contact)}
            contactCreatedAt={contact.created_at}
            representing={contact.representing}
          />
          <DealsList
            deals={deals}
            contactId={contact.id}
            ownerId={contact.owner_id}
            contactName={fullName(contact)}
            contactCreatedAt={contact.created_at}
            representing={contact.representing}
          />
        </div>
        <div className="flex flex-wrap gap-2 text-sm text-neutral-600">
          <Badge className="bg-neutral-100 text-neutral-600">{CONTACT_TYPE_LABELS[contact.contact_type]}</Badge>
          {contact.lead_source && <Badge className="bg-neutral-100 text-neutral-600">{contact.lead_source}</Badge>}
        </div>
        {contact.contact_tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <TagIcon size={14} className="text-neutral-400" />
            {contact.contact_tags.map((ct) => (
              <Badge key={ct.tags.id} color={ct.tags.color}>
                {ct.tags.name}
              </Badge>
            ))}
          </div>
        )}
        <div className="grid grid-cols-1 gap-2 text-sm text-neutral-600 sm:grid-cols-2">
          {budgetLabel && (
            <div className="flex items-center gap-2">
              <DollarSign size={14} className="text-neutral-400" /> {budgetLabel}
            </div>
          )}
          <div className="flex items-center gap-2">
            <Clock size={14} className="text-neutral-400" /> {TIMELINE_LABELS[contact.timeline]}
          </div>
          {(contact.city || contact.state) && (
            <div className="flex items-center gap-2">
              <MapPin size={14} className="text-neutral-400" /> {[contact.city, contact.state].filter(Boolean).join(", ")}
            </div>
          )}
          {contact.listing_address && (
            <div className="flex items-center gap-2">
              <Home size={14} className="text-neutral-400" />
              Listing: {contact.listing_address}
              {contact.listing_timeline && ` (${TIMELINE_LABELS[contact.listing_timeline]})`}
            </div>
          )}
          {contact.last_event_name && (
            <div className="flex items-center gap-2">
              <CalendarHeart size={14} className="text-neutral-400" />
              Last event: {contact.last_event_name}
              {contact.last_event_at && ` (${formatLocal(contact.last_event_at, "MMM d, yyyy")})`}
            </div>
          )}
        </div>
        {contact.areas_of_interest.length > 0 && (
          <p className="text-sm text-neutral-600">
            <span className="text-neutral-400">Interested in: </span>
            {contact.areas_of_interest.join(", ")}
          </p>
        )}
        {contact.notes && <p className="whitespace-pre-wrap text-sm text-neutral-600">{contact.notes}</p>}
      </Card>

      <div className="mt-6">
        <h2 className="mb-3 text-sm font-semibold text-neutral-700">Tasks</h2>
        <TaskList contactId={contact.id} ownerId={contact.owner_id} tasks={[...openTasks, ...doneTasks]} />
      </div>

      <div className="mt-6">
        <h2 className="mb-3 text-sm font-semibold text-neutral-700">Activity</h2>
        <div className="mb-4">
          <AddActivityForm contactId={contact.id} ownerId={contact.owner_id} />
        </div>
        <ActivityTimeline activities={activities} />
      </div>

      <div className="mt-8 flex items-center gap-2 border-t border-neutral-100 pt-4">
        <MergeContactButton contactId={contact.id} contactName={fullName(contact)} candidates={mergeCandidates} />
        <ArchiveButton contactId={contact.id} />
      </div>
    </div>
  );
}
