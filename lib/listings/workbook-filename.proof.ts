import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  contentDispositionAttachment,
  createWorkbookDownloadToken,
  slugWorkbookName,
  verifyWorkbookDownloadToken,
  workbookDownloadFilename,
  workbookDownloadPath,
  workbookStoragePath,
} from "./workbook-filename";

assert.equal(slugWorkbookName("Gresham Park Eight"), "Gresham-Park-Eight-Workbook.xlsx");
assert.equal(slugWorkbookName("Candace"), "Candace-Workbook.xlsx");
assert.equal(
  workbookDownloadFilename({ nickname: "Gresham Park Eight", storedName: "buyer_workbook-1710000000000-abc12.xlsx" }),
  "Gresham-Park-Eight-Workbook.xlsx",
);
assert.equal(
  workbookDownloadFilename({ nickname: "Candace", storedName: "Candace_OM_Complete.xlsx" }),
  "Candace_OM_Complete.xlsx",
);
assert.equal(
  workbookDownloadFilename({
    storagePath: "listing-id/buyer_workbook-1710000000000-Gresham_Park.xlsx",
  }),
  "Gresham_Park.xlsx",
);
assert.equal(workbookStoragePath("listing-id", "Gresham-Park-Eight-Workbook.xlsx"), "listing-id/Gresham-Park-Eight-Workbook.xlsx");
assert.ok(contentDispositionAttachment("Gresham-Park-Eight-Workbook.xlsx").includes("filename=\"Gresham-Park-Eight-Workbook.xlsx\""));

const exp = Date.now() + 60_000;
const token = createWorkbookDownloadToken("candace", exp);
assert.equal(verifyWorkbookDownloadToken("candace", token), true);
assert.equal(verifyWorkbookDownloadToken("other", token), false);
assert.equal(verifyWorkbookDownloadToken("candace", createWorkbookDownloadToken("candace", Date.now() - 1000)), false);
assert.match(workbookDownloadPath("gresham-park-eight"), /^\/listing\/gresham-park-eight\/workbook\?t=/);

const unlock = readFileSync(join(process.cwd(), "app/listing/[slug]/actions.ts"), "utf8");
assert.ok(unlock.includes("workbookDownloadPath"));
assert.equal(unlock.includes("sendGmailMessage"), false);
assert.equal(unlock.includes("createSignedUrl"), false);

const route = readFileSync(join(process.cwd(), "app/listing/[slug]/workbook/route.ts"), "utf8");
assert.ok(route.includes("Content-Disposition"));
assert.ok(route.includes("workbookDownloadFilename"));
assert.equal(route.includes("Vera"), false);

console.log("workbook filename: ok");
