"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { sendTextToContact, sendEmailToContact } from "@/app/(app)/contacts/actions";
import { buildQuoteMessage } from "@/lib/crm/quote-message";
import { Button, Textarea } from "@/components/ui";

export function SendPanel({
  contactId,
  phone,
  email,
  firstName,
  propertyAddress,
  monthlyOutOfPocket,
  link,
}: {
  contactId: string | null;
  phone: string | null;
  email: string | null;
  firstName: string;
  propertyAddress: string;
  monthlyOutOfPocket: number;
  link: string;
}) {
  const template = buildQuoteMessage({ firstName: firstName || "there", monthlyOutOfPocket, propertyAddress, link });

  const [smsBody, setSmsBody] = useState(template.smsBody);
  const [emailBody, setEmailBody] = useState(template.emailBody);
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState<"text" | "email" | null>(null);
  const [sent, setSent] = useState<{ text?: boolean; email?: boolean }>({});
  const [error, setError] = useState("");

  async function copyLink() {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleSendText() {
    if (!contactId || !phone) return;
    setSending("text");
    setError("");
    const result = await sendTextToContact(contactId, phone, smsBody);
    setSending(null);
    if (result.ok) setSent((s) => ({ ...s, text: true }));
    else setError(result.error ?? "Couldn't send that text.");
  }

  async function handleSendEmail() {
    if (!contactId || !email) return;
    setSending("email");
    setError("");
    const result = await sendEmailToContact(contactId, email, template.emailSubject, emailBody);
    setSending(null);
    if (result.ok) setSent((s) => ({ ...s, email: true }));
    else setError(result.error ?? "Couldn't send that email.");
  }

  function openPdf() {
    window.open(`${link}?print=1`, "_blank");
  }

  return (
    <div className="mt-3.5 rounded-2xl border border-neutral-200 bg-white p-5">
      <p className="text-base font-semibold text-neutral-900">Send it{firstName ? ` to ${firstName}` : ""}</p>

      <div className="mt-3 flex items-center gap-2 rounded-xl border border-neutral-200 px-3.5 py-2.5">
        <span className="min-w-0 flex-1 truncate text-sm text-neutral-600">{link}</span>
        <Button variant="secondary" size="sm" onClick={copyLink} className="shrink-0">
          {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? "Copied" : "Copy"}
        </Button>
      </div>

      <div className="mt-3">
        <p className="mb-1.5 text-sm text-neutral-500">Text</p>
        <Textarea rows={3} value={smsBody} onChange={(e) => setSmsBody(e.target.value)} disabled={sent.text} />
      </div>
      <div className="mt-3">
        <p className="mb-1.5 text-sm text-neutral-500">Email</p>
        <Textarea rows={4} value={emailBody} onChange={(e) => setEmailBody(e.target.value)} disabled={sent.email} />
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <div className="mt-3.5 flex flex-wrap items-center gap-2.5">
        <Button onClick={handleSendText} disabled={!contactId || !phone || sending !== null || sent.text}>
          {sent.text ? "Sent" : sending === "text" ? "Sending…" : "Send as a text"}
        </Button>
        <Button variant="secondary" onClick={handleSendEmail} disabled={!contactId || !email || sending !== null || sent.email}>
          {sent.email ? "Sent" : sending === "email" ? "Sending…" : "Email it"}
        </Button>
        <Button variant="secondary" onClick={openPdf}>
          Save a PDF
        </Button>
      </div>
      {!contactId && <p className="mt-2 text-sm text-neutral-400">Not attached to a contact - text/email are off, but the link and PDF both work.</p>}
      <p className="mt-3 text-sm leading-5 text-neutral-500">
        The link opens a clean one-pager with your name on it. You get told when it&apos;s opened — and again if it&apos;s opened twice.
      </p>
    </div>
  );
}
