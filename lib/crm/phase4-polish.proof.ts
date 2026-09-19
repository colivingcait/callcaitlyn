import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { displayFullName, displayPersonName, firstNameFromEmail, firstNameFromProfile } from "../utils";
import { correctPadsplitSpelling, listingFieldCopy, publicListingCopy } from "../listings/public-copy";

// Tess Phase 4 polish: greeting, PadSplit typo, chip wrap, name casing,
// Campaigns vs sequences, booking-request label. Run with:
//   npx tsx lib/crm/phase4-polish.proof.ts

const root = process.cwd();
function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

assert.equal(firstNameFromEmail("cv.sellshomes@gmail.com"), "");
assert.equal(firstNameFromEmail("caitlyn@kw.com"), "Caitlyn");
assert.equal(firstNameFromEmail("caitlyn.verdugo@gmail.com"), "Caitlyn");
assert.equal(
  firstNameFromProfile({ email: "cv.sellshomes@gmail.com", user_metadata: { full_name: "Caitlyn Verdugo" } }),
  "Caitlyn",
);
assert.equal(
  firstNameFromProfile({ email: "cv.sellshomes@gmail.com", user_metadata: { given_name: "caitlyn" } }),
  "Caitlyn",
);
assert.equal(firstNameFromProfile({ email: "cv.sellshomes@gmail.com" }), "");
assert.equal(firstNameFromProfile({ email: "cv.sellshomes@gmail.com", user_metadata: { name: "Caitlyn Verdugo" } }), "Caitlyn");

const todayPage = read("app/(app)/page.tsx");
assert.ok(todayPage.includes("firstNameFromProfile(user)"), "Today greeting reads the auth profile, not email initials");
assert.equal(todayPage.includes("firstNameFromEmail(user?.email)"), false);

assert.equal(correctPadsplitSpelling("Padpslit"), "PadSplit");
assert.equal(correctPadsplitSpelling("padpslit coliving"), "PadSplit coliving");
assert.equal(listingFieldCopy("Padpslit"), "PadSplit");
assert.equal(listingFieldCopy("Test address"), "Test address");
assert.equal(publicListingCopy("Padpslit"), "PadSplit");

const listingsIndex = read("app/(app)/listings/page.tsx");
assert.ok(listingsIndex.includes("listingFieldCopy(l.property_type)"), "Listings list corrects Padpslit on the row");
const listingDetail = read("app/(app)/listings/[id]/page.tsx");
assert.ok(listingDetail.includes("listingFieldCopy(listing.property_type)"));

assert.equal(displayPersonName("barbara guillory"), "Barbara Guillory");
assert.equal(displayPersonName("BARBARA GUILLORY"), "Barbara Guillory");
assert.equal(displayPersonName("Barbara Guillory"), "Barbara Guillory");
assert.equal(displayPersonName("McDonald"), "McDonald");
assert.equal(displayFullName({ first_name: "barbara", last_name: "guillory" }), "Barbara Guillory");

const recruitCard = read("components/recruiting/RecruitCard.tsx");
assert.ok(recruitCard.includes("displayFullName(contact)"), "Recruiting cards title-case display names");
assert.equal(recruitCard.includes("{fullName(contact)}"), false);

const peopleMobile = read("components/contacts/mobile/PeopleMobile.tsx");
assert.ok(peopleMobile.includes("flex flex-wrap"), "Contacts chips wrap instead of clipping");
assert.equal(peopleMobile.includes("overflow-x-auto"), false);

const contactFilters = read("components/contacts/ContactFilters.tsx");
assert.ok(contactFilters.includes("flex flex-wrap"));
assert.equal(contactFilters.includes("overflow-x-auto"), false);
assert.equal(contactFilters.includes("bg-gradient-to-l"), false, "Fade overlay must not clip the last chip");

const inboxMobile = read("components/messages/mobile/InboxMobile.tsx");
assert.ok(inboxMobile.includes("flex flex-wrap"));
assert.ok(inboxMobile.includes("Spam {spamConversations.length}"));
assert.equal(inboxMobile.includes("overflow-x-auto px-4 pb-3"), false);

const messageFilters = read("components/messages/MessageFilters.tsx");
assert.ok(messageFilters.includes("flex flex-wrap"));
assert.equal(messageFilters.includes("ml-auto"), false, "Spam chip must not be pushed off-screen");
assert.equal(messageFilters.includes("overflow-x-auto"), false);

const stageChips = read("components/contacts/mobile/StageJumpChips.tsx");
assert.ok(stageChips.includes("flex flex-wrap"));
assert.equal(stageChips.includes("overflow-x-auto"), false);

const nav = read("components/nav/nav-items.ts");
assert.ok(nav.includes('label: "Campaigns"'));
assert.ok(nav.includes('hint: "Email and text campaigns"'));
assert.equal(nav.includes('hint: "Email and text sequences"'), false);
assert.ok(nav.includes('label: "Booking requests"'));
assert.equal(nav.includes('label: "Bookings"'), false);

const campaignsPage = read("app/(app)/sequences/page.tsx");
assert.ok(campaignsPage.includes(">Campaigns</h1>"));
assert.ok(campaignsPage.includes("Scheduled campaigns"));
assert.equal(campaignsPage.includes("Scheduled sequences"), false);

const campaignsDash = read("components/sequences/SequencesDashboard.tsx");
assert.ok(campaignsDash.includes("Active campaigns"));
assert.equal(campaignsDash.includes("Active sequences"), false);

const scheduling = read("app/(app)/scheduling/page.tsx");
assert.ok(scheduling.includes(">Booking requests</h1>"));
assert.equal(scheduling.includes(">Bookings</h1>"), false);

console.log("phase4 polish: ok");
