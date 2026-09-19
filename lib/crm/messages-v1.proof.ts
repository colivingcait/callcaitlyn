import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { INBOX_SEEN_MAX, markInboxSeen, parseInboxSeen } from "./inbox-seen";
import {
  filterSmsInboxThreads,
  formatInboxPhone,
  inboxRelativeTime,
  isSmsUnread,
  parseMessagesFilter,
  smsNeedsReply,
  toSmsInboxThreads,
  unseenInboundCount,
  type SmsInboxThread,
} from "./messages-v1";

// Messages v1 (Nico mock): SMS inbox, Needs reply / Unread / All,
// desktop 38/62 split, mobile list → thread. No Supabase.
// Run with: npx tsx lib/crm/messages-v1.proof.ts

const inbound = { type: "text" as const, direction: "inbound" as const, occurred_at: "2026-09-19T16:00:00.000Z" };
const outbound = { type: "text" as const, direction: "outbound" as const, occurred_at: "2026-09-19T17:00:00.000Z" };
const call = { type: "call" as const, direction: "inbound" as const, occurred_at: "2026-09-19T18:00:00.000Z" };

assert.equal(smsNeedsReply([inbound]), true);
assert.equal(smsNeedsReply([outbound, inbound]), false, "outbound since last inbound closes needs-reply");
assert.equal(smsNeedsReply([call, inbound]), true, "a later call does not close an inbound SMS");
assert.equal(smsNeedsReply([call]), false);
assert.equal(smsNeedsReply([]), false);

assert.equal(isSmsUnread("2026-09-19T16:00:00.000Z", null), true);
assert.equal(isSmsUnread(null, null), false);
assert.equal(isSmsUnread("2026-09-19T16:00:00.000Z", "2026-09-19T15:00:00.000Z"), true);
assert.equal(isSmsUnread("2026-09-19T16:00:00.000Z", "2026-09-19T16:00:00.000Z"), false);
assert.equal(isSmsUnread("2026-09-19T16:00:00.000Z", "2026-09-19T17:00:00.000Z"), false);

assert.equal(unseenInboundCount(["2026-09-19T16:00:00.000Z", "2026-09-18T16:00:00.000Z"], null), 2);
assert.equal(unseenInboundCount(["2026-09-19T16:00:00.000Z", "2026-09-18T16:00:00.000Z"], "2026-09-18T20:00:00.000Z"), 1);

assert.equal(parseMessagesFilter(undefined), "needs");
assert.equal(parseMessagesFilter("owed"), "needs");
assert.equal(parseMessagesFilter("unread"), "unread");
assert.equal(parseMessagesFilter("all"), "all");

const now = new Date("2026-09-19T16:00:00.000Z");
assert.equal(inboxRelativeTime(new Date(now.getTime() - 16 * 60_000).toISOString(), now), "16m");
assert.equal(inboxRelativeTime(new Date(now.getTime() - 60 * 60_000).toISOString(), now), "1h");
assert.equal(inboxRelativeTime(new Date(now.getTime() - 26 * 60 * 60_000).toISOString(), now), "Yesterday");
assert.equal(formatInboxPhone("4045550142"), "+1 (404) 555-0142");
assert.equal(formatInboxPhone("+14045550142"), "+1 (404) 555-0142");

assert.deepEqual(parseInboxSeen(undefined), {});
assert.deepEqual(parseInboxSeen('{"c1":"2026-09-19T16:00:00.000Z"}'), { c1: "2026-09-19T16:00:00.000Z" });
const marked = markInboxSeen({}, "c1", "2026-09-19T16:00:00.000Z");
assert.equal(marked.c1, "2026-09-19T16:00:00.000Z");
const overflow: Record<string, string> = {};
for (let i = 0; i < INBOX_SEEN_MAX + 5; i += 1) overflow[`c${i}`] = new Date(1_000_000 + i * 1000).toISOString();
assert.equal(Object.keys(markInboxSeen(overflow, "new", new Date().toISOString())).length, INBOX_SEEN_MAX);

const sample: SmsInboxThread = {
  id: "a",
  firstName: "Austin",
  lastName: "Sizemore",
  phone: "+14045550142",
  stageName: "Hot",
  representing: "buyer",
  preview: "Hey!!",
  occurredAt: "2026-09-19T16:00:00.000Z",
  lastInboundAt: "2026-09-19T16:00:00.000Z",
  needsReply: true,
  recentInboundAt: ["2026-09-19T16:00:00.000Z"],
};
const maria: SmsInboxThread = {
  ...sample,
  id: "m",
  firstName: "Maria",
  lastName: "Chen",
  preview: "Sounds good",
  needsReply: false,
  lastInboundAt: "2026-09-18T16:00:00.000Z",
  recentInboundAt: ["2026-09-18T16:00:00.000Z"],
};
assert.equal(filterSmsInboxThreads([sample, maria], "needs", {}, "").map((t) => t.id).join(","), "a");
assert.equal(filterSmsInboxThreads([sample, maria], "unread", { a: "2026-09-19T17:00:00.000Z" }, "").map((t) => t.id).join(","), "m");
assert.equal(filterSmsInboxThreads([sample, maria], "all", {}, "sizemore").map((t) => t.id).join(","), "a");
assert.equal(toSmsInboxThreads([]).length, 0);

