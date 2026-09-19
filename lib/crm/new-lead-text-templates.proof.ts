import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  FIRST_TOUCH_BLINQ,
  FIRST_TOUCH_EVENTBRITE,
  FIRST_TOUCH_FACEBOOK,
  FIRST_TOUCH_FALLBACK,
  FIRST_TOUCH_HOUSE_HACKING,
  FIRST_TOUCH_LISTING,
  FIRST_TOUCH_WEBFORM,
  FIRST_TOUCH_WOMENS_REI,
  FIRST_TOUCH_ZILLOW,
  buildNewLeadDraft,
  eventbriteAccountFromActivities,
  firstTouchSourceChipLabel,
  firstTouchTemplate,
  messageComposeHref,
  resolveFirstTouchSource,
  shouldPrefillFirstTouchSms,
} from "./new-lead-text-templates";

// Local proof for first-touch SMS routing. No Supabase. Run with:
//   npx tsx lib/crm/new-lead-text-templates.proof.ts

const leandra = { first_name: "Leandra", last_name: "Example" };

assert.equal(
  FIRST_TOUCH_WOMENS_REI,
  "Hi {{first_name}}, this is Caitlyn Verdugo, one of the organizers for the Women's Real Estate Meetup. Just wanted to introduce myself and welcome you to the group! Any questions I can answer for you? 🙂",
);
assert.equal(
  FIRST_TOUCH_HOUSE_HACKING,
  "Hi {{first_name}}, this is Caitlyn Verdugo, the organizer of the House Hacking Atlanta Meetup. Just wanted to introduce myself and welcome you to the group! Any questions I can answer for you? 🙂",
);
assert.equal(FIRST_TOUCH_BLINQ, "Hi {{first_name}}, this is Caitlyn! It was great meeting you! 🙂");
assert.equal(
  FIRST_TOUCH_LISTING,
  "Hi {{first_name}}, this is Caitlyn Verdugo with KW Metro Atlanta. I saw you checked out the offering on one of my listings - what questions I can answer for you? 🙂",
);
assert.equal(
  FIRST_TOUCH_WEBFORM,
  "Hi {{first_name}}, this is Caitlyn Verdugo with KW Metro Atlanta. Thanks for reaching out through my site — just wanted to introduce myself and see what you’re looking for! Any questions I can answer for you? 🙂",
);
assert.equal(FIRST_TOUCH_FALLBACK, "Hi {{first_name}}, this is Caitlyn Verdugo…");

assert.equal(resolveFirstTouchSource({ tagNames: ["Women's REI"] }), "womens_rei");
assert.equal(resolveFirstTouchSource({ eventbriteAccount: "womens_rei" }), "womens_rei");
assert.equal(resolveFirstTouchSource({ leadSource: "Women's Real Estate Investing — August" }), "womens_rei");
assert.equal(resolveFirstTouchSource({ lastEventName: "Women's REI Meetup" }), "womens_rei");
assert.equal(resolveFirstTouchSource({ leadSource: "Atlanta Women Investors (Newsletter)" }), "womens_rei");

assert.equal(resolveFirstTouchSource({ tagNames: ["House Hacking"] }), "house_hacking");
assert.equal(resolveFirstTouchSource({ eventbriteAccount: "house_hacking" }), "house_hacking");
assert.equal(resolveFirstTouchSource({ leadSource: "House Hacking Site" }), "house_hacking");
assert.equal(resolveFirstTouchSource({ leadSource: "House Hacking Site (Listing Alerts)" }), "house_hacking");
assert.equal(resolveFirstTouchSource({ lastEventName: "Financing a House Hack" }), "house_hacking");

// Women's tag wins when the event name talks about house hacking.
assert.equal(
  resolveFirstTouchSource({
    tagNames: ["Women's REI", "House Hacking"],
    leadSource: "House hacking for women",
    eventbriteAccount: "house_hacking",
  }),
  "womens_rei",
);

assert.equal(resolveFirstTouchSource({ leadSource: "Blinq" }), "blinq");
assert.equal(resolveFirstTouchSource({ tagNames: ["Blinq"] }), "blinq");

