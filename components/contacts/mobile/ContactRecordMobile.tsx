"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronDown, ChevronUp, Plus, Phone, MessageSquare, StickyNote } from "lucide-react";
import { Avatar } from "@/components/ui";
import { QuickActions } from "@/components/contacts/QuickActions";
import { MergeContactButton } from "@/components/contacts/MergeContactButton";
import { ArchiveButton } from "@/components/contacts/ArchiveButton";
import { StageTagsSheet } from "@/components/contacts/mobile/StageTagsSheet";
import { LogSheet } from "@/components/contacts/mobile/LogSheet";
import { OverviewTab } from "@/components/contacts/mobile/OverviewTab";
import { ActivityTab } from "@/components/contacts/mobile/ActivityTab";
import { DealsTab } from "@/components/contacts/mobile/DealsTab";
import { sendTextToContact } from "@/app/(app)/contacts/actions";
import { openQuoCall } from "@/lib/quo/call-link";
import { formatLocal } from "@/lib/format-time";
import { CONTACT_TYPE_LABELS, fullName, formatPhone } from "@/lib/utils";
import { useToast } from "@/lib/hooks/useToast";
import { Toast } from "@/components/mobile/Toast";
import { cn } from "@/lib/utils";
import type { Activity, AiInsight, ContactWithRelations, Deal, PipelineStage, Tag, TextTemplate } from "@/types/database";
import type { MergeCandidate } from "@/lib/data/contacts";

type Tab = "overview" | "activity" | "deals";

