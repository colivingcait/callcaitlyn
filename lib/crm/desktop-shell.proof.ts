import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// Guardrails for the desktop-shell fix. PR #3 left Today at md:max-w-lg
// (a phone column on a desktop monitor) and swipe rows capturing pointer
// on pointerdown (killing contact-open clicks). Run with:
//   npx tsx lib/crm/desktop-shell.proof.ts

const root = join(process.cwd());

function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

const todayScreen = read("components/dashboard/TodayScreen.tsx");
assert.equal(todayScreen.includes("max-w-lg"), false, "Today must not be a phone column (max-w-lg)");
assert.ok(todayScreen.includes("lg:hidden"), "Today keeps a phone layout below lg");
assert.ok(todayScreen.includes("TodayDesktop"), "Today mounts a real desktop layout");

const todayDesktop = read("components/dashboard/TodayDesktop.tsx");
assert.ok(todayDesktop.includes("max-w-[1400px]"), "Desktop Today uses a wide max width, not a phone column");
assert.ok(todayDesktop.includes("TodayHome"), "Desktop Today uses the mockup home, not a phone column of queues");
assert.equal(todayDesktop.includes("max-w-lg"), false);

const todayHome = read("components/dashboard/TodayHome.tsx");
assert.ok(todayHome.includes("TodayPipelineOverview"), "Today home mounts the pipeline overview");
assert.ok(todayHome.includes("NewUncontactedSpotlight"), "Today home promotes New/uncontacted above the chrome");
assert.ok(todayHome.includes("My Tasks"), "Today home has My Tasks quick link");
assert.ok(todayHome.includes("Upcoming Events"), "Today home has Upcoming Events");
assert.ok(todayHome.includes("TODAY_GRID") || todayHome.includes("grid-cols-12"), "Desktop home is a wide grid, not a stacked phone");
assert.ok(todayHome.includes("col-span-6"), "Pipeline and Events share equal columns");
assert.equal(todayHome.includes("col-span-7"), false, "Do not use the old 7/5 split");
assert.ok(todayHome.includes('data-today-home="spotlight"'), "Leave a slot for PR #9 First-touch spotlight");
assert.ok(todayHome.includes("newSpotlight"), "Spotlight slot is a named node PR #9 can fill");

const wideBlock = todayHome.slice(todayHome.indexOf("if (wide)"));
const spotlightIdx = wideBlock.indexOf('data-today-home="spotlight"');
const pipelineIdx = wideBlock.indexOf("TodayPipelineOverview");
const eventsIdx = wideBlock.indexOf("<UpcomingEvents");
const queuesIdx = wideBlock.indexOf("{queues}");
assert.ok(spotlightIdx > 0 && spotlightIdx < pipelineIdx, "Spotlight sits under the greeting, above Pipeline");
assert.ok(pipelineIdx > 0 && eventsIdx > pipelineIdx && queuesIdx > eventsIdx, "Do-next queues render after Pipeline/Events");

const todayQueues = read("components/dashboard/TodayQueues.tsx");
assert.ok(todayQueues.includes("grid-cols-3"), "Do-next chips share a 3-col grid on desktop");
assert.ok(todayQueues.includes("gap-6"), "Do-next uses the shared 24px gutter");
assert.equal(todayQueues.includes("gap-8"), false, "Do not use a second gutter size on Today queues");
assert.ok(todayQueues.includes("afterDoNext"), "Tasks/Messages slot in under Do-next, not beside Pipeline");

const todayLayout = read("components/dashboard/today-home-layout.ts");
assert.ok(todayLayout.includes("grid-cols-12"), "Shared Today grid is 12 columns");
assert.ok(todayLayout.includes("gap-6"), "Shared Today gutter is 24px");

const pipelineOverview = read("components/dashboard/TodayPipelineOverview.tsx");
assert.ok(pipelineOverview.includes("Pipeline Overview"), "Pipeline card uses the mockup title");

const layout = read("app/(app)/layout.tsx");
assert.ok(layout.includes("lg:h-dvh"), "App shell uses the 1024px lg breakpoint");
assert.ok(layout.includes("hidden lg:block"), "Quick add is desktop-only at lg");

const sidebar = read("components/nav/Sidebar.tsx");
assert.ok(sidebar.includes("lg:flex"), "Sidebar appears at lg (1024px), not md");
assert.equal(sidebar.includes("md:flex"), false);

const bottomNav = read("components/nav/BottomNav.tsx");
assert.ok(bottomNav.includes("lg:hidden"), "Bottom 5-tab nav stays on phone/tablet");

const swipe = read("lib/hooks/useSwipeRow.ts");
assert.ok(swipe.includes("onPointerDown"), "swipe still has pointerdown");
const pointerDown = swipe.slice(swipe.indexOf("function onPointerDown"), swipe.indexOf("function onPointerMove"));
assert.equal(pointerDown.includes("setPointerCapture"), false, "must not capture pointer on tap/pointerdown");
assert.ok(swipe.includes("onClickCapture"), "horizontal swipes must not steal the click");

const contactRow = read("components/contacts/ContactRow.tsx");
assert.ok(contactRow.includes("data-contact-open={contact.id}"), "desktop rows expose an open-contact control");
assert.ok(contactRow.includes('href={`/contacts/${contact.id}`}'), "desktop rows link to /contacts/:id");

const peopleList = read("components/contacts/mobile/PeopleList.tsx");
assert.ok(peopleList.includes('href={`/contacts/${contact.id}`}'), "mobile rows link to /contacts/:id");

const contactsPage = read("app/(app)/contacts/page.tsx");
assert.ok(contactsPage.includes("lg:block"), "desktop contacts list shows at lg");
assert.ok(contactsPage.includes("PeopleMobile"), "mobile contacts list still mounts");
assert.ok(contactsPage.includes("Suspense"), "PeopleMobile (useSearchParams) is wrapped in Suspense");

console.log("desktop shell + contacts open: ok");
