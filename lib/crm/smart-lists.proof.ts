import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseContactFilterParams } from "./contact-filter-params";
import { campaignsTextHref } from "./campaigns-handoff";
import {
  applyRulesToSearchParams,
  buildSmartListTextNextLeads,
  contactsMatchSmartRules,
  defaultSmartListRules,
  encodeTagOrListValue,
  isSmartList,
  lastTouchIsOlderThan,
  membershipIdsFromFilters,
  partitionLists,
  parseTagOrListValue,
  requiredIdsForLists,
  rulesFromSearchParams,
  SMART_LIST_FOLLOWUP_TEMPLATE,
  smartListFiltersToStore,
  smartListSearchParamsFromFilters,
} from "./smart-lists";

const root = join(process.cwd());
function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

assert.equal(lastTouchIsOlderThan(null, 14, new Date("2026-09-20T12:00:00.000Z")), true, "never touched is older");
assert.equal(lastTouchIsOlderThan("2026-09-01T12:00:00.000Z", 14, new Date("2026-09-20T12:00:00.000Z")), true);
assert.equal(lastTouchIsOlderThan("2026-09-18T12:00:00.000Z", 14, new Date("2026-09-20T12:00:00.000Z")), false);
assert.equal(lastTouchIsOlderThan("2026-09-01T12:00:00.000Z", 0), false);

assert.deepEqual(parseTagOrListValue("tag:abc"), { kind: "tag", id: "abc" });
assert.deepEqual(parseTagOrListValue("list:xyz"), { kind: "list", id: "xyz" });
assert.equal(parseTagOrListValue("abc"), null);
assert.equal(encodeTagOrListValue("tag", "abc"), "tag:abc");

assert.equal(isSmartList({ id: "1", name: "Hot women", filters: { kind: "smart", stage: "hot" } }), true);
assert.equal(isSmartList({ id: "2", name: "All buyers", filters: { stage: "a" } }), false);
assert.deepEqual(
  partitionLists([
    { id: "1", name: "Smart", filters: { kind: "smart" } },
    { id: "2", name: "Static", filters: { ids: "a,b" } },
  ]).smartLists.map((s) => s.id),
  ["1"],
);

assert.deepEqual(membershipIdsFromFilters({ ids: "a,b,a" }), ["a", "b"]);
assert.deepEqual(
  requiredIdsForLists(
    [
      { id: "list-1", name: "Meetup", filters: { ids: "c1,c2" } },
      { id: "list-2", name: "Empty", filters: { stage: "hot" } },
    ],
    ["list-1", "list-2"],
  ),
  ["c1", "c2"],
);

const now = new Date("2026-09-20T12:00:00.000Z");
const hot = "stage-hot";
const meetup = "tag-meetup";
const contacts = [
  {
    id: "sarah",
    stage_id: hot,
    contact_tags: [{ tags: { id: meetup } }],
  },
  {
    id: "fresh",
    stage_id: hot,
    contact_tags: [{ tags: { id: meetup } }],
  },
  {
    id: "wrong-stage",
    stage_id: "nurture",
    contact_tags: [{ tags: { id: meetup } }],
  },
  {
    id: "no-tag",
    stage_id: hot,
    contact_tags: [],
  },
];
const matched = contactsMatchSmartRules(
  contacts,
  [
    { id: "1", field: "stage", value: hot },
    { id: "2", field: "tag_or_list", value: encodeTagOrListValue("tag", meetup) },
    { id: "3", field: "last_touch", value: "14" },
  ],
  new Map([
    ["sarah", "2026-08-01T12:00:00.000Z"],
    ["fresh", "2026-09-18T12:00:00.000Z"],
    ["wrong-stage", "2026-08-01T12:00:00.000Z"],
    ["no-tag", "2026-08-01T12:00:00.000Z"],
  ]),
  new Map(),
  now,
);
assert.deepEqual(
  matched.map((c) => c.id),
  ["sarah"],
  "AND of stage + tag + last touch older than 14 days",
);

const listMatched = contactsMatchSmartRules(
  contacts,
  [{ id: "1", field: "tag_or_list", value: encodeTagOrListValue("list", "static-1") }],
  new Map(),
  new Map([["static-1", ["no-tag"]]]),
  now,
);
assert.deepEqual(listMatched.map((c) => c.id), ["no-tag"]);

const defaults = defaultSmartListRules();
assert.equal(defaults.length, 3);
assert.deepEqual(
  defaults.map((r) => r.field),
  ["stage", "tag_or_list", "last_touch"],
);

const fromUrl = rulesFromSearchParams(new URLSearchParams("stage=hot&tags=meetup&lastTouch=14&inList="));
assert.equal(fromUrl[0].value, "hot");
assert.equal(fromUrl[1].value, "tag:meetup");
assert.equal(fromUrl[2].value, "14");

