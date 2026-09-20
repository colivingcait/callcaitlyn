import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { campaignsTextHref, parseCampaignAudienceIds } from "./campaigns-handoff";
import { contactMatchesGender, inferContactGender } from "./contact-gender";
import {
  CONTACTS_V2_FILTER_KEYS,
  EVER_ATTENDED_EVENT,
  parseContactFilterParams,
  resolveRegisteredEventName,
} from "./contact-filter-params";
import { CONTACT_SOURCE_FILTERS, leadSourceMatches, sourceChipLabel } from "./contact-sources";
import { activeFilterTags, removeActiveFilter } from "./contact-active-filters";

const root = join(process.cwd());
function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

assert.equal(resolveRegisteredEventName(new URLSearchParams()), undefined, "default Contacts browse is not event-only");
assert.equal(parseContactFilterParams(new URLSearchParams()).registeredEventName, undefined);

assert.deepEqual(
  CONTACT_SOURCE_FILTERS.map((s) => s.label),
  ["Zillow", "Realtor.com", "Facebook", "Referral", "Event", "Open house", "Manual"],
);
assert.equal(leadSourceMatches("Zillow Premier Agent", "zillow"), true);
assert.equal(leadSourceMatches("Eventbrite", "event"), true);
assert.equal(leadSourceMatches("Open House Saturday", "open_house"), true);
assert.equal(leadSourceMatches("Open House Saturday", "event"), false);
assert.equal(sourceChipLabel("eventbrite"), "Event");
assert.equal(sourceChipLabel("Realtor.com"), "Realtor.com");

assert.equal(inferContactGender("Asianna"), "women");
assert.equal(inferContactGender("Leandra"), "women");
assert.equal(inferContactGender("Sarah"), "women");
assert.equal(inferContactGender("Tom"), "men");
assert.equal(inferContactGender("Xzzyq"), "unknown");
assert.equal(contactMatchesGender("Asianna", "women"), true);
assert.equal(contactMatchesGender("Tom", "women"), false);

const multi = parseContactFilterParams(new URLSearchParams("stage=a,b&gender=women&source=zillow&event=__any__&phone=1"));
assert.deepEqual(multi.stageIds, ["a", "b"]);
assert.equal(multi.gender, "women");
assert.equal(multi.leadSource, "zillow");
assert.equal(multi.eventName, EVER_ATTENDED_EVENT);
assert.equal(multi.hasPhone, true);
assert.ok(CONTACTS_V2_FILTER_KEYS.includes("gender"));

const chips = activeFilterTags(
  new URLSearchParams("source=zillow&gender=women&event=__any__"),
  [],
  [],
);
assert.ok(chips.some((c) => c.label === "Source: Zillow"));
assert.ok(chips.some((c) => c.label === "Gender: Women"));
assert.ok(chips.some((c) => c.label === "Ever attended"));
const removed = removeActiveFilter(new URLSearchParams("source=zillow&gender=women"), "gender");
assert.equal(removed.get("gender"), null);
assert.equal(removed.get("source"), "zillow");

assert.equal(campaignsTextHref(["a", "b"]), "/sequences?ids=a%2Cb");
assert.deepEqual(parseCampaignAudienceIds("a,b,a"), ["a", "b"]);

const page = read("app/(app)/contacts/page.tsx");
assert.ok(page.includes("leads from Zillow, referrals, events, and more"));
assert.ok(page.includes("ContactsWorkspace"));
assert.ok(page.includes("PeopleMobile"));
assert.equal(page.includes("onSend="), false);

const workspace = read("components/contacts/ContactsWorkspace.tsx");
assert.ok(workspace.includes("ContactsListTabs"));
assert.ok(workspace.includes('variant="panel"') || workspace.includes("variant=\"panel\""));
assert.equal(workspace.includes("max-w-lg"), false, "desktop Contacts is not a phone shell");
assert.ok(workspace.includes("SmartListBuilder"));
assert.equal(workspace.includes("RosterView"), false, "Contacts smart lists are not Events roster");

const tabs = read("components/contacts/ContactsListTabs.tsx");
assert.ok(tabs.includes("All contacts"));
assert.ok(tabs.includes("Save view as list"));
assert.ok(tabs.includes('variant?: "tabs" | "picker"') || tabs.includes("picker"));
assert.ok(tabs.includes("Smart lists"), "smart lists is a tab, not a replacement for Lists-as-tabs");
assert.ok(tabs.includes("staticLists"), "saved views stay in the tabs rail");