export function ContactRecordMobile({
  contact,
  stages,
  tags,
  activities,
  deals,
  insights,
  mergeCandidates,
  textTemplates,
  ownerId,
  textsThisWeek,
  openTasks,
}: {
  contact: ContactWithRelations;
  stages: PipelineStage[];
  tags: Tag[];
  activities: Activity[];
  deals: Deal[];
  insights: AiInsight[];
  mergeCandidates: MergeCandidate[];
  textTemplates: TextTemplate[];
  ownerId: string;
  textsThisWeek: number;
  openTasks: { id: string; title: string; due_at: string | null }[];
}) {
  const router = useRouter();
  const { toast, showToast } = useToast();
  const [tab, setTab] = useState<Tab>("overview");
  const [stageSheetOpen, setStageSheetOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [texting, setTexting] = useState(false);

  const name = fullName(contact);
  const stage = stages.find((s) => s.id === contact.stage_id);
  const engagedTag = contact.contact_tags.find((ct) => ct.tags.name === "Engaged");
  const isOverdue = !!contact.next_follow_up_at && new Date(contact.next_follow_up_at).getTime() < Date.now();
  const daysLate = isOverdue
    ? Math.max(1, Math.floor((Date.now() - new Date(contact.next_follow_up_at!).getTime()) / (24 * 60 * 60 * 1000)))
    : 0;

  const activeActivities = activities.filter((a) => !!a.contact_id);
  const openTasksOpen = openTasks.filter((t) => !t.due_at || true);
  const lastText = activities.find((a) => a.type === "text" && a.body);
  const lastExchange = lastText ? { body: lastText.body ?? "", occurred_at: lastText.occurred_at } : null;

  async function quickText() {
    if (!contact.phone) return;
    setTexting(true);
    const res = await sendTextToContact(contact.id, contact.phone, `Hi ${contact.first_name}, following up!`);
    setTexting(false);
    if (!res.ok) showToast("Couldn't send that text", "error");
    else router.refresh();
  }

  return (
    <div className="pb-28 md:hidden">
      <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-2.5">
        <button type="button" onClick={() => router.back()} className="flex h-12 w-12 items-center justify-center rounded-full text-neutral-600">
          <ChevronLeft size={22} />
        </button>
        <div className="flex items-center gap-1">
          <MergeContactButton contactId={contact.id} contactName={name} candidates={mergeCandidates} />
          <ArchiveButton contactId={contact.id} />
        </div>
      </div>

      <div className="px-4 pt-4">
        <div className="flex items-start gap-3.5">
          <Avatar firstName={contact.first_name} lastName={contact.last_name} size={64} />
          <div className="min-w-0 flex-1">
            <p className="font-serif text-[26px] font-semibold leading-8 text-neutral-900">{name}</p>
            <p className="mt-1 text-[15px] text-neutral-500">
              {[formatPhone(contact.phone), contact.representing ? `${contact.representing} side` : null].filter(Boolean).join(" · ") || "No contact info"}
            </p>
          </div>
        </div>

        {isOverdue && (
          <div className="mt-3 flex items-center justify-between gap-2 rounded-[14px] bg-[#fef2f2] px-3.5 py-2.5">
            <p className="text-[15px] font-semibold text-[#b91c1c]">
              Follow-up was due {formatLocal(contact.next_follow_up_at!, "MMM d")} - {daysLate} day{daysLate === 1 ? "" : "s"} late
            </p>
            <button
              type="button"
              onClick={() => setStageSheetOpen(true)}
              className="shrink-0 rounded-[10px] border border-[#fecaca] bg-white px-3 py-1.5 text-[13px] font-semibold text-neutral-800"
            >
              Reschedule
            </button>
          </div>
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setStageSheetOpen(true)}
            className="flex h-[45px] items-center gap-1 rounded-full border border-brand-300 bg-brand-50 px-3.5 text-[15px] font-medium text-brand-700"
          >
            {stage?.name ?? "No stage"} <ChevronDown size={15} />
          </button>
          {engagedTag && (
            <span className="flex h-[45px] items-center rounded-full border border-neutral-200 px-3.5 text-[15px] font-medium text-neutral-600">
              Engaged · {textsThisWeek} text{textsThisWeek === 1 ? "" : "s"} this week
            </span>
          )}
          {contact.contact_tags
            .filter((ct) => ct.tags.name !== "Engaged")
            .map((ct) => (
              <span
                key={ct.tags.id}
                className="flex h-[45px] items-center rounded-full px-3.5 text-[15px] font-medium text-white"
                style={{ backgroundColor: ct.tags.color }}
              >
                {ct.tags.name}
              </span>
            ))}
          <button
            type="button"
            onClick={() => setStageSheetOpen(true)}
            className="flex h-[45px] items-center gap-1 rounded-full border border-dashed border-neutral-300 px-3.5 text-[15px] font-medium text-neutral-500"
          >
            <Plus size={14} /> Tag
          </button>
        </div>
      </div>

      <div className="mt-4 flex border-b border-neutral-100 px-4">
        {(
          [
            ["overview", "Overview"],
            ["activity", `Activity ${activities.length}`],
            ["deals", `Deals ${deals.length}`],
          ] as [Tab, string][]
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={cn(
              "border-b-2 px-3 py-2.5 text-[15px] font-semibold",
              tab === value ? "border-brand-600 text-neutral-900" : "border-transparent text-neutral-400",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="px-4 py-4">
        {tab === "overview" && (
          <OverviewTab
            contact={contact}
            tags={tags}
            stages={stages}
            mergeCandidates={mergeCandidates}
            textTemplates={textTemplates}
            insights={insights}
            ownerId={ownerId}
            openTasks={openTasksOpen}
            lastExchange={lastExchange}
          />
        )}
        {tab === "activity" && <ActivityTab activities={activeActivities} contactId={contact.id} contactName={name} ownerId={ownerId} />}
        {tab === "deals" && (
          <DealsTab deals={deals} contactId={contact.id} ownerId={ownerId} contactName={name} contactCreatedAt={contact.created_at} representing={contact.representing} />
        )}
      </div>

      <div className="fixed inset-x-0 bottom-16 z-30 border-t border-neutral-100 bg-white px-4 py-2.5">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={quickText}
            disabled={!contact.phone || texting}
            className="flex h-[54px] flex-1 items-center justify-center gap-2 rounded-xl bg-brand-600 text-[15px] font-semibold text-white disabled:opacity-40"
          >
            <MessageSquare size={17} /> {texting ? "Sending…" : "Text"}
          </button>
          <button
            type="button"
            onClick={() => contact.phone && openQuoCall(contact.phone)}
            disabled={!contact.phone}
            className="flex h-[54px] w-[54px] shrink-0 items-center justify-center rounded-xl border border-neutral-200 text-neutral-600 disabled:opacity-40"
          >
            <Phone size={18} />
          </button>
          <button
            type="button"
            onClick={() => setLogOpen(true)}
            className="flex h-[54px] flex-1 items-center justify-center gap-2 rounded-xl border border-neutral-200 text-[15px] font-semibold text-neutral-700"
          >
            <StickyNote size={17} /> Log
          </button>
          <button
            type="button"
            onClick={() => setMoreOpen((v) => !v)}
            className="flex h-[54px] w-[54px] shrink-0 items-center justify-center rounded-xl border border-neutral-200 text-neutral-600"
          >
            {moreOpen ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
          </button>
        </div>
        {moreOpen && (
          <div className="mt-2.5">
            <QuickActions contactId={contact.id} contactName={name} phone={contact.phone} email={contact.email} />
          </div>
        )}
      </div>

      <StageTagsSheet
        open={stageSheetOpen}
        onClose={() => setStageSheetOpen(false)}
        contactId={contact.id}
        ownerId={ownerId}
        currentStageId={contact.stage_id}
        stages={stages}
        tags={tags}
        currentTagIds={contact.contact_tags.map((ct) => ct.tags.id)}
        contactName={name}
        contactCreatedAt={contact.created_at}
        representing={contact.representing}
      />
      <LogSheet open={logOpen} onClose={() => setLogOpen(false)} ownerId={ownerId} contactId={contact.id} contactName={name} />
      <Toast toast={toast} />
    </div>
  );
}
