import Link from "next/link";
import { redirect } from "next/navigation";
import { Settings, DollarSign } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/nav/Sidebar";
import { BottomNav } from "@/components/nav/BottomNav";
import { QuickAddButton } from "@/components/nav/QuickAddButton";
import { LogPill } from "@/components/nav/LogPill";
import { SignOutButton } from "@/components/nav/SignOutButton";
import { listConversations } from "@/lib/data/messages";
import { listEventFollowupQueue, listConfirmationQueue } from "@/lib/data/dialer";
import { getUnmatchedNotesCount } from "@/lib/data/notes-inbox";
import { getSuggestionQueue } from "@/lib/data/insights";
import { getUnansweredAgentMessageCount } from "@/lib/data/listings";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ count: contactsCount }, conversations, { contacts: followups }, { items: confirmations }, unmatchedNotes, suggestionQueue, unansweredAgents] =
    await Promise.all([
      supabase.from("contacts").select("id", { count: "exact", head: true }).eq("archived", false).eq("spam", false),
      listConversations(),
      listEventFollowupQueue(),
      listConfirmationQueue(),
      getUnmatchedNotesCount(),
      getSuggestionQueue(),
      getUnansweredAgentMessageCount(),
    ]);
  const waitingOnReply = conversations.filter((c) => c.owed).length;
  const navCounts = {
    contacts: contactsCount ?? 0,
    // New leads now live on Today, not the Dialer - this badge reflects
    // what's actually left to do in the Dialer itself (post-event
    // follow-ups + pre-event confirmations).
    dialer: followups.length + confirmations.length,
    messages: waitingOnReply,
    notes: unmatchedNotes,
    insights: suggestionQueue.count,
    listings: unansweredAgents,
  };

  return (
    // md:h-dvh + md:overflow-hidden on this row and the inner column cap
    // the desktop app shell to exactly the viewport, so the sidebar is no
    // longer a normal flex child that scrolls away with a tall page -
    // <main>'s own md:overflow-y-auto becomes the only thing that
    // scrolls. Confirmed on Contacts first (which layers its own sticky
    // sub-header inside main's scroll) before rolling out here. Mobile
    // keeps its plain min-h-dvh document scroll (BottomNav is already
    // fixed, independent of this either way).
    <div className="flex min-h-dvh md:h-dvh md:overflow-hidden">
      <Sidebar userEmail={user?.email} counts={navCounts} />
      <div className="flex min-h-dvh min-w-0 flex-1 flex-col md:h-dvh md:overflow-hidden">
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
        <main className="flex-1 bg-neutral-50/60 pb-28 md:min-h-0 md:overflow-y-auto md:pb-8">{children}</main>
      </div>
      {/* Mobile's FAB slot is Today-only-Log now (LogPill below); New
          contact/New task move to People's header button (Phase 3) and
          the More sheet respectively, so QuickAddButton stays desktop-only. */}
      <div className="hidden md:block">
        <QuickAddButton />
      </div>
      {user && <LogPill ownerId={user.id} />}
      <BottomNav counts={navCounts} userEmail={user?.email} />
    </div>
  );
}