const sheet = read("components/contacts/ContactFiltersSheet.tsx");
assert.ok(sheet.includes("Ever attended"), "sheet ever attended");
assert.ok(sheet.includes("Specific event"), "sheet specific event");
assert.ok(sheet.includes("Has phone"), "sheet has phone");
assert.ok(sheet.includes("Women"), "sheet women");
assert.ok(sheet.includes("CONTACT_SOURCE_FILTERS"), "sheet uses canonical sources");
assert.ok(sheet.includes("Apply"), "sheet apply");
assert.ok(sheet.includes("Reset"), "sheet reset");
assert.equal(sheet.includes("Registered for: any event"), false, "v2 panel is not event-registration framed");

const filters = read("components/contacts/ContactFilters.tsx");
assert.ok(filters.includes("flex flex-wrap"), "filters wrap");
assert.equal(filters.includes("overflow-x-auto"), false, "no sideways chip scroll");
assert.ok(filters.includes("ActiveFilterTags"), "filters tags");

const tagsUi = read("components/contacts/ActiveFilterTags.tsx");
assert.ok(tagsUi.includes("flex flex-wrap"), "tags wrap");
assert.equal(tagsUi.includes("overflow-x-auto"), false, "tags no sideways scroll");

const list = read("components/contacts/ContactsList.tsx");
assert.ok(list.includes("sourceChipLabel"), "list source chip");
assert.ok(list.includes("campaignsTextHref"), "list campaigns href");
assert.ok(list.includes("Change stage") || read("components/contacts/ContactsBulkBar.tsx").includes("Change stage"), "change stage");
assert.ok(read("components/contacts/ContactsBulkBar.tsx").includes("Add to list"), "add to list");
assert.ok(read("components/contacts/ContactsBulkBar.tsx").includes("Add tags"), "add tags");
assert.ok(read("components/contacts/ContactsBulkBar.tsx").includes("Remove tags"), "remove tags");
assert.ok(read("components/contacts/ContactsBulkBar.tsx").includes("campaignsTextHref"), "bulk href");
assert.equal(list.includes("TextBlastModal"), false, "Contacts must not mount a duplicate Campaigns composer");

const bulk = read("components/contacts/ContactsBulkBar.tsx");
assert.ok(bulk.includes("router.push(campaignsTextHref"));
assert.equal(bulk.includes("createTextBlast"), false);
assert.equal(bulk.includes("sendTestText"), false);
assert.ok(bulk.indexOf(">\n          Text\n        </Pill>") < bulk.indexOf("Change stage"), "desktop bulk Text is first");
assert.ok(bulk.includes('variant?: "desktop" | "mobile"') || bulk.includes("variant?: \"desktop\" | \"mobile\""));
assert.ok(bulk.includes('mobile ? "Stage"') || bulk.includes("mobile ? \"Stage\""));
assert.ok(bulk.includes('mobile ? "List"') || bulk.includes("mobile ? \"List\""));
assert.ok(bulk.includes('mobile ? "Tags"') || bulk.includes("mobile ? \"Tags\""));

const campaigns = read("app/(app)/sequences/page.tsx");
assert.ok(campaigns.includes("preloadedIds"), "campaigns page accepts preloaded ids");
const newText = read("components/sequences/NewTextButton.tsx");
assert.ok(newText.includes("parseCampaignAudienceIds"), "campaigns texter reads preloaded ids");
assert.ok(newText.includes("contactIds: preloaded"), "preloaded ids become the audience");
assert.ok(newText.includes("TextBlastModal"), "existing Campaigns texter still owns compose");

const mobile = read("components/contacts/mobile/PeopleMobile.tsx");
assert.ok(mobile.includes("variant=\"picker\"") || mobile.includes('variant="picker"'));
assert.ok(mobile.includes("flex flex-wrap"));
assert.equal(mobile.includes("overflow-x-auto"), false);
assert.ok(mobile.includes("ContactsBulkBar"));
assert.ok(mobile.includes("leads from Zillow, referrals, events, and more"));
assert.ok(mobile.includes("Cancel"));
assert.ok(mobile.includes("selected"));
assert.ok(mobile.includes('variant="mobile"') || mobile.includes("variant=\"mobile\""));

const peopleList = read("components/contacts/mobile/PeopleList.tsx");
assert.ok(peopleList.includes("sourceChipLabel"));
assert.ok(peopleList.includes("function SelectRow"), "mobile select mode uses dedicated rows");
assert.ok(peopleList.includes("rounded-full"), "select checkbox is circular");
assert.ok(peopleList.includes("formatPhone"), "select rows show phone");
assert.equal(peopleList.includes("type=\"checkbox\""), false, "select mode is not square native checkboxes");

const nav = read("components/nav/nav-items.ts");
assert.equal(nav.includes('label: "Lists"'), false, "Lists is not a More item");
assert.ok(nav.includes('label: "Contacts"'));

const scopes = read("lib/crm/count-scopes.ts");
assert.equal(scopes.includes("registered for any event"), false, "count scope must not frame Contacts as event-only");
assert.ok(scopes.includes("Zillow, referrals, events, and more"));

console.log("contacts v2: ok");