assert.equal(resolveFirstTouchSource({ leadSource: "Listing page — Ponce" }), "listing");
assert.equal(resolveFirstTouchSource({ leadSource: "Listing page offer — Ponce" }), "listing");
assert.equal(resolveFirstTouchSource({ leadSource: "Listing page — seller analysis request" }), "listing");
assert.equal(resolveFirstTouchSource({ tagNames: ["Investor Lead"] }), "listing");

assert.equal(resolveFirstTouchSource({ leadSource: "CallCaitlyn.com (Contact Form)" }), "webform");
assert.equal(resolveFirstTouchSource({ leadSource: "CallCaitlyn.com (Work With Me)" }), "webform");
assert.equal(resolveFirstTouchSource({ leadSource: "callcaitlyn (contact)" }), "webform");

assert.equal(resolveFirstTouchSource({ leadSource: "Instagram" }), "other");
assert.equal(resolveFirstTouchSource({ leadSource: "Eventbrite" }), "eventbrite");
assert.equal(resolveFirstTouchSource({ lastEventName: "Atlanta Investor Night" }), "eventbrite");
assert.equal(resolveFirstTouchSource({ leadSource: "CoLivingCait (Contact Form)" }), "other");
assert.equal(resolveFirstTouchSource({ leadSource: "Women's Coliving Summit (Newsletter)" }), "other");
assert.equal(resolveFirstTouchSource({ leadSource: "Referral partner (agent)" }), "other");

assert.equal(resolveFirstTouchSource({ leadSource: "Zillow" }), "zillow");
assert.equal(resolveFirstTouchSource({ leadSource: "Zillow Premier Agent" }), "zillow");
assert.equal(resolveFirstTouchSource({ leadSource: "Facebook" }), "facebook");
assert.equal(resolveFirstTouchSource({ leadSource: "Facebook Lead Ads" }), "facebook");
assert.equal(
  resolveFirstTouchSource({ leadSource: "Zillow", lastEventName: "House Hacking Atlanta Meetup" }),
  "zillow",
  "explicit Zillow source beats leftover last_event_name",
);
assert.equal(
  resolveFirstTouchSource({ leadSource: "Inside the Making of a 250-Home Neighborhood", eventbriteAccount: "womens_rei" }),
  "womens_rei",
);

assert.equal(firstTouchTemplate({ leadSource: "Zillow" }), FIRST_TOUCH_ZILLOW);
assert.equal(firstTouchTemplate({ leadSource: "Facebook" }), FIRST_TOUCH_FACEBOOK);
assert.equal(firstTouchTemplate({ leadSource: "Eventbrite" }), FIRST_TOUCH_EVENTBRITE);
assert.equal(firstTouchSourceChipLabel({ leadSource: "Zillow" }), "Zillow");

const womensFilled = buildNewLeadDraft(leandra.first_name, "Women's REI Meetup");
assert.equal(
  womensFilled,
  "Hi Leandra, this is Caitlyn Verdugo, one of the organizers for the Women's Real Estate Meetup. Just wanted to introduce myself and welcome you to the group! Any questions I can answer for you? 🙂",
);
assert.equal(womensFilled.includes("{{first_name}}"), false);

assert.equal(
  buildNewLeadDraft(leandra.first_name, "House Hacking Atlanta Meetup"),
  "Hi Leandra, this is Caitlyn Verdugo, the organizer of the House Hacking Atlanta Meetup. Just wanted to introduce myself and welcome you to the group! Any questions I can answer for you? 🙂",
);
assert.equal(buildNewLeadDraft(leandra.first_name, "Blinq"), "Hi Leandra, this is Caitlyn! It was great meeting you! 🙂");
assert.equal(
  buildNewLeadDraft(leandra.first_name, "Listing page — Ponce"),
  "Hi Leandra, this is Caitlyn Verdugo with KW Metro Atlanta. I saw you checked out the offering on one of my listings - what questions I can answer for you? 🙂",
);
assert.equal(
  buildNewLeadDraft(leandra.first_name, "CallCaitlyn.com (Contact Form)"),
  "Hi Leandra, this is Caitlyn Verdugo with KW Metro Atlanta. Thanks for reaching out through my site — just wanted to introduce myself and see what you’re looking for! Any questions I can answer for you? 🙂",
);
assert.equal(
  buildNewLeadDraft("Asianna", "Zillow"),
  "Hey Asianna — Caitlyn here (KW Metro Atlanta). Saw you came through Zillow looking at Atlanta homes — want me to pull a few that match what you liked?",
);
assert.equal(
  buildNewLeadDraft("Jordan", "Facebook"),
  "Hey Jordan — Caitlyn here (KW Metro Atlanta). Saw you came through Facebook — wanted to introduce myself and see how I can help with Atlanta homes!",
);

