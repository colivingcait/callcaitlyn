"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, ListTodo } from "lucide-react";
import { BottomSheet } from "@/components/mobile/BottomSheet";
import { QuickAddMenu } from "@/components/nav/QuickAddMenu";
import { SignOutButton } from "@/components/nav/SignOutButton";
import { moreNavGroupsForSheet, type NavCounts } from "@/components/nav/nav-items";
import { countFor as countForCounts } from "@/lib/nav/countFor";

// Only destinations that are not already a bottom-tab. Primaries are
// filtered in moreNavGroupsForSheet so Today/Contacts/Messages/Pipeline
// cannot leak back in if someone concatenates NAV_GROUPS by mistake.
export function MoreSheet({ open, onClose, userEmail, counts }: { open: boolean; onClose: () => void; userEmail?: string | null; counts: NavCounts }) {
  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const countFor = countForCounts(counts);
  const groups = moreNavGroupsForSheet();

  return (
    <>
      <BottomSheet open={open} onClose={onClose} title="More">
        <div className="pb-4">
          {userEmail && <p className="mb-2 truncate text-[14px] text-neutral-400">{userEmail}</p>}
          <p className="mb-3 text-[14px] leading-5 text-neutral-500">
            Tabs are <span className="font-semibold text-neutral-800">Today</span>,{" "}
            <span className="font-semibold text-neutral-800">Contacts</span>,{" "}
            <span className="font-semibold text-neutral-800">Messages</span>,{" "}
            <span className="font-semibold text-neutral-800">Pipeline</span>. Everything else is here —
            including Commissions and Settings.
          </p>
          <button
            type="button"
            onClick={() => setNewTaskOpen(true)}
            className="mb-2 flex min-h-[50px] w-full items-center gap-3 rounded-[12px] border border-neutral-200 px-3 py-2 text-left active:bg-neutral-50"
          >
            <ListTodo size={21} className="shrink-0 text-neutral-500" />
            <span className="flex-1 text-[17px] font-medium text-neutral-900">New task</span>
            <ChevronRight size={18} className="shrink-0 text-neutral-300" />
          </button>
          {groups.map((group) => (
            <div key={group.label} className="border-t border-neutral-100 py-1">
              <p className="px-1 pb-1 pt-2 text-[13px] font-semibold uppercase tracking-[.05em] text-neutral-400">{group.label}</p>
              {group.items.map(({ href, label, icon: Icon, hint }) => {
                const count = countFor[href];
                return (
                  <Link key={href} href={href} onClick={onClose} className="flex min-h-[50px] items-center gap-3 px-1 py-2 active:bg-neutral-50">
                    <Icon size={21} className="shrink-0 text-neutral-500" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[17px] font-medium text-neutral-900">{label}</span>
                      {hint && <span className="block text-[13px] text-neutral-400">{hint}</span>}
                    </span>
                    {count && (
                      <span className={count.waiting ? "text-[15px] font-semibold text-brand-600" : "text-[15px] text-neutral-400"}>{count.value}</span>
                    )}
                    <ChevronRight size={18} className="shrink-0 text-neutral-300" />
                  </Link>
                );
              })}
            </div>
          ))}
          <div className="border-t border-neutral-100 pt-3">
            <SignOutButton className="rounded-xl border border-neutral-200 bg-white px-4 py-2.5 font-semibold" />
          </div>
        </div>
      </BottomSheet>
      {newTaskOpen && (
        <QuickAddMenu
          initialMode="task"
          onClose={() => {
            setNewTaskOpen(false);
            onClose();
          }}
        />
      )}
    </>
  );
}
