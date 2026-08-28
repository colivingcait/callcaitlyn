import { Lightbulb } from "lucide-react";
import { ComingSoon } from "@/components/ComingSoon";

export default function InsightsPage() {
  return (
    <ComingSoon
      title="Insights"
      description="A dedicated home for every AI-flagged suggestion across your contacts - coming in a later phase. For now, find them on Today's Suggested tray and each contact's own Suggested card."
      icon={Lightbulb}
    />
  );
}