assert.equal(buildNewLeadDraft(leandra.first_name, "Instagram"), "Hi Leandra, this is Caitlyn Verdugo…");
assert.equal(firstTouchTemplate({ leadSource: "Instagram" }), FIRST_TOUCH_FALLBACK);

assert.equal(shouldPrefillFirstTouchSms({ hasOutboundText: true, source: "womens_rei" }), false);
assert.equal(shouldPrefillFirstTouchSms({ hasOutboundText: false, source: "blinq", hasPriorOutreach: true }), true);
assert.equal(shouldPrefillFirstTouchSms({ hasOutboundText: false, source: "other", hasPriorOutreach: true }), true);
assert.equal(shouldPrefillFirstTouchSms({ hasOutboundText: false, source: "other", hasPriorOutreach: false }), true);

assert.equal(eventbriteAccountFromActivities([{ metadata: { eventbrite_account: "womens_rei" } }]), "womens_rei");
assert.equal(
  resolveFirstTouchSource({ leadSource: "Inside the Making of a 250-Home Neighborhood", eventbriteAccount: "womens_rei" }),
  "womens_rei",
);
assert.equal(messageComposeHref("abc"), "/messages/abc");
assert.ok(messageComposeHref("abc", "Hi Leandra").includes("draft="));

const root = join(process.cwd());
function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

const messagesPage = read("app/(app)/messages/[id]/page.tsx");
assert.ok(messagesPage.includes("firstTouchTemplate"), "message thread prefills first-touch SMS");
assert.ok(messagesPage.includes("shouldPrefillFirstTouchSms"), "message thread only prefills first SMS");
assert.equal(messagesPage.includes("onAdvance="), false, "no server→client function props on the thread page");

const worklist = read("components/dashboard/WorklistGroup.tsx");
assert.ok(worklist.includes("smsDraft"), "New/uncontacted Text carries the draft into /messages");
assert.ok(worklist.includes("messageComposeHref"), "Text link uses messageComposeHref prefill");

const engage = read("components/contacts/EngageStrip.tsx");
assert.ok(engage.includes("smsDraft"), "Contact → Text carries first-touch draft");
assert.ok(engage.includes("messageComposeHref"), "Contact → Text opens compose with ?draft=");

const contactPage = read("app/(app)/contacts/[id]/page.tsx");
assert.ok(contactPage.includes("smsDraft={firstTouchBody}"), "contact record passes first-touch draft into Engage Text");
assert.ok(contactPage.includes("eventbriteAccountFromActivities"), "contact record uses Eventbrite account for routing");

const newLeads = read("lib/data/new-leads.ts");
assert.ok(newLeads.includes('.eq("spam", false)'), "new-lead queue stays spam-filtered");

const todayHome = read("components/dashboard/TodayHome.tsx");
const dialerJsx = todayHome.indexOf("<TextAndNextDialer");
const pipelineJsx = todayHome.indexOf("<TodayPipelineOverview");
assert.ok(dialerJsx >= 0, "Today home mounts the on-page Text & Next dialer");
assert.ok(pipelineJsx > dialerJsx, "Text & Next sits above Pipeline Overview");
assert.equal(todayHome.includes("onAdvance="), false, "no server→client function props on Today home");

const dialer = read("components/dashboard/TextAndNextDialer.tsx");
assert.ok(dialer.includes("sendTextToContact"), "Send & next uses the existing Quo send path");
assert.ok(dialer.includes("Send & next"), "dialer primary action is Send & next");
assert.ok(dialer.includes("Skip"), "dialer has Skip");
assert.equal(dialer.includes("onAdvance="), false, "dialer does not take a function prop from the server");

const queues = read("components/dashboard/TodayQueues.tsx");
assert.ok(queues.includes("featured"), "New/uncontacted queue row still has stronger chrome when N>0");

console.log("new-lead first-touch templates: ok");