const applied = applyRulesToSearchParams(new URLSearchParams("source=zillow"), [
  { id: "1", field: "stage", value: "hot" },
  { id: "2", field: "tag_or_list", value: "list:abc" },
  { id: "3", field: "last_touch", value: "14" },
]);
assert.equal(applied.get("view"), "smart");
assert.equal(applied.get("stage"), "hot");
assert.equal(applied.get("inList"), "abc");
assert.equal(applied.get("lastTouch"), "14");
assert.equal(applied.get("source"), "zillow");
assert.equal(applied.get("tags"), null);

const stored = smartListFiltersToStore(applied);
assert.equal(stored.kind, "smart");
assert.equal(stored.view, undefined);
assert.equal(stored.lastTouch, "14");

const restored = smartListSearchParamsFromFilters(stored);
assert.equal(restored.get("view"), "smart");
assert.equal(restored.get("lastTouch"), "14");
assert.equal(restored.get("kind"), null);

const parsed = parseContactFilterParams(new URLSearchParams("lastTouch=14&inList=abc,def"));
assert.equal(parsed.lastTouchOlderThanDays, 14);
assert.deepEqual(parsed.inListIds, ["abc", "def"]);
assert.equal(parseContactFilterParams(new URLSearchParams("lastTouch=0")).lastTouchOlderThanDays, undefined);

const leads = buildSmartListTextNextLeads([
  { id: "a", first_name: "Caitlyn", last_name: "Cole", phone: "5551234567", lead_source: "Event", lead_date: null },
  { id: "b", first_name: "No", last_name: "Phone", phone: "", lead_source: null, lead_date: null },
]);
assert.equal(leads.length, 1);
assert.equal(leads[0].id, "a");
assert.ok(leads[0].draft.includes("Caitlyn"));
assert.ok(SMART_LIST_FOLLOWUP_TEMPLATE.includes("{{first_name}}"));

assert.equal(campaignsTextHref(["a", "b"]), "/sequences?ids=a%2Cb");

const tabs = read("components/contacts/ContactsListTabs.tsx");
assert.ok(tabs.includes("All contacts"));
assert.ok(tabs.includes("Save view as list"));
assert.ok(tabs.includes("Smart lists"));
assert.ok(tabs.includes("isSmartList") || tabs.includes("partitionLists"));

const workspace = read("components/contacts/ContactsWorkspace.tsx");
assert.ok(workspace.includes("ContactsListTabs"));
assert.ok(workspace.includes("SmartListBuilder"));
assert.ok(workspace.includes("SmartListsRail"));
assert.equal(workspace.includes("Attendance"), false, "no Events roster UI on Contacts smart lists");

const builder = read("components/contacts/SmartListBuilder.tsx");
assert.ok(builder.includes("Match count"));
assert.ok(builder.includes("Save"));
assert.ok(builder.includes("Text & Next") || builder.includes("Text &amp; Next"));
assert.ok(builder.includes("Add to campaign"));
assert.ok(builder.includes("campaignsTextHref"));
assert.equal(builder.includes("Checked in"), false);
assert.equal(builder.includes("event_followup"), false);

const rail = read("components/contacts/SmartListsRail.tsx");
assert.ok(rail.includes("Static lists"));
assert.ok(rail.includes("Smart lists"));
assert.ok(rail.includes("Zap") || rail.includes("lightning"));

const textNext = read("components/contacts/SmartListTextNext.tsx");
assert.ok(textNext.includes("sendTextToContact"));
assert.ok(textNext.includes("Next"));
assert.equal(textNext.includes("event_followup"), false);
assert.equal(textNext.includes("RosterView"), false);

const list = read("components/contacts/ContactsList.tsx");
assert.ok(list.includes("Last touch"));
assert.ok(list.includes("Source"));
assert.ok(list.includes("campaignsTextHref"));
assert.equal(list.includes("Attendance"), false);

const page = read("app/(app)/contacts/page.tsx");
assert.ok(page.includes("Smart List Builder") || page.includes("isSmartList"));
assert.ok(page.includes("leads from Zillow, referrals, events, and more"));

const bulk = read("components/contacts/BulkAddToListModal.tsx");
assert.ok(bulk.includes("isSmartList") || bulk.includes("partitionLists") || read("components/contacts/ContactsBulkBar.tsx").includes("staticLists"));

const data = read("lib/data/contacts.ts");
assert.ok(data.includes("lastTouchIsOlderThan"));
assert.ok(data.includes("membershipIdsFromFilters"));
assert.ok(data.includes("getLastTouchAts"));

const mobile = read("components/contacts/mobile/PeopleMobile.tsx");
assert.ok(mobile.includes("SmartListBuilder") || mobile.includes("view=smart") || read("components/contacts/ContactsListTabs.tsx").includes("Smart lists"));

console.log("smart lists: ok");
