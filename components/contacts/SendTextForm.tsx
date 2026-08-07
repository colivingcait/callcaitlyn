"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { sendTextToContact } from "@/app/(app)/contacts/actions";
import { Button, Textarea, Card } from "@/components/ui";
import { Send } from "lucide-react";

export function SendTextForm({ contactId, phone }: { contactId: string; phone: string | null }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  if (!phone) return null;

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
    <Card className="space-y-2">
      <form onSubmit={handleSend} className="flex items-end gap-2">
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Send a text via Quo…"
          rows={2}
          className="flex-1"
        />
        <Button type="submit" size="md" disabled={sending || !body.trim()}>
          <Send size={16} />
        </Button>
      </form>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </Card>
  );
}
