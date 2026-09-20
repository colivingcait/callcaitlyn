import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildAgentRail,
  buildListingTimeline,
  classifyListingPageActivity,
  lastChannelLabel,
  rpAudienceLabel,
  rpBlastHref,
  rpBlastTemplateName,
} from "./listing-activity";
import type { ListingAgentTouch, ListingPageLeadEvent, ListingStatusChange } from "./listing-activity";
import type { ListingPriceChange, ListingSend } from "@/types/database";

const root = join(process.cwd());
function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

assert.equal(rpAudienceLabel("not_contacted"), "Not contacted");
assert.equal(rpAudienceLabel("non_repliers"), "Non-repliers");
assert.equal(rpAudienceLabel("all"), "Everyone eligible");
assert.equal(rpBlastTemplateName({ channel: "email", subject: "Coming Soon intro", message: "Hi" }), "Coming Soon intro");
assert.equal(rpBlastTemplateName({ channel: "text", subject: null, message: "Price drop on Gillette" }), "Price drop on Gillette");
assert.equal(rpBlastHref("listing-1", "send-9"), "/listings/listing-1?tab=rp#listing-send-send-9");
assert.equal(lastChannelLabel("call"), "Call");
assert.equal(lastChannelLabel("text"), "Text");
assert.equal(lastChannelLabel("email"), "Email");
assert.equal(classifyListingPageActivity({ body: "Unlocked financials on Gillette", dedupe_field: "listing_unlock_key" }), "unlock");
assert.equal(classifyListingPageActivity({ body: "Offer on Gillette — Price: $465k", dedupe_field: "listing_offer_key" }), "offer");

const statusChanges: ListingStatusChange[] = [
  { id: "s1", old_status: "active", new_status: "under_contract", occurred_at: "2026-09-18T15:00:00.000Z" },
];
const priceChanges: ListingPriceChange[] = [
  { id: "p1", listing_id: "L", owner_id: "o", old_price: 479000, new_price: 465000, occurred_at: "2026-09-17T15:00:00.000Z" },
];
const sends: ListingSend[] = [
  {
    id: "send-1",
    owner_id: "o",
    listing_id: "L",
    channel: "email",
    subject: "Coming Soon intro",
    message: "Hello agents",
    audience: "not_contacted",
    status: "completed",
    send_immediately: true,
    created_at: "2026-09-16T15:00:00.000Z",
    completed_at: "2026-09-16T15:10:00.000Z",
  },
];
const messages: ListingAgentTouch[] = [
  {
    id: "m1",
    listing_id: "L",
    listing_agent_id: "la1",
    agent_id: "a1",
    owner_id: "o",
    direction: "inbound",
    channel: "call",
    body: "Missed call 0:12",
    occurred_at: "2026-09-19T15:00:00.000Z",
    quo_message_id: null,
    quo_call_id: "c1",
    metadata: null,
    created_at: "2026-09-19T15:00:00.000Z",
    name: "Jamie Lee",
    brokerage: "Compass",
    phone: "4045551212",
    email: "jamie@compass.com",
    alreadyPartner: false,
  },
  {
    id: "m0",
    listing_id: "L",
    listing_agent_id: "la1",
    agent_id: "a1",
    owner_id: "o",
    direction: "outbound",
    channel: "text",
    body: "Thanks for calling",
    occurred_at: "2026-09-19T14:00:00.000Z",
    quo_message_id: "q1",
    quo_call_id: null,
    metadata: null,
    created_at: "2026-09-19T14:00:00.000Z",
    name: "Jamie Lee",
    brokerage: "Compass",
    phone: "4045551212",
    email: "jamie@compass.com",
    alreadyPartner: false,
  },
];
const pageEvents: ListingPageLeadEvent[] = [
  { id: "u1", kind: "unlock", occurred_at: "2026-09-15T15:00:00.000Z", name: "Alex Rivera", body: "Unlocked financials on Gillette" },
  { id: "o1", kind: "offer", occurred_at: "2026-09-14T15:00:00.000Z", name: "Alex Rivera", body: "Offer on Gillette — Price: $465k" },
];

const timeline = buildListingTimeline({
  listingId: "L",
  listingCreatedAt: "2026-09-01T15:00:00.000Z",
  statusChanges,
  priceChanges,
  sends,
  messages,
  pageEvents,
});

assert.equal(timeline[0]?.kind, "inbound_agent", "newest first");
assert.ok(timeline.some((e) => e.kind === "status" && e.title.includes("Active → Under contract")));
assert.ok(timeline.some((e) => e.kind === "price" && e.title.includes("479,000") && e.title.includes("465,000")));
assert.ok(timeline.some((e) => e.kind === "rp_blast" && e.title.includes("Coming Soon intro") && e.href?.includes("#listing-send-send-1")));
assert.ok(timeline.some((e) => e.kind === "inbound_agent" && e.title.includes("Jamie Lee") && e.callBackPhone === "4045551212"));
assert.ok(timeline.some((e) => e.kind === "investor_unlock" && e.title.includes("Alex Rivera")));
assert.ok(timeline.some((e) => e.kind === "offer" && e.title.includes("Offer terms submitted")));
assert.equal(timeline.filter((e) => e.kind === "inbound_agent").length, 1, "outbound agent texts are not timeline inbound events");

const rail = buildAgentRail(messages);
assert.equal(rail.length, 1);
assert.equal(rail[0]?.name, "Jamie Lee");
assert.equal(rail[0]?.brokerage, "Compass");
assert.equal(rail[0]?.lastChannel, "Call");
assert.equal(rail[0]?.alreadyPartner, false);

const page = read("app/(app)/listings/[id]/page.tsx");
assert.ok(page.includes("max-w-[1400px]"), "listing detail is a desktop page, not a phone shell");
assert.equal(page.includes("max-w-3xl"), false, "listing detail must not stay a phone column");
assert.ok(page.includes('label: "Activity"'));
assert.ok(page.includes("ListingStatusMenu"));
assert.ok(page.includes("statusChanges"));
assert.ok(page.includes("pageEvents"));
assert.equal(page.includes("onSend="), false);

const tab = read("components/listings/ActivityTab.tsx");
assert.ok(tab.includes("lg:grid-cols-"), "Activity is two-col on desktop");
assert.ok(tab.includes("Call back"));
assert.ok(tab.includes("Add as Referral Partner"));
assert.equal(tab.includes("Add to contacts as Referral Partner"), false);
assert.ok(tab.includes("buildListingTimeline"));
assert.ok(tab.includes("buildAgentRail"));
assert.ok(tab.includes("openQuoCall"));
assert.ok(tab.includes("promoteAgentToContact"));

const actions = read("app/(app)/listings/actions.ts");
assert.ok(actions.includes("listing_status_changes"));
assert.ok(actions.includes("audience: input.audience"));
assert.ok(actions.includes("contact_type: \"referral_partner\""));
assert.ok(actions.includes("phonesMatch"));

const webhook = read("app/api/webhooks/quo/route.ts");
assert.ok(webhook.includes("contactExistsForPhone"));
assert.ok(webhook.includes("findAgentByPhone"));
assert.ok(webhook.includes("listing_agent_messages"));

console.log("listing activity SoT: ok");
