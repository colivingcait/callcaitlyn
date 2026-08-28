import { getTodayData } from "@/lib/data/today";
import { listMergeCandidates } from "@/lib/data/contacts";
import { createClient } from "@/lib/supabase/server";
import { formatLocal } from "@/lib/format-time";
import { Section } from "@/components/ui/Section";
import { SuggestedRow } from "@/components/contacts/SuggestedRow";
import { WorklistGroup } from "@/components/dashboard/WorklistGroup";
import { TodayTasksGroup } from "@/components/dashboard/TodayTasksGroup";
import { TodayStatStrip } from "@/components/dashboard/TodayStatStrip";
import { PipelineMiniCard } from "@/components/dashboard/PipelineMiniCard";
import { CommissionMiniCard } from "@/components/dashboard/CommissionMiniCard";
import { DialerStrip } from "@/components/dashboard/DialerStrip";
import { TextAllButton } from "@/components/dashboard/TextAllButton";
import { WeeklyReviewCard } from "@/components/dashboard/WeeklyReviewCard";
import type { WeeklyReviewPayload } from "@/lib/data/weekly-review";

export default async function TodayPage() {
  const supabase = await createClient();
  const [
    {
      data: { user },
    },
    today,
    contacts,
    { data: pinnedWeeklyReview },
  ] = await Promise.all([
    supabase.auth.getUser(),
    getTodayData(),
    listMergeCandidates(),
    supabase.from("pinned_today_items").select("id, payload").eq("kind", "weekly_review").is("cleared_at", null).order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);

  const ownerId = user?.id ?? "";
  const openItems = today.calls.length + today.repliesOwed.length + today.myTasks.length + today.registeredNoFollowUp.length;
  const lateCalls = today.calls.filter((c) => c.late).length;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="font-serif text-2xl font-semibold text-neutral-900 sm:text-[28px]">{formatLocal(new Date(), "EEEE, MMMM d")}</h1>
      <p className="mt-1 text-[15px] text-neutral-500">{openItems} open item{openItems === 1 ? "" : "s"} today</p>

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
                showContactName
              />
            ))}
          </Section>
        )}

        <Section sectionKey="today:calls" title="Calls" meta={lateCalls > 0 ? `${today.calls.length} · ${lateCalls} late` : `${today.calls.length}`}>
          <WorklistGroup people={today.calls} />
        </Section>

        <Section sectionKey="today:replies" title="Replies owed" meta={`${today.repliesOwed.length}`}>
          <WorklistGroup people={today.repliesOwed} />
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
  );
}
