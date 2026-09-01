import { Section } from "@/components/ui/Section";
import { EventbriteSyncBackfill } from "@/components/settings/EventbriteSyncBackfill";
import { JotformSyncBackfill } from "@/components/settings/JotformSyncBackfill";
import { QuoSyncBackfill } from "@/components/settings/QuoSyncBackfill";
import { BacklogCleanup } from "@/components/settings/BacklogCleanup";

// The four one-off backfills are the same kind of thing - catching up on
// whatever a webhook missed - and none is a daily job, so they collect
// here instead of four long paragraphs dominating the page.
export function DataRepairCard() {
  return (
    <Section sectionKey="settings:data-repair" title="Data repair" meta="catch up on anything a webhook missed" defaultOpen={false}>
      <div className="space-y-3.5 px-[18px] py-4">
        <EventbriteSyncBackfill />
        <JotformSyncBackfill />
        <QuoSyncBackfill />
        <BacklogCleanup />
      </div>
    </Section>
  );
}
