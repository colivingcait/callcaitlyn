import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  FIRST_TOUCH_FALLBACK,
  FIRST_TOUCH_HOUSE_HACKING,
  FIRST_TOUCH_WOMENS_REI,
  buildNewLeadDraft,
  firstTouchTemplate,
  resolveFirstTouchMeetup,
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
assert.equal(FIRST_TOUCH_FALLBACK, "Hi {{first_name}}, this is Caitlyn Verdugo…");

assert.equal(resolveFirstTouchMeetup({ tagNames: ["Women's REI"] }), "womens_rei");
assert.equal(resolveFirstTouchMeetup({ eventbriteAccount: "womens_rei" }), "womens_rei");
assert.equal(resolveFirstTouchMeetup({ leadSource: "Women's Real Estate Investing — August" }), "womens_rei");
assert.equal(resolveFirstTouchMeetup({ lastEventName: "Women's REI Meetup" }), "womens_rei");

assert.equal(resolveFirstTouchMeetup({ tagNames: ["House Hacking"] }), "house_hacking");
assert.equal(resolveFirstTouchMeetup({ eventbriteAccount: "house_hacking" }), "house_hacking");
assert.equal(resolveFirstTouchMeetup({ leadSource: "House Hacking Site" }), "house_hacking");
assert.equal(resolveFirstTouchMeetup({ lastEventName: "Financing a House Hack" }), "house_hacking");

// Women's tag wins when the event name talks about house hacking.
assert.equal(
  resolveFirstTouchMeetup({
    tagNames: ["Women's REI", "House Hacking"],
    leadSource: "House hacking for women",
    eventbriteAccount: "house_hacking",
  }),
  "womens_rei",
);

assert.equal(resolveFirstTouchMeetup({ leadSource: "Instagram" }), "other");
assert.equal(resolveFirstTouchMeetup({ leadSource: "Eventbrite" }), "other");

const womensFilled = buildNewLeadDraft(leandra.first_name, "Women's REI Meetup");
assert.equal(
  womensFilled,
  "Hi Leandra, this is Caitlyn Verdugo, one of the organizers for the Women's Real Estate Meetup. Just wanted to introduce myself and welcome you to the group! Any questions I can answer for you? 🙂",
);
assert.equal(womensFilled.includes("{{first_name}}"), false);

const hhFilled = buildNewLeadDraft(leandra.first_name, "House Hacking Atlanta Meetup");
assert.equal(
  hhFilled,
  "Hi Leandra, this is Caitlyn Verdugo, the organizer of the House Hacking Atlanta Meetup. Just wanted to introduce myself and welcome you to the group! Any questions I can answer for you? 🙂",
);

assert.equal(buildNewLeadDraft(leandra.first_name, "Instagram"), "Hi Leandra, this is Caitlyn Verdugo…");
assert.equal(firstTouchTemplate({ leadSource: "Instagram" }), FIRST_TOUCH_FALLBACK);

assert.equal(shouldPrefillFirstTouchSms({ hasOutboundText: true, meetup: "womens_rei" }), false);
assert.equal(shouldPrefillFirstTouchSms({ hasOutboundText: false, meetup: "womens_rei", hasPriorOutreach: true }), true);
assert.equal(shouldPrefillFirstTouchSms({ hasOutboundText: false, meetup: "other", hasPriorOutreach: true }), false);
assert.equal(shouldPrefillFirstTouchSms({ hasOutboundText: false, meetup: "other", hasPriorOutreach: false }), true);

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
assert.ok(worklist.includes("draft="), "Text link uses ?draft= prefill");

const newLeads = read("lib/data/new-leads.ts");
assert.ok(newLeads.includes('.eq("spam", false)'), "new-lead queue stays spam-filtered");

const todayHome = read("components/dashboard/TodayHome.tsx");
const spotlightJsx = todayHome.indexOf("<NewUncontactedSpotlight");
const pipelineJsx = todayHome.indexOf("<TodayPipelineOverview");
assert.ok(spotlightJsx >= 0, "Today home mounts the New/uncontacted spotlight");
assert.ok(pipelineJsx > spotlightJsx, "spotlight sits above Pipeline Overview");

const queues = read("components/dashboard/TodayQueues.tsx");
assert.ok(queues.includes("data-today-home=\"new-uncontacted\""), "spotlight is a Today home landmark");
assert.ok(queues.includes("featured"), "New/uncontacted queue row has stronger chrome when N>0");

console.log("new-lead first-touch templates: ok");
