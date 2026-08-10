"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui";
import { Mail, Check } from "lucide-react";

const ERROR_MESSAGES: Record<string, string> = {
  access_denied: "You cancelled the Google sign-in.",
  state_mismatch: "That connection attempt expired — try again.",
  no_refresh_token:
    "Google didn't grant lasting access. Go to myaccount.google.com/permissions, remove CallCaitlyn CRM, then try connecting again.",
  exchange_failed: "Something went wrong connecting to Google — try again, or tell me the error and I'll dig in.",
};

export function GmailConnect({
  connectedEmail,
  errorCode,
}: {
  connectedEmail: string | null;
  errorCode?: string;
}) {
  const router = useRouter();
  const [disconnecting, setDisconnecting] = useState(false);

  async function handleDisconnect() {
    setDisconnecting(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) await supabase.from("gmail_accounts").delete().eq("owner_id", user.id);
    setDisconnecting(false);
    router.refresh();
  }

  return (
    <div className="space-y-2">
      {connectedEmail ? (
        <div className="flex items-center justify-between gap-3">
          <p className="flex min-w-0 items-center gap-1.5 text-sm text-emerald-700">
            <Check size={15} className="shrink-0" /> <span className="truncate">Connected as {connectedEmail}</span>
          </p>
          <Button variant="secondary" size="sm" className="shrink-0" onClick={handleDisconnect} disabled={disconnecting}>
            {disconnecting ? "Disconnecting…" : "Disconnect"}
          </Button>
        </div>
      ) : (
        <a href="/api/auth/gmail/connect">
          <Button variant="secondary" size="sm">
            <Mail size={14} /> Connect Gmail
          </Button>
        </a>
      )}
      {errorCode && <p className="text-xs text-red-600">{ERROR_MESSAGES[errorCode] ?? `Connection error: ${errorCode}`}</p>}
    </div>
  );
}
