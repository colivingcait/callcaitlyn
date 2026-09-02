import { Section } from "@/components/ui/Section";
import { EventbriteSyncBackfill } from "@/components/settings/EventbriteSyncBackfill";
import { JotformSyncBackfill } from "@/components/settings/JotformSyncBackfill";
import { QuoSyncBackfill } from "@/components/settings/QuoSyncBackfill";
import { GranolaSyncBackfill } from "@/components/settings/GranolaSyncBackfill";
import { BlinqShareBackfill } from "@/components/settings/BlinqShareBackfill";
import { BacklogCleanup } from "@/components/settings/BacklogCleanup";
import { TagSuggestionBackfill } from "@/components/settings/TagSuggestionBackfill";
import { EventOrdersCsvImport } from "@/components/settings/EventOrdersCsvImport";

// The one-off backfills are the same kind of thing - catching up on
// whatever a webhook missed - and none is a daily job, so they collect
// here instead of long paragraphs dominating the page.
export function DataRepairCard() {
  return (
    <Section sectionKey="settings:data-repair" title="Data repair" meta="catch up on anything a webhook missed" defaultOpen={false}>
      <div className="space-y-3.5 px-[18px] py-4">
        <EventOrdersCsvImport />
        <EventbriteSyncBackfill />
        <JotformSyncBackfill />
        <QuoSyncBackfill />
        <GranolaSyncBackfill />
        <BlinqShareBackfill />
        <BacklogCleanup />
        <TagSuggestionBackfill />
      </div>
    </Section>
  );
}
