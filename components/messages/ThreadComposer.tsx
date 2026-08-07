"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { sendTextToContact } from "@/app/(app)/contacts/actions";
import { Send } from "lucide-react";

export function ThreadComposer({ contactId, phone }: { contactId: string; phone: string | null }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  if (!phone) {
    return (
      <div className="sticky bottom-16 border-t border-neutral-200 bg-white px-4 py-3 text-center text-xs text-neutral-400 md:bottom-0">
        This contact has no phone number on file.
      </div>
    );
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setSending(true);
    setError("");

    const result = await sendTextToContact(contactId, phone as string, body.trim());

    if (!result.ok) {
      setError(result.error);
      setSending(false);
      return;
    }

    setBody("");
    setSending(false);
    router.refresh();
  }

  return (
    <div className="sticky bottom-16 border-t border-neutral-200 bg-white/95 px-3 py-2.5 backdrop-blur md:bottom-0">
      <form onSubmit={handleSend} className="flex items-end gap-2">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Text message"
          rows={1}
          className="max-h-28 flex-1 resize-none rounded-full border border-neutral-200 bg-neutral-50 px-4 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
        />
        <button
          type="submit"
          disabled={sending || !body.trim()}
          aria-label="Send"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white disabled:opacity-40"
        >
          <Send size={16} />
        </button>
      </form>
      {error && <p className="mt-1 px-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
