import { getEventsReport } from "@/lib/data/events-report";
import { MeetupShowRateReport } from "@/components/reports/MeetupShowRateReport";
import { EventAttendanceTrendReport } from "@/components/reports/EventAttendanceTrendReport";
import { EventCommunityReport } from "@/components/reports/EventCommunityReport";
import { EventAudienceReport } from "@/components/reports/EventAudienceReport";
import { EventRoiReport } from "@/components/reports/EventRoiReport";
import { EventTopicsReport } from "@/components/reports/EventTopicsReport";
import { EventRosterReport } from "@/components/reports/EventRosterReport";

export default async function EventsReportPage() {
  const events = await getEventsReport();

  return (
    <>
      <MeetupShowRateReport series={events.showRate} />
      <EventAttendanceTrendReport series={events.attendanceTrend} />
      <EventCommunityReport
        communitySize={events.communitySize}
        newVsReturning={events.newVsReturning}
        repeatAttendance={events.repeatAttendance}
      />
      <EventAudienceReport contactType={events.audienceContactType} journeyStage={events.audienceJourneyStage} />
      <EventRoiReport rows={events.roi} />
      <EventTopicsReport rows={events.topTopics} />
      <EventRosterReport roster={events.roster} />
    </>
  );
}
