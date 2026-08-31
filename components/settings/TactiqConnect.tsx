"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { Copy, Check, Radio } from "lucide-react";

// No OAuth here (Tactiq has no CRM-facing account to connect) - "connected"
// just means TACTIQ_WEBHOOK_SECRET is set, which is what makes this URL
// live. webhookUrl is built server-side (Settings page) from that env var,
// same trust boundary as the rest of this owner-only Settings page.
export function TactiqConnect({ webhookUrl }: { webhookUrl: string | null }) {
  const [copied, setCopied] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"ok" | "error" | null>(null);

  async function copyUrl() {
    if (!webhookUrl) return;
    await navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // Sends a meeting_id with no transcript - the route's own early-return
  // for a transcript-less event means this round-trips the secret check
  // without ever creating a meeting_transcripts row.
  async function testIt() {
    if (!webhookUrl) return;
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meeting_id: `settings-test-${Date.now()}` }),
      });
      setTestResult(res.ok ? "ok" : "error");
    } catch {
      setTestResult("error");
    }
    setTesting(false);
  }

  if (!webhookUrl) {
    return <p className="text-sm text-amber-700">Add TACTIQ_WEBHOOK_SECRET to Vercel and redeploy to turn this on.</p>;
  }

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2 rounded-xl border border-neutral-200 px-3.5 py-2.5">
        <span className="min-w-0 flex-1 truncate text-sm text-neutral-600">{webhookUrl}</span>
        <Button variant="secondary" size="sm" onClick={copyUrl} className="shrink-0">
          {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <p className="text-xs text-neutral-500">
        Paste this as the URL in your Make.com scenario&apos;s HTTP &ldquo;Make a request&rdquo; module (POST, body type JSON), then map
        Tactiq&apos;s fields into these keys in the request body: <code className="text-[11px]">meeting_id</code>, <code className="text-[11px]">title</code>,{" "}
        <code className="text-[11px]">transcript</code>, <code className="text-[11px]">occurred_at</code>,{" "}
        <code className="text-[11px]">duration_seconds</code>, <code className="text-[11px]">calendar_event_id</code> (if Tactiq exposes it),
        and <code className="text-[11px]">participants</code> as a list of <code className="text-[11px]">{"{name, email}"}</code>.
      </p>
      <div className="flex items-center gap-2">
        <Button variant="secondary" size="sm" onClick={testIt} disabled={testing}>
          <Radio size={14} /> {testing ? "Testing…" : "Test it"}
        </Button>
        {testResult === "ok" && <span className="text-sm font-medium text-emerald-700">Reachable — the secret checks out.</span>}
        {testResult === "error" && <span className="text-sm font-medium text-red-600">Couldn&apos;t reach it — double check the URL.</span>}
      </div>
      <p className="text-xs text-neutral-500">
        Tactiq only records while your laptop&apos;s open with it running — it won&apos;t catch a meeting from your phone. And the other
        person on the call isn&apos;t automatically told it&apos;s recording, so that&apos;s on you to mention.
      </p>
    </div>
  );
}
