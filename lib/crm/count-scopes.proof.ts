import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { COUNT_SCOPE, COUNT_SCOPE_DISAGREE, COUNT_SCOPE_LABEL } from "./count-scopes";

assert.ok(COUNT_SCOPE.contacts.includes("filters"));
assert.ok(COUNT_SCOPE.pipeline.includes("active stages"));
assert.ok(COUNT_SCOPE.reports.includes("non-archived"));
assert.ok(COUNT_SCOPE_DISAGREE.includes("not supposed to match"));
assert.equal(COUNT_SCOPE_LABEL.contacts, "Contacts list");
assert.equal(COUNT_SCOPE_LABEL.pipeline, "Pipeline active stages");
assert.equal(COUNT_SCOPE_LABEL.reports, "Reports · all non-archived");

const root = join(process.cwd());
function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

const contacts = read("app/(app)/contacts/page.tsx");
assert.ok(contacts.includes('current="contacts"'), "Contacts desktop mounts the contacts scope note");
assert.ok(contacts.includes("CountScopeNote"), "Contacts uses CountScopeNote, not a one-off sentence");
assert.equal(contacts.includes("onSend="), false);

const peopleMobile = read("components/contacts/mobile/PeopleMobile.tsx");
assert.ok(peopleMobile.includes('current="contacts"'), "Contacts phone header mounts the same scope note");

const pipeline = read("app/(app)/pipeline/page.tsx");
assert.ok(pipeline.includes('current="pipeline"'), "Pipeline mounts the pipeline scope note");
assert.ok(pipeline.includes("CountScopeNote"));

const reports = read("app/(app)/reports/page.tsx");
assert.ok(reports.includes('current="reports"'), "Reports mounts the reports scope note");
assert.ok(reports.includes("CountScopeNote"));

const leadSource = read("components/reports/LeadSourceReport.tsx");
assert.ok(leadSource.includes("COUNT_SCOPE.reports"), "lead-source tile cites the reports scope");
assert.equal(leadSource.includes("Total contacts"), false, "do not label the reports total as everyone");

const stages = read("components/reports/StageDistributionReport.tsx");
assert.ok(stages.includes("non-archived") && stages.includes("all stages"), "stage chart is not labeled active");

const mix = read("components/reports/ContactMixReport.tsx");
assert.ok(mix.includes("non-archived"), "contact mix is not labeled as the Contacts list");

const note = read("components/CountScopeNote.tsx");
assert.ok(note.includes("COUNT_SCOPE_DISAGREE"), "the note states the three totals must not match");
assert.equal(note.includes("onSend="), false, "no Server→Client function props");

const todayPipeline = read("components/dashboard/TodayPipelineOverview.tsx");
assert.ok(todayPipeline.includes("not the Contacts list"), "Today donut is not labeled as a unified people total");
assert.equal(todayPipeline.includes(">Total<"), false);

console.log("count scopes: ok");
