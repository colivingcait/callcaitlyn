"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, Send, Eye } from "lucide-react";
import { createListingSend, sendTestListingText, sendTestListingEmail } from "@/app/(app)/listings/actions";
import { isWithinQuietHours, quietHoursEndLabel } from "@/lib/crm/text-blast-timing";
import { buildAgentTemplates } from "@/lib/listings/agent-templates";
import {
  clampRecentTextDays,
  DEFAULT_RECENT_TEXT_DAYS,
  listingTextBucket,
  neverOutboundTexted,
} from "@/lib/crm/listing-text-recency";
import {
  dedupeListingTextRecipients,
  isListingTextPhoneQueued,
  queuedListingTextPhoneKeys,
} from "@/lib/crm/listing-text-dedupe";
import { relativeTime } from "@/lib/format-time";
import type { ListingAgent } from "@/types/database";

type Channel = "email" | "text";
type Audience = "not_contacted" | "non_repliers" | "all";
type TextBucket = "fresh" | "recent";

export function AgentComposer({
  listingId,
  address,
  listPrice,
  zillowUrl,
  agents,
  lastOutboundAtByAgentId,
  queuedOnThisListing,
}: {
  listingId: string;
  address: string;
  listPrice: string | null;
  zillowUrl: string | null;
  agents: ListingAgent[];
  lastOutboundAtByAgentId?: Record<string, string>;
  queuedOnThisListing?: string[];
}) {
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
  const [recentDays, setRecentDays] = useState(DEFAULT_RECENT_TEXT_DAYS);
  const [textBucket, setTextBucket] = useState<TextBucket>("fresh");
  const [freshOpen, setFreshOpen] = useState(false);
  const [recentOpen, setRecentOpen] = useState(false);
  const [localQueued, setLocalQueued] = useState<string[]>([]);

  useEffect(() => {
    const saved = window.localStorage.getItem(channel === "text" ? "listingTestPhone" : "listingTestEmail");
    if (saved) setTestTarget(saved);
  }, [channel]);

  const lastOutbound = lastOutboundAtByAgentId ?? {};
  const queued = useMemo(() => new Set([...(queuedOnThisListing ?? []), ...localQueued]), [queuedOnThisListing, localQueued]);
  const queuedPhoneKeys = useMemo(() => queuedListingTextPhoneKeys(agents, queued), [agents, queued]);

  const eligible = agents.filter((a) => a.state !== "opted_out" && (channel === "email" ? !!a.email : !!a.phone));
  const audienceEligible = eligible.filter((a) => {
    if (audience === "not_contacted") return a.state === "not_contacted";
    if (audience === "non_repliers") return a.state === "emailed" || a.state === "texted";
    return true;
  });

  const sendable = audienceEligible.filter((a) => {
    if (queued.has(a.id)) return false;
    if (channel === "text" && isListingTextPhoneQueued(a.phone, queuedPhoneKeys)) return false;
    return true;
  });
  const uniqueSendable = channel === "text" ? dedupeListingTextRecipients(sendable) : sendable;
  const freshAgents = uniqueSendable.filter((a) => listingTextBucket(lastOutbound[a.id] ?? null, recentDays) === "fresh");
  const recentAgents = uniqueSendable.filter((a) => listingTextBucket(lastOutbound[a.id] ?? null, recentDays) === "recent");
  const neverTextedCount = freshAgents.filter((a) => neverOutboundTexted(lastOutbound[a.id] ?? null)).length;
  const earlierCount = freshAgents.length - neverTextedCount;
  const queuedCount = audienceEligible.length - sendable.length;

  const bucketAgents = textBucket === "fresh" ? freshAgents : recentAgents;
  const counts = {
    all: eligible.length,
    not_contacted: eligible.filter((a) => a.state === "not_contacted").length,
    non_repliers: eligible.filter((a) => a.state === "emailed" || a.state === "texted").length,
  };
  const audienceCount = channel === "text" ? bucketAgents.length : audienceEligible.length;
  const optedOutCount = agents.filter((a) => a.state === "opted_out").length;
  const noContactCount = agents.filter((a) => (channel === "email" ? !a.email : !a.phone)).length;

  const quietHours = channel === "text" && isWithinQuietHours();
  const daysLabel = recentDays === 1 ? "day" : "days";

  useEffect(() => {
    if (channel !== "text") return;
    if (textBucket === "fresh" && freshAgents.length === 0 && recentAgents.length > 0) setTextBucket("recent");
    if (textBucket === "recent" && recentAgents.length === 0 && freshAgents.length > 0) setTextBucket("fresh");
  }, [channel, textBucket, freshAgents.length, recentAgents.length]);

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
    const result = await createListingSend({
      listingId,
      channel,
      subject,
      message,
      audience,
      sendImmediately,
      listingAgentIds: channel === "text" ? bucketAgents.map((a) => a.id) : undefined,
    });
    setSending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    if (channel === "text") setLocalQueued((prev) => [...prev, ...bucketAgents.map((a) => a.id)]);
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

      <div className="mt-3 flex flex-wrap gap-1.5">
        {(["email", "text"] as Channel[]).map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => {
              setChannel(c);
              setConfirming(false);
            }}
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

      {channel === "text" && (
        <div className="mt-3 space-y-2.5 rounded-2xl border border-[#e8d5c9] bg-[#f7f1ea] p-3">
          <label className="flex flex-wrap items-center gap-2 text-sm text-neutral-700">
            Flag anyone I texted in the last
            <input
              type="number"
              min={1}
              max={90}
              value={recentDays}
              onChange={(e) => {
                setRecentDays(clampRecentTextDays(Number(e.target.value)));
                setConfirming(false);
              }}
              className="h-9 w-14 rounded-xl border border-[#e8d5c9] bg-white px-2 text-center text-sm font-semibold text-neutral-900"
            />
            {daysLabel}
          </label>
          <p className="text-xs leading-5 text-neutral-500">
            Across every listing, plus any outbound Quo text to the same number. Recent gets a different message — nothing sends until you confirm that group.
          </p>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setTextBucket("fresh");
                setConfirming(false);
              }}
              className={`rounded-xl border px-3 py-2.5 text-left ${textBucket === "fresh" ? "border-[#c45c26] bg-white shadow-sm" : "border-transparent bg-white/60"}`}
            >
              <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Fresh</p>
              <p className="mt-0.5 text-lg font-semibold text-neutral-900">{freshAgents.length}</p>
              <p className="text-[11px] leading-4 text-neutral-500">Not texted in last {recentDays} {daysLabel}</p>
            </button>
            <button
              type="button"
              onClick={() => {
                setTextBucket("recent");
                setConfirming(false);
              }}
              className={`rounded-xl border px-3 py-2.5 text-left ${textBucket === "recent" ? "border-[#c45c26] bg-[#fff6f1] shadow-sm" : "border-transparent bg-white/60"}`}
            >
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#c45c26]">Recent</p>
              <p className="mt-0.5 text-lg font-semibold text-neutral-900">{recentAgents.length}</p>
              <p className="text-[11px] leading-4 text-neutral-500">Texted in last {recentDays} {daysLabel}</p>
            </button>
          </div>

          {freshAgents.length > 0 && (
            <p className="text-[11px] text-neutral-500">
              Fresh includes {neverTextedCount} never texted
              {earlierCount > 0 ? ` · ${earlierCount} last texted earlier than ${recentDays} ${daysLabel}` : ""}
            </p>
          )}
          {queuedCount > 0 && <p className="text-[11px] text-amber-800">{queuedCount} already queued on this listing — left out of both.</p>}

          <RecipientList
            label={`Fresh · not texted in last ${recentDays} ${daysLabel}`}
            agents={freshAgents}
            lastOutbound={lastOutbound}
            open={freshOpen}
            onToggle={() => setFreshOpen((v) => !v)}
            empty="Nobody in this audience is Fresh for that window."
          />
          <RecipientList
            label={`Recent · texted in last ${recentDays} ${daysLabel}`}
            agents={recentAgents}
            lastOutbound={lastOutbound}
            open={recentOpen}
            onToggle={() => setRecentOpen((v) => !v)}
            empty="Nobody in this audience was texted in that window."
            recent
          />
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {buildAgentTemplates(address, listPrice, zillowUrl).map((t) => (
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
          {channel === "text"
            ? audienceCount === 0
              ? `No one in ${textBucket === "fresh" ? "Fresh" : "Recent"}`
              : `Continue with ${audienceCount} ${textBucket === "fresh" ? "Fresh" : "Recent"}`
            : "Continue"}
        </button>
      ) : (
        <div className="mt-3 rounded-2xl border border-[#fde68a] bg-[#fffbeb] p-4">
          <p className="text-[15px] font-semibold text-neutral-900">
            {channel === "text"
              ? `Send to ${audienceCount} ${textBucket === "fresh" ? "Fresh" : "Recent"} agent${audienceCount === 1 ? "" : "s"}?`
              : `Send to ${audienceCount} agent${audienceCount === 1 ? "" : "s"} now?`}
          </p>
          <p className="mt-1 text-sm leading-5 text-neutral-600">
            {channel === "text" ? (
              <>
                {textBucket === "fresh"
                  ? `Normal copy — not texted in the last ${recentDays} ${daysLabel}.`
                  : `Different copy — outbound text in the last ${recentDays} ${daysLabel}.`}{" "}
                {textBucket === "fresh" && recentAgents.length > 0
                  ? `${recentAgents.length} Recent ${recentAgents.length === 1 ? "person is" : "people are"} held back until you send them separately.`
                  : textBucket === "recent" && freshAgents.length > 0
                    ? `${freshAgents.length} Fresh ${freshAgents.length === 1 ? "person is" : "people are"} held back until you send them separately.`
                    : null}
              </>
            ) : (
              <>
                Everyone in this audience with an email on file, minus anyone opted out.
                {noContactCount > 0 ? ` ${noContactCount} have no email — reach those separately.` : ""}
              </>
            )}
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
      {sent !== null && <p className="mt-2 text-sm text-emerald-700">Queued for {sent} agent{sent === 1 ? "" : "s"}. Switch groups to send the other copy.</p>}
    </div>
  );
}

function RecipientList({
  label,
  agents,
  lastOutbound,
  open,
  onToggle,
  empty,
  recent,
}: {
  label: string;
  agents: ListingAgent[];
  lastOutbound: Record<string, string>;
  open: boolean;
  onToggle: () => void;
  empty: string;
  recent?: boolean;
}) {
  return (
    <div className={`rounded-xl border ${recent ? "border-[#e8d5c9] bg-[#fff6f1]" : "border-[#ebe9e7] bg-white"}`}>
      <button type="button" onClick={onToggle} className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left">
        <span className="text-xs font-semibold text-neutral-800">
          {label} <span className="font-medium text-neutral-500">({agents.length})</span>
        </span>
        {open ? <ChevronUp size={14} className="text-neutral-400" /> : <ChevronDown size={14} className="text-neutral-400" />}
      </button>
      {open && (
        <div className="max-h-48 space-y-1 overflow-y-auto border-t border-[#ebe9e7] px-3 py-2">
          {agents.length === 0 ? (
            <p className="text-xs text-neutral-400">{empty}</p>
          ) : (
            agents.map((a) => {
              const at = lastOutbound[a.id];
              return (
                <div key={a.id} className="flex items-baseline justify-between gap-2">
                  <p className="truncate text-sm text-neutral-800">{a.name}</p>
                  <p className="shrink-0 text-[11px] text-neutral-400">{at ? relativeTime(at) : "never"}</p>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
