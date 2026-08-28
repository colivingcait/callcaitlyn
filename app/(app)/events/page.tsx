import { CalendarHeart } from "lucide-react";
import { ComingSoon } from "@/components/ComingSoon";

export default function EventsPage() {
  return (
    <ComingSoon
      title="Events"
      description="Rosters, show rates, and CSV exports as their own home instead of buried at the bottom of a report - coming in a later phase. Find them today under Reports → Events."
      icon={CalendarHeart}
    />
  );
}
