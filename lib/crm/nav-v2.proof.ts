import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { bookingCardName, bookingWindowLabel } from "./today-v1";
import { EVER_ATTENDED_EVENT, mergeIncludeIds, parseIncludeIds } from "./contact-filter-params";
import { attendedContactIds, isEverAttendedFilter } from "./contact-filter-predicates";

const root = join(process.cwd());
function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

const nav = read("components/nav/nav-items.ts");
const primaryBlock = nav.slice(nav.indexOf("export const PRIMARY_NAV_ITEMS"), nav.indexOf("export const MORE_NAV_ITEMS"));
const moreBlock = nav.slice(nav.indexOf("export const MORE_NAV_ITEMS"), nav.indexOf("export const MOBILE_MORE_ITEMS"));
const mobileMoreBlock = nav.slice(nav.indexOf("export const MOBILE_MORE_ITEMS"), nav.indexOf("export const NAV_GROUPS"));
for (const label of ["Today", "Contacts", "Messages", "Pipeline", "Events"]) {
  assert.ok(primaryBlock.includes(`label: "${label}"`), `primary includes ${label}`);
}
for (const label of ["Campaigns", "Bookings", "Listings", "Commissions", "Reports", "Settings"]) {
  assert.ok(moreBlock.includes(`label: "${label}"`), `more includes ${label}`);
  assert.equal(primaryBlock.includes(`label: "${label}"`), false, `${label} is not a desktop primary`);
}
assert.ok(mobileMoreBlock.includes('label: "Events"'), "mobile More includes Events");
assert.ok(nav.includes('kind: "more", label: "More"'));
assert.equal(moreBlock.includes('href: "/events"'), false, "desktop More does not list Events");
assert.equal(nav.includes('label: "Lists"'), false);
assert.equal(nav.includes("Also today"), false);
assert.equal(nav.includes("Money & tools"), false);
assert.equal(nav.includes('label: "Lists"'), false);

const sidebar = read("components/nav/Sidebar.tsx");
assert.ok(sidebar.includes("moreNavItemsForSidebar"));
assert.equal(sidebar.includes("moreGroups.map"), false);
assert.equal(sidebar.includes("Also today"), false);

const moreSheet = read("components/nav/MoreSheet.tsx");
assert.ok(moreSheet.includes("moreNavItemsForSheet"));
assert.equal(moreSheet.includes("Also today"), false);
assert.equal(moreSheet.includes("New task"), false);

const todayHome = read("components/dashboard/TodayHome.tsx");
assert.ok(todayHome.includes("TodayBookingRequestCard"));
assert.ok(todayHome.includes("bookingRequests"));
assert.ok(todayHome.includes("Needs you") || todayHome.includes("needs-you"));
assert.equal(todayHome.includes("onAdvance="), false);

const bookingCard = read("components/dashboard/TodayBookingRequestCard.tsx");
assert.ok(bookingCard.includes('"use client"'));
assert.ok(bookingCard.includes("approveBooking"));
assert.ok(bookingCard.includes("ProposeNewTimeModal"));
assert.ok(bookingCard.includes("threadHref"));
assert.ok(bookingCard.includes("Approve"));
assert.ok(bookingCard.includes("Propose time"));
assert.ok(bookingCard.includes("Message"));
assert.ok(bookingCard.includes("requested a call"));
assert.equal(bookingCard.includes("onApprove="), false);

const scheduling = read("app/(app)/scheduling/page.tsx");
assert.ok(scheduling.includes(">Bookings</h1>"));
assert.ok(scheduling.includes("Today → Needs you") || scheduling.includes("Needs you"));

const actions = read("app/(app)/scheduling/actions.ts");
assert.ok(actions.includes('revalidatePath("/")'));

assert.equal(bookingWindowLabel("2026-09-22T18:00:00.000Z", "2026-09-22T18:30:00.000Z"), "Tue 2:00–2:30 PM");
assert.equal(bookingCardName(null, "Jordan Blake"), "Jordan Blake");

const contactsPage = read("app/(app)/contacts/page.tsx");
assert.ok(contactsPage.includes("ContactsListTabs") || contactsPage.includes("ContactsWorkspace"));
assert.ok(contactsPage.includes("Save view as list") || read("components/contacts/ContactsListTabs.tsx").includes("Save view as list"));
assert.equal(contactsPage.includes("onSend="), false);
assert.equal(contactsPage.includes("SegmentBar"), false);

const tabs = read("components/contacts/ContactsListTabs.tsx");
assert.ok(tabs.includes("All contacts"));
assert.ok(tabs.includes("Save view as list"));
assert.ok(tabs.includes('"use client"'));

const workspace = read("components/contacts/ContactsWorkspace.tsx");
assert.ok(workspace.includes("ContactsListTabs"));
assert.ok(workspace.includes("variant=\"panel\"") || workspace.includes('variant="panel"'));
assert.ok(workspace.includes("Add to list") || read("components/contacts/ContactsBulkBar.tsx").includes("Add to list"));

const list = read("components/contacts/ContactsList.tsx");
const bulk = read("components/contacts/ContactsBulkBar.tsx");
assert.ok(bulk.includes("Change stage"));
assert.ok(bulk.includes("Add to list"));
assert.ok(bulk.includes("Add tags"));
assert.ok(bulk.includes("Remove tags"));
assert.equal(list.includes("TextBlastModal"), false, "bulk Text must not rebuild the Campaigns composer");
assert.ok(list.includes("campaignsTextHref") || bulk.includes("campaignsTextHref"));
assert.ok(list.includes("Source"));
assert.ok(list.includes("Last touch"));
assert.ok(list.includes("hasUsablePhone"));
assert.ok(list.includes("Text the {withPhone.length} with numbers"));

const mobile = read("components/contacts/mobile/PeopleMobile.tsx");
assert.ok(mobile.includes("ContactsListTabs"));
assert.ok(mobile.includes("flex flex-wrap"));
assert.equal(mobile.includes("overflow-x-auto"), false);

assert.equal(isEverAttendedFilter(EVER_ATTENDED_EVENT), true);
const attended = attendedContactIds(
  EVER_ATTENDED_EVENT,
  [
    { id: "a", last_event_name: "House hacking workshop" },
    { id: "b", last_event_name: null },
  ],
  [{ contactId: "c", eventName: "Women's meetup", source: "jotform" }],
);
assert.equal(attended.has("a"), true);
assert.equal(attended.has("b"), false);
assert.equal(attended.has("c"), true);
assert.deepEqual(parseIncludeIds("a,b"), ["a", "b"]);
assert.equal(mergeIncludeIds("a", ["b", "a"]), "a,b");

console.log("nav v2 + today booking queue + lists-in-contacts: ok");
