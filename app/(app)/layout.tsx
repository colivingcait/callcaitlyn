import Link from "next/link";
import { Settings, DollarSign } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/nav/Sidebar";
import { BottomNav } from "@/components/nav/BottomNav";
import { QuickAddButton } from "@/components/nav/QuickAddButton";
import { SignOutButton } from "@/components/nav/SignOutButton";
import { listConversations } from "@/lib/data/messages";
import { listNewRegistrationsQueue } from "@/lib/data/dialer";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ count: contactsCount }, conversations, { contacts: newLeads }] = await Promise.all([
    supabase.from("contacts").select("id", { count: "exact", head: true }).eq("archived", false),
    listConversations(),
    listNewRegistrationsQueue(),
  ]);
  const waitingOnReply = conversations.filter((c) => c.lastActivity.type === "text" && c.lastActivity.direction === "inbound").length;
  const navCounts = { contacts: contactsCount ?? 0, dialer: newLeads.length, messages: waitingOnReply };

  return (
    <div className="flex min-h-dvh">
      <Sidebar userEmail={user?.email} counts={navCounts} />
      <div className="flex min-h-dvh min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-neutral-200 bg-white px-4 py-3 md:hidden">
          <h1 className="font-serif text-lg font-semibold text-neutral-900">CallCaitlyn</h1>
          <div className="flex items-center gap-4">
            <Link href="/commissions" aria-label="Commissions" className="text-neutral-500">
              <DollarSign size={20} />
            </Link>
            <Link href="/settings" aria-label="Settings" className="text-neutral-500">
              <Settings size={20} />
            </Link>
            <SignOutButton />
          </div>
        </header>
        <main className="flex-1 bg-neutral-50/60 pb-28 md:pb-8">{children}</main>
      </div>
      <QuickAddButton />
      <BottomNav />
    </div>
  );
}