const root = join(process.cwd());
function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

const inbox = read("components/messages/MessagesInbox.tsx");
assert.ok(inbox.includes("Needs reply"), "segmented Needs reply filter");
assert.ok(inbox.includes("Unread"), "Unread filter");
assert.ok(inbox.includes(">All<") || inbox.includes('label: "All"'), "All filter");
assert.ok(inbox.includes("w-[38%]"), "desktop list pane is ~38%");
assert.ok(inbox.includes("w-[62%]"), "desktop thread pane is ~62%");
assert.equal(inbox.includes("overflow-x-auto"), false, "filters are not a horizontal chip scroll");
assert.ok(inbox.includes("SMS threads that need you"), "subtitle matches mock");
assert.ok(inbox.includes("Search threads"), "Search threads");
assert.equal(inbox.includes("email"), false, "no email tab on Messages v1");
assert.equal(inbox.includes("onAdvance"), false, "send must not take a queue-advance callback");

const filters = inbox.slice(inbox.indexOf("const FILTERS"), inbox.indexOf("export function MessagesInbox"));
assert.ok(filters.includes("needs"));
assert.ok(filters.includes("unread"));
assert.ok(filters.includes("all"));
assert.equal(filters.includes("calls"), false);
assert.equal(filters.includes("spam"), false);

const pane = read("components/messages/InboxThreadPane.tsx");
assert.ok(pane.includes("Call"), "Call action");
assert.ok(pane.includes("Open contact"), "Open contact action");
assert.ok(pane.includes('href={`/contacts/${contactId}`}'), "Open contact goes to the contact record");
assert.ok(pane.includes("openQuoCall"), "Call uses existing Quo/OpenPhone path");
assert.ok(pane.includes("InboxComposer"), "thread uses the SMS composer");
assert.ok(pane.includes('layout === "mobile"'), "mobile thread is its own full-screen chrome");
assert.ok(pane.includes("Messages"), "mobile thread backs to Messages");

const composer = read("components/messages/InboxComposer.tsx");
assert.ok(composer.includes("sendTextToContact"), "Send uses the existing Quo SMS path");
assert.ok(composer.includes("Reply"), "composer placeholder is Reply");
assert.ok(composer.includes("Send"), "composer has a Send button");
assert.ok(composer.includes("SMS ·"), "channel footnote");
assert.equal(composer.includes("router.push"), false, "Send stays on the thread — does not advance a queue");
assert.ok(composer.includes("router.refresh"), "Send refreshes the open thread");

const row = read("components/messages/InboxThreadRow.tsx");
assert.ok(row.includes("Needs reply"), "optional Needs reply chip");
assert.ok(row.includes("unread"), "unread indicator");

const listPage = read("app/(app)/messages/page.tsx");
assert.ok(listPage.includes("toSmsInboxThreads"), "v1 list is SMS threads from listConversations");
assert.ok(listPage.includes("listConversations()"), "reuses conversation list data layer");
assert.ok(listPage.includes("MessagesInbox"), "v1 inbox chrome");
assert.equal(listPage.includes("onAdvance"), false);

const threadPage = read("app/(app)/messages/[id]/page.tsx");
assert.ok(threadPage.includes("firstTouchTemplate"), "thread still prefills first-touch SMS");
assert.ok(threadPage.includes("shouldPrefillFirstTouchSms"));
assert.ok(threadPage.includes("activity.type === \"text\""), "thread is SMS-only");
assert.equal(threadPage.includes("onAdvance="), false, "no server→client function props");
assert.equal(threadPage.includes("CallLogEntry"), false, "no call log in the SMS thread");

const nav = read("components/nav/BottomNav.tsx");
assert.ok(nav.includes("onSmsThread"), "mobile 5-tab hides on the full-screen thread");
assert.ok(nav.includes('href: "/messages"') || read("components/nav/nav-items.ts").includes('href: "/messages"'));

const href = read("lib/crm/inbox-href.ts");
assert.ok(href.includes("parseMessagesFilter"), "inbox URLs use v1 filters");

console.log("messages v1: ok");
