import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { conversationOwedFromHistory, inboxOwedCount, isConversationOwed } from "./message-owed";

const inbound = {
  type: "text" as const,
  direction: "inbound" as const,
  needs_reply: null as boolean | null,
  metadata: {} as Record<string, unknown>,
  reply_dismissed_at: null as string | null,
};
const outbound = { ...inbound, direction: "outbound" as const };
const missed = {
  type: "call" as const,
  direction: "inbound" as const,
  needs_reply: null,
  metadata: { status: "missed" },
  reply_dismissed_at: null,
};
const answered = { ...missed, metadata: { status: "completed" } };

assert.equal(isConversationOwed(inbound), true);
assert.equal(isConversationOwed({ ...inbound, needs_reply: false }), false);
assert.equal(isConversationOwed({ ...inbound, reply_dismissed_at: "2026-09-18T12:00:00Z" }), false);
assert.equal(isConversationOwed(missed), true);

assert.equal(conversationOwedFromHistory([outbound, inbound]).owed, false);
assert.equal(conversationOwedFromHistory([answered, inbound]).owed, true, "later answered call does not close an inbound text");
assert.equal(conversationOwedFromHistory([missed]).owed, true);

assert.equal(inboxOwedCount([{ owed: true }, { owed: false }, { owed: true }]), 2);

const root = join(process.cwd());
function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

const today = read("lib/data/today.ts");
assert.ok(today.includes('listConversations({ filter: "owed" })'), "Today owed group is listConversations");
assert.equal(today.includes("conversationOwedFromHistory"), false, "Today must not keep a second owed query");

const layout = read("app/(app)/layout.tsx");
assert.ok(layout.includes("inboxOwedCount(conversations)"), "sidebar badge uses inboxOwedCount");
assert.ok(layout.includes("listConversations()"), "sidebar badge is listConversations");

const messagesPage = read("app/(app)/messages/page.tsx");
assert.ok(messagesPage.includes("inboxOwedCount(conversations)"), "Messages waiting count uses inboxOwedCount");
assert.ok(messagesPage.includes("listConversations({ hidden })"), "Messages list is listConversations");

const messagesData = read("lib/data/messages.ts");
assert.ok(messagesData.includes("historyByContact"), "owed walks full thread history, not only the discovery window");

const row = read("components/messages/ConversationRow.tsx");
assert.ok(row.includes("flex-col"), "hidden/mobile cards stack so Reply/Call back cannot cover the name");
assert.ok(row.includes("sm:flex-row"), "desktop conversation rows stay horizontal");

console.log("inbox owed/unread contract: ok");
