import { MeetupShowRateReport } from "@/components/reports/MeetupShowRateReport";
import { EventAttendanceTrendReport } from "@/components/reports/EventAttendanceTrendReport";
import { EventCommunityReport } from "@/components/reports/EventCommunityReport";
import { EventAudienceReport } from "@/components/reports/EventAudienceReport";
import { EventRoiReport } from "@/components/reports/EventRoiReport";
import { EventTopicsReport } from "@/components/reports/EventTopicsReport";
import { QuestionExtras } from "@/components/reports/QuestionExtras";
import type { EventsReportData } from "@/lib/data/events-report";

// Same six components Reports used to render under "Are the meetups
// working?" - moved here, read where the events actually are. They stay
// aggregate across every occurrence of both series rather than scoped to
// just this one event, since the question they answer is a trend question;
// thisEventShowRate is the one number here that's specific to this event.
export function InsightsTab({ report, thisEventShowRate }: { report: EventsReportData; thisEventShowRate: number | null }) {
  return (
    <div>
      {thisEventShowRate !== null && (
        <div className="mb-4 rounded-2xl border border-[#ebe9e7] bg-white px-4 py-3.5">
          <p className="text-2xl font-semibold text-neutral-900">{thisEventShowRate}%</p>
          <p className="text-sm text-neutral-500">showed up for this event</p>
        </div>
      )}

      <MeetupShowRateReport series={report.showRate} />
      <QuestionExtras
        items={[
          { key: "attendanceTrend", label: "Attendance trend", content: <EventAttendanceTrendReport series={report.attendanceTrend} /> },
          {
            key: "community",
            label: "Community",
            content: (
              <EventCommunityReport communitySize={report.communitySize} newVsReturning={report.newVsReturning} repeatAttendance={report.repeatAttendance} />
            ),
          },
          {
            key: "audience",
            label: "Audience quality",
            content: <EventAudienceReport contactType={report.audienceContactType} journeyStage={report.audienceJourneyStage} />,
          },
          { key: "roi", label: "ROI", content: <EventRoiReport rows={report.roi} /> },
          { key: "topics", label: "Top topics", content: <EventTopicsReport rows={report.topTopics} /> },
        ]}
      />

      <p className="mt-4 text-sm text-neutral-400">
        These are all-time trends across every event, not just this one — and &quot;attended&quot; means a check-in was actually recorded, so anyone
        missed at the door won&apos;t show up here until marked attended.
      </p>
    </div>
  );
}
