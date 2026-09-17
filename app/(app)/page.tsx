import { getTodayData } from "@/lib/data/today";
import { listMergeCandidates } from "@/lib/data/contacts";
import { createClient } from "@/lib/supabase/server";
import { TodayScreen } from "@/components/dashboard/TodayScreen";
import { firstNameFromEmail } from "@/lib/utils";
import { filterResolvedWeeklyReviewItems, type WeeklyReviewPayload } from "@/lib/data/weekly-review";
import type { PrepSheetPayload } from "@/lib/data/prep-sheet";

export default async function TodayPage({ searchParams }: { searchParams: Promise<{ focus?: string }> }) {
  const { focus } = await searchParams;
  const supabase = await createClient();
  const [
    {
      data: { user },
    },
    today,
    contacts,
    { data: pinnedWeeklyReview },
    { data: pinnedPrepSheets },
  ] = await Promise.all([
    supabase.auth.getUser(),
    getTodayData(),
    listMergeCandidates(),
    supabase.from("pinned_today_items").select("id, payload").eq("kind", "weekly_review").is("cleared_at", null).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("pinned_today_items").select("id, payload").eq("kind", "prep_sheet").is("cleared_at", null).order("created_at", { ascending: false }).limit(5),
  ]);

  const activePrepSheets = (pinnedPrepSheets ?? []).filter((p) => new Date((p.payload as unknown as PrepSheetPayload).startAt).getTime() > Date.now());

  const ownerId = user?.id ?? "";
  const ownerFirstName = firstNameFromEmail(user?.email);

  const resolvedWeeklyReview = pinnedWeeklyReview
    ? { id: pinnedWeeklyReview.id, payload: await filterResolvedWeeklyReviewItems(supabase, ownerId, pinnedWeeklyReview.payload as unknown as WeeklyReviewPayload) }
    : null;

  return (
    <TodayScreen
      today={today}
      contacts={contacts}
      ownerId={ownerId}
      ownerFirstName={ownerFirstName}
      activePrepSheets={activePrepSheets}
      pinnedWeeklyReview={resolvedWeeklyReview}
      focus={focus}
    />
  );
}
