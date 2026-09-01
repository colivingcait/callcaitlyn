import type { Activity } from "@/types/database";

export const MISSED_CALL_STATUSES = new Set(["missed", "no-answer", "no_answer", "busy", "voicemail"]);

export function isMissedCall(activity: Pick<Activity, "type" | "direction" | "metadata">): boolean {
  if (activity.type !== "call" || activity.direction !== "inbound") return false;
  const status = typeof activity.metadata?.status === "string" ? activity.metadata.status.toLowerCase() : null;
  return status != null && MISSED_CALL_STATUSES.has(status);
}

// One canonical answer to "does this thread need something from her" -
// reused by the Messages page's owed/not-owed split and the sidebar
// badge, instead of the three different definitions that used to exist
// (Today's text-only getRepliesOwedGroup, which already respected
// needs_reply; listConversations, which didn't look at it at all; and
// the sidebar badge, which used a third inbound-only check). A missed
// call counts as owed too - it gets its own "Call back" treatment on
// Messages, grouped into the same bucket.
//
// reply_dismissed_at is "I looked at this, I don't need to act on it" -
// a deliberate, per-message call, not a delete/spam/archive. It's
// checked here (not just in Today's own query) so dismissing a thread
// on Messages also clears it from Today's Replies owed and the sidebar
// badge, and vice versa - one predicate, one answer everywhere.
export function isConversationOwed(activity: Pick<Activity, "type" | "direction" | "needs_reply" | "metadata" | "reply_dismissed_at">): boolean {
  if (activity.reply_dismissed_at) return false;
  if (activity.type === "text") {
    return activity.direction === "inbound" && activity.needs_reply !== false;
  }
  if (activity.type === "call") {
    return isMissedCall(activity);
  }
  return false;
}
