import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { gmailSendErrorMessage } from "./send-email";

// Maps Gmail failures to the strings the composer and cron already display.
// Does not call Gmail. Run with:
//   npx tsx lib/google/send-email.proof.ts

const root = process.cwd();
function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

const reconnect = "Gmail connection expired. Reconnect in Settings.";
const timeout = "Gmail took too long to respond. Try again.";

assert.equal(gmailSendErrorMessage(new Error("invalid_grant")), reconnect);
assert.equal(
  gmailSendErrorMessage({
    message: "invalid_grant",
    response: { data: { error: "invalid_grant", error_description: "Token has been expired or revoked." } },
  }),
  reconnect,
);
assert.equal(gmailSendErrorMessage(new Error("Token has been expired or revoked.")), reconnect);

const timeoutCause = new Error("The operation was aborted due to timeout");
timeoutCause.name = "TimeoutError";
assert.equal(gmailSendErrorMessage(Object.assign(new Error(timeoutCause.message), { code: "TimeoutError", cause: timeoutCause })), timeout);
assert.equal(gmailSendErrorMessage(Object.assign(new Error("socket hang up"), { code: "ETIMEDOUT" })), timeout);

assert.equal(gmailSendErrorMessage(new Error("Invalid To header")), "Invalid To header");
assert.equal(gmailSendErrorMessage("nope"), "nope");
assert.equal(gmailSendErrorMessage(null), "Gmail send failed");

const sendEmail = read("lib/google/send-email.ts");
const sendStart = sendEmail.indexOf("export async function sendGmailMessage");
assert.ok(sendStart > 0);
const sendFn = sendEmail.slice(sendStart);
const tryAt = sendFn.indexOf("try {");
const clientAt = sendFn.indexOf("getAuthorizedGoogleClient");
assert.ok(tryAt > 0 && clientAt > tryAt, "token refresh runs inside the send try");
assert.match(sendFn, /timeout:\s*GMAIL_SEND_TIMEOUT_MS/);
assert.match(sendFn, /retry:\s*false/);

const composer = read("components/listings/AgentComposer.tsx");
const runTest = composer.slice(composer.indexOf("async function runTest"), composer.indexOf("async function confirmSend"));
const confirmSend = composer.slice(composer.indexOf("async function confirmSend"), composer.indexOf("return ("));
for (const fn of [runTest, confirmSend]) {
  assert.match(fn, /try \{/);
  assert.match(fn, /catch \(e\)/);
  assert.match(fn, /finally \{/);
}
assert.match(runTest, /setSendingTest\(false\)/);
assert.match(confirmSend, /setSending\(false\)/);
assert.doesNotMatch(runTest, /setSendingTest\(false\);\s*setTestResult/);

const cron = read("lib/crm/listing-sends.ts");
assert.match(cron, /status: "failed"/);
assert.match(cron, /catch \(err\)/);
assert.match(cron, /SENDS_PER_RUN = 8/);

console.log("send-email.proof: ok");
