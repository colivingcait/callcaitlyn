"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, X, type LucideIcon } from "lucide-react";

export function InsightCard({
  icon: Icon,
  title,
  subtitle,
  expandable = true,
  defaultOpen = false,
  onDismiss,
  action,
  muted = false,
  children,
}: {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  expandable?: boolean;
  defaultOpen?: boolean;
  onDismiss?: () => Promise<{ ok: boolean }>;
  action?: React.ReactNode;
  muted?: boolean;
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [dismissed, setDismissed] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleDismiss() {
    if (!onDismiss) return;
    setBusy(true);
    await onDismiss();
    setBusy(false);
    setDismissed(true);
  }

  if (dismissed) return null;

  return (
    <div className={`overflow-hidden rounded-2xl border border-[#ebe9e7] bg-white ${muted ? "opacity-60" : ""}`}>
      <div className="flex items-center gap-3 px-[18px] py-4">
        <Icon size={18} className="mt-0.5 shrink-0 text-neutral-500" />
        <button
          type="button"
          onClick={() => expandable && setOpen((v) => !v)}
          disabled={!expandable}
          className="min-w-0 flex-1 text-left"
        >
          <p className="text-[17px] font-semibold text-neutral-900">{title}</p>
          {subtitle && <p className="mt-0.5 text-[15px] text-neutral-600">{subtitle}</p>}
        </button>
        {action}
        {onDismiss && (
          <button
            type="button"
            onClick={handleDismiss}
            disabled={busy}
            className="shrink-0 rounded-[10px] border border-neutral-200 bg-white p-2 text-neutral-400 disabled:opacity-50"
          >
            <X size={14} />
          </button>
        )}
        {expandable && (
          <button type="button" onClick={() => setOpen((v) => !v)} className="shrink-0 text-neutral-400">
            {open ? <ChevronDown size={17} /> : <ChevronRight size={17} />}
          </button>
        )}
      </div>
      {expandable && open && <div className="border-t border-neutral-100">{children}</div>}
    </div>
  );
}
