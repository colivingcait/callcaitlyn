import Link from "next/link";
import { PhoneCall, ChevronRight } from "lucide-react";

// "N new leads never called - kept out of this list" - the Dialer already
// owns that queue end to end (snooze, connected/no-answer); Today just
// points at it rather than duplicating it as an eleventh worklist group.
export function DialerStrip({ count }: { count: number }) {
  if (count === 0) return null;

  return (
    <Link
      href="/dialer"
      className="flex items-center gap-3 rounded-2xl border border-[#ebe9e7] bg-white px-[18px] py-3.5"
    >
      <PhoneCall size={18} className="shrink-0 text-neutral-400" />
      <p className="min-w-0 flex-1 text-[15px] text-neutral-700">
        <span className="font-semibold text-neutral-900">{count}</span> new lead{count === 1 ? "" : "s"} never called — kept out of this list, handled in the Dialer
      </p>
      <ChevronRight size={17} className="shrink-0 text-neutral-400" />
    </Link>
  );
}
