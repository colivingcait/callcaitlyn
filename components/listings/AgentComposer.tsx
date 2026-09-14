"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Send, Eye } from "lucide-react";
import { createListingSend, sendTestListingText, sendTestListingEmail } from "@/app/(app)/listings/actions";
import { isWithinQuietHours, quietHoursEndLabel } from "@/lib/crm/text-blast-timing";
import type { ListingAgent } from "@/types/database";

type Channel = "email" | "text";
type Audience = "not_contacted" | "non_repliers" | "all";

function templates(address: string, price: string | null) {
  const priceLine = price ? `${price}, ` : "";
  return [
    {
      label: "Just listed",
      subject: `New listing: ${address}`,
      body: `Hi {{agent_first_name}} — your buyer showed up on reverse prospecting for my new listing at ${address} (${priceLine}now on the market). Happy to open it up if your buyer wants a look.`,
    },
    {
      label: "Price improvement",
      subject: `Price improvement: ${address}`,
      body: `Hi {{agent_first_name}} — wanted to flag a price improvement on ${address}${priceLine ? `, now ${priceLine}` : ""}. Let me know if your buyer wants another look.`,
    },
    {
      label: "Open house",
      subject: `Open house: ${address}`,
      body: `Hi {{agent_first_name}} — I'm holding an open house at ${address} this weekend. Let me know if your buyer would like a personal showing instead.`,
    },
  ];
}

