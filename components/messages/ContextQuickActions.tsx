"use client";

import { Mail, MessageSquare, Phone } from "lucide-react";
import { useRouter } from "next/navigation";
import { openQuoCall } from "@/lib/quo/call-link";
import { cn } from "@/lib/utils";

const item =
  "flex min-w-0 flex-1 flex-col items-center gap-1 rounded-[12px] border border-[#eadfd6] bg-[#fffbf8] py-2.5 text-[11px] font-semibold text-neutral-700 disabled:opacity-40";

export function ContextQuickActions({
  contactId,
  phone,
  email,
}: {
  contactId: string;
  phone: string | null;
  email: string | null;
}) {
  const router = useRouter();

  return (
    <div className="grid grid-cols-3 gap-1.5">
      <button type="button" onClick={() => phone && openQuoCall(phone)} disabled={!phone} className={item}>
        <Phone size={16} />
        Call
      </button>
      <button type="button" onClick={() => phone && router.push(`/messages/${contactId}`)} disabled={!phone} className={item}>
        <MessageSquare size={16} />
        Text
      </button>
      <a
        href={email ? `mailto:${email}` : undefined}
        aria-disabled={!email}
        className={cn(item, !email && "pointer-events-none opacity-40")}
      >
        <Mail size={16} />
        Email
      </a>
    </div>
  );
}
