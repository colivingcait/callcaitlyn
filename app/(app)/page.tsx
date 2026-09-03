import { getTodayData } from "@/lib/data/today";
import { dismissReplyOwed } from "@/app/(app)/today-actions";
import { listMergeCandidates, listTags } from "@/lib/data/contacts";
import { getDefaultDraftTemplate } from "@/lib/data/text-templates";
import { createClient } from "@/lib/supabase/server";
import { TodayMobile } from "@/components/dashboard/mobile/TodayMobile";
import { formatLocal } from "@/lib/format-time";
import { Section } from "@/components/ui/Section";
import { BookingRequestRow } from "@/components/scheduling/BookingRequestRow";
import { SuggestedRow } from "@/components/contacts/SuggestedRow";
import { WorklistGroup } from "@/components/dashboard/WorklistGroup";
import { TodayTasksGroup } from "@/components/dashboard/TodayTasksGroup";
import { TodayStatStrip } from "@/components/dashboard/TodayStatStrip";
import { PipelineMiniCard } from "@/components/dashboard/PipelineMiniCard";
import { CommissionMiniCard } from "@/components/dashboard/CommissionMiniCard";
import { DialerStrip } from "@/components/dashboard/DialerStrip";
import { TextAllButton } from "@/components/dashboard/TextAllButton";
import { WeeklyReviewCard } from "@/components/dashboard/WeeklyReviewCard";
import { PrepSheetCard } from "@/components/dashboard/PrepSheetCard";
import type { WeeklyReviewPayload } from "@/lib/data/weekly-review";
import type { PrepSheetPayload } from "@/lib/data/prep-sheet";

export default async function TodayPage() {
  const supabase = await createClient();
  const [
    {
      data: { user },
    },
    today,
    contacts,
    tags,
    { data: pinnedWeeklyReview },
    { data: pinnedPrepSheets },
    defaultDraftTemplate,
  ] = await Promise.all([
    supabase.auth.getUser(),
    getTodayData(),
    listMergeCandidates(),
    listTags(),
    supabase.from("pinned_today_items").select("id, payload").eq("kind", "weekly_review").is("cleared_at", null).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("pinned_today_items").select("id, payload").eq("kind", "prep_sheet").is("cleared_at", null).order("created_at", { ascending: false }).limit(5),
    getDefaultDraftTemplate(),
  ]);

  // A prep sheet clears itself once its meeting's start time passes, even
  // if nobody clicked Clear - no cleanup job needed, just don't render a
  // stale one.
  const activePrepSheets = (pinnedPrepSheets ?? []).filter((p) => new Date((p.payload as unknown as PrepSheetPayload).startAt).getTime() > Date.now());

  const ownerId = user?.id ?? "";
  const openItems = today.calls.length + today.repliesOwed.length + today.myTasks.length + today.registeredNoFollowUp.length + today.bookingRequests.length;
  const lateCalls = today.calls.filter((c) => c.late).length;

  return (
    <>
      <TodayMobile
        today={today}
        contacts={contacts}
        activePrepSheets={activePrepSheets}
        pinnedWeeklyReview={pinnedWeeklyReview ?? null}
        defaultDraftTemplate={defaultDraftTemplate}
      />
      <div className="mx-auto hidden max-w-3xl px-4 py-6 md:block">
      <h1 className="font-serif text-2xl font-semibold text-neutral-900 sm:text-[28px]">{formatLocal(new Date(), "EEEE, MMMM d")}</h1>
      <p className="mt-1 text-[15px] text-neutral-500">{openItems} open item{openItems === 1 ? "" : "s"} today</p>

      {activePrepSheets.length > 0 && (
        <div className="mt-4 space-y-3">
          {activePrepSheets.map((p) => (
            <PrepSheetCard key={p.id} id={p.id} payload={p.payload as unknown as PrepSheetPayload} />
          ))}
        </div>
      )}

      {pinnedWeeklyReview && (
        <div className="mt-4">
          <WeeklyReviewCard id={pinnedWeeklyReview.id} payload={pinnedWeeklyReview.payload as unknown as WeeklyReviewPayload} />
        </div>
      )}

      <div className="mt-4">
        <TodayStatStrip
          totalActive={today.statStrip.totalActive}
          newLeadsWeek={today.statStrip.newLeadsWeek}
          hotCount={today.statStrip.hotCount}
          underContractCount={today.statStrip.underContractCount}
        />
      </div>

      <div className="mt-5">
        <DialerStrip count={today.newLeadsNeverCalled} />
      </div>

      <div className="mt-3 space-y-3">
        {today.bookingRequests.length > 0 && (
          <Section sectionKey="today:booking-requests" title="Meeting requests" meta={`${today.bookingRequests.length}`} defaultOpen>
            {today.bookingRequests.map((r) => (
              <BookingRequestRow key={r.id} request={r} />
            ))}
          </Section>
        )}

        {today.justFinished.length > 0 && (
          <Section sectionKey="today:just-finished" title="Just finished" meta={`${today.justFinished.length}`}>
            <WorklistGroup people={today.justFinished} />
          </Section>
        )}

        {today.suggested.length > 0 && (
          <Section sectionKey="today:suggested" title="Suggested" meta={`${today.suggested.length}`}>
            {today.suggested.map((s) => (
              <SuggestedRow
                key={s.insight.id}
                insight={s.insight}
                contactId={s.contactId}
                ownerId={ownerId}
                contactStageId={s.contactStageId}
                contactName={s.contactName}
                contactCreatedAt={s.contactCreatedAt}
                representing={s.representing}
                stages={today.stages}
                tags={tags}
                showContactName
              />
            ))}
          </Section>
        )}

        <Section sectionKey="today:calls" title="Calls" meta={lateCalls > 0 ? `${today.calls.length} · ${lateCalls} late` : `${today.calls.length}`}>
          <WorklistGroup people={today.calls} />
        </Section>

        <Section sectionKey="today:replies" title="Replies owed" meta={`${today.repliesOwed.length}`}>
          <WorklistGroup people={today.repliesOwed} onDismiss={dismissReplyOwed} />
        </Section>

        <Section sectionKey="today:tasks" title="My tasks" meta={`${today.myTasks.length}`}>
          <TodayTasksGroup tasks={today.myTasks} ownerId={ownerId} contacts={contacts} />
        </Section>

        <Section
          sectionKey="today:registered"
          title="Registered, no follow-up"
          meta={`${today.registeredNoFollowUp.length}`}
          defaultOpen={false}
          action={<TextAllButton contactIds={today.registeredNoFollowUp.map((p) => p.id)} label="Registered, no follow-up" />}
        >
          <WorklistGroup people={today.registeredNoFollowUp} />
        </Section>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <PipelineMiniCard stages={today.stages} counts={today.statStrip.stageCounts} />
        <CommissionMiniCard
          netCommission={today.commissionYear.netCommission}
          underContractNet={today.commissionYear.underContractNet}
          kwCapLeft={today.commissionYear.kwCapLeft}
          kwCapUsedPct={today.commissionYear.kwCapUsedPct}
        />
      </div>
      </div>
    </>
  );
}