export function AgentComposer({ listingId, address, listPrice, agents }: { listingId: string; address: string; listPrice: string | null; agents: ListingAgent[] }) {
  const router = useRouter();
  const [channel, setChannel] = useState<Channel>("email");
  const [audience, setAudience] = useState<Audience>("not_contacted");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [testTarget, setTestTarget] = useState("");
  const [sendingTest, setSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [sendImmediately, setSendImmediately] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState<number | null>(null);

  useEffect(() => {
    const saved = window.localStorage.getItem(channel === "text" ? "listingTestPhone" : "listingTestEmail");
    if (saved) setTestTarget(saved);
  }, [channel]);

  const eligible = agents.filter((a) => a.state !== "opted_out" && (channel === "email" ? !!a.email : !!a.phone));
  const counts = {
    all: eligible.length,
    not_contacted: eligible.filter((a) => a.state === "not_contacted").length,
    non_repliers: eligible.filter((a) => a.state === "emailed" || a.state === "texted").length,
  };
  const audienceCount = counts[audience];
  const optedOutCount = agents.filter((a) => a.state === "opted_out").length;
  const noContactCount = agents.filter((a) => (channel === "email" ? !a.email : !a.phone)).length;

  const quietHours = channel === "text" && isWithinQuietHours();

  function applyTemplate(t: { subject: string; body: string }) {
    setSubject(t.subject);
    setMessage(t.body);
  }

  async function runTest() {
    setSendingTest(true);
    setTestResult(null);
    window.localStorage.setItem(channel === "text" ? "listingTestPhone" : "listingTestEmail", testTarget);
    const result = channel === "text" ? await sendTestListingText(message, testTarget) : await sendTestListingEmail(subject, message, testTarget);
    setSendingTest(false);
    setTestResult(result.ok ? "Test sent." : result.error);
  }

  async function confirmSend() {
    setSending(true);
    setError("");
    const result = await createListingSend({ listingId, channel, subject, message, audience, sendImmediately });
    setSending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSent(result.recipientCount);
    setConfirming(false);
    setMessage("");
    setSubject("");
    router.refresh();
  }

  return (
    <div className="rounded-2xl border border-[#ebe9e7] bg-white p-[18px]">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-neutral-900">Tell them about it</h2>
        <span className="text-sm text-neutral-500">{counts.not_contacted} not yet contacted</span>
      </div>

      <div className="mt-3 flex gap-1.5">
        {(["email", "text"] as Channel[]).map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setChannel(c)}
            className={`h-9 rounded-xl px-3.5 text-sm font-semibold ${channel === c ? "bg-neutral-900 text-white" : "border border-neutral-200 text-neutral-700"}`}
          >
            {c === "email" ? "Email" : "Text"}
          </button>
        ))}
        <select value={audience} onChange={(e) => setAudience(e.target.value as Audience)} className="h-9 rounded-xl border border-neutral-200 px-2.5 text-sm text-neutral-700">
          <option value="not_contacted">Not contacted ({counts.not_contacted})</option>
          <option value="non_repliers">Non-repliers ({counts.non_repliers})</option>
          <option value="all">Everyone eligible ({counts.all})</option>
        </select>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {templates(address, listPrice).map((t) => (
          <button key={t.label} type="button" onClick={() => applyTemplate(t)} className="rounded-xl border border-neutral-200 bg-white px-3 py-1.5 text-sm font-medium text-neutral-800">
            {t.label}
          </button>
        ))}
      </div>

      {channel === "email" && (
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Subject"
          className="mt-2.5 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm"
        />
      )}
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={4}
        placeholder="Write the message — {{agent_first_name}} greets by name"
        className="mt-2.5 w-full rounded-xl border border-neutral-200 p-3 text-[15px] leading-6"
      />

      {showPreview && (
        <div className="mt-2.5 rounded-xl border border-neutral-200 bg-neutral-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Preview (sample agent)</p>
          {channel === "email" && subject && <p className="mt-1 text-sm font-semibold text-neutral-900">{subject.replace(/\{\{\s*agent_first_name\s*\}\}/gi, "Jamie")}</p>}
          <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-800">{message.replace(/\{\{\s*agent_first_name\s*\}\}/gi, "Jamie") || "Nothing written yet."}</p>
        </div>
      )}

      <div className="mt-2.5 flex flex-wrap items-center gap-3.5 border-t border-neutral-100 pt-3">
        <button type="button" onClick={() => setShowPreview((v) => !v)} className="flex items-center gap-1.5 text-xs font-medium text-neutral-500">
          <Eye size={13} /> {showPreview ? "Hide preview" : "Preview"} {channel === "email" ? "email" : "text"}
        </button>
        <div className="flex items-center gap-1.5">
          <input
            value={testTarget}
            onChange={(e) => setTestTarget(e.target.value)}
            placeholder={channel === "text" ? "Your phone" : "Your email"}
            className="h-8 w-40 rounded-lg border border-neutral-200 px-2 text-xs"
          />
          <button
            type="button"
            onClick={runTest}
            disabled={sendingTest || !message.trim() || !testTarget.trim()}
            className="flex items-center gap-1.5 text-xs font-medium text-neutral-500 disabled:opacity-50"
          >
            <Send size={13} /> {sendingTest ? "Sending…" : "Send test to myself"}
          </button>
        </div>
        {testResult && <span className="text-xs text-neutral-500">{testResult}</span>}
      </div>

      {quietHours && !sendImmediately && (
        <p className="mt-2 text-xs text-amber-700">
          It&apos;s before {quietHoursEndLabel()} Eastern — a text send holds until then unless you send now anyway.
        </p>
      )}

      {!confirming ? (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          disabled={!message.trim() || audienceCount === 0 || (channel === "email" && !subject.trim())}
          className="mt-3 w-full rounded-xl bg-neutral-900 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          Continue
        </button>
      ) : (
        <div className="mt-3 rounded-2xl border border-[#fde68a] bg-[#fffbeb] p-4">
          <p className="text-[15px] font-semibold text-neutral-900">Send to {audienceCount} agent{audienceCount === 1 ? "" : "s"} now?</p>
          <p className="mt-1 text-sm leading-5 text-neutral-600">
            Everyone in this audience with {channel === "email" ? "an email" : "a phone number"} on file, minus anyone opted out.
            {noContactCount > 0 ? ` ${noContactCount} have no ${channel === "email" ? "email" : "phone"} — reach those separately.` : ""}
            {optedOutCount > 0 ? ` ${optedOutCount} opted out and are excluded.` : ""}
            {channel === "email" ? " An unsubscribe link goes on every one." : ""}
          </p>
          {quietHours && (
            <label className="mt-2 flex items-center gap-2 text-sm text-neutral-700">
              <input type="checkbox" checked={sendImmediately} onChange={(e) => setSendImmediately(e.target.checked)} className="h-4 w-4 rounded border-neutral-300 accent-brand-600" />
              Send now anyway (skip the {quietHoursEndLabel()} hold)
            </label>
          )}
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={confirmSend} disabled={sending} className="flex items-center gap-1.5 rounded-[10px] bg-neutral-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
              <Send size={14} /> {sending ? "Sending…" : `Send to ${audienceCount}`}
            </button>
            <button type="button" onClick={() => setConfirming(false)} disabled={sending} className="rounded-[10px] border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-700">
              Cancel
            </button>
          </div>
        </div>
      )}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      {sent !== null && <p className="mt-2 text-sm text-emerald-700">Queued for {sent} agent{sent === 1 ? "" : "s"}.</p>}
    </div>
  );
}
