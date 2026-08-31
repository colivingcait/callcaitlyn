"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { recordManualConsent, markOptedOut, clearOptOut } from "@/app/(app)/contacts/consent-actions";
import { formatLocal, relativeTime } from "@/lib/format-time";
import { Input, Button } from "@/components/ui";

export function ConsentStatus({
  contactId,
  consentSource,
  consentAt,
  optedOutAt,
}: {
  contactId: string;
  consentSource: string | null;
  consentAt: string | null;
  optedOutAt: string | null;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleRecord() {
    if (!reason.trim()) return;
    setBusy(true);
    await recordManualConsent(contactId, reason.trim());
    setBusy(false);
    setEditing(false);
    setReason("");
    router.refresh();
  }

  async function handleOptOut() {
    setBusy(true);
    await markOptedOut(contactId);
    setBusy(false);
    router.refresh();
  }

  async function handleClear() {
    setBusy(true);
    await clearOptOut(contactId);
    setBusy(false);
    router.refresh();
  }

  if (editing) {
    return (
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Input
          autoFocus
          placeholder="How did you get permission to text/email them?"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="max-w-xs"
        />
        <Button size="sm" onClick={handleRecord} disabled={busy || !reason.trim()}>
          {busy ? "Saving…" : "Save"}
        </Button>
        <Button size="sm" variant="secondary" onClick={() => setEditing(false)} disabled={busy}>
          Cancel
        </Button>
      </div>
    );
  }

  if (optedOutAt) {
    return (
      <p className="text-sm text-red-700">
        Opted out {relativeTime(optedOutAt)}.{" "}
        <button type="button" onClick={handleClear} disabled={busy} className="font-semibold underline disabled:opacity-50">
          Clear (they confirmed renewed permission)
        </button>
      </p>
    );
  }

  if (consentAt) {
    return (
      <p className="text-sm text-neutral-500">
        Consent: {consentSource} · {formatLocal(consentAt, "MMM d, yyyy")}{" "}
        <button type="button" onClick={handleOptOut} disabled={busy} className="ml-1 text-neutral-400 underline disabled:opacity-50">
          Mark opted out
        </button>
      </p>
    );
  }

  return (
    <p className="text-sm text-neutral-400">
      No consent on file.{" "}
      <button type="button" onClick={() => setEditing(true)} className="font-semibold text-brand-600 underline">
        Record it
      </button>
    </p>
  );
}
