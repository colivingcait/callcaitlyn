import { Phone, MessageSquare, Mail } from "lucide-react";
import { cn } from "@/lib/utils";

function ActionLink({
  href,
  icon: Icon,
  label,
  disabled,
}: {
  href: string;
  icon: typeof Phone;
  label: string;
  disabled?: boolean;
}) {
  return (
    <a
      href={disabled ? undefined : href}
      aria-disabled={disabled}
      className={cn(
        "flex flex-1 flex-col items-center gap-1.5 rounded-xl border border-neutral-200 py-3 text-xs font-medium text-neutral-600",
        disabled ? "pointer-events-none opacity-40" : "active:bg-neutral-50",
      )}
    >
      <Icon size={19} />
      {label}
    </a>
  );
}

export function QuickActions({ phone, email }: { phone?: string | null; email?: string | null }) {
  return (
    <div className="flex gap-2">
      <ActionLink href={`tel:${phone}`} icon={Phone} label="Call" disabled={!phone} />
      <ActionLink href={`sms:${phone}`} icon={MessageSquare} label="Text" disabled={!phone} />
      <ActionLink href={`mailto:${email}`} icon={Mail} label="Email" disabled={!email} />
    </div>
  );
}
