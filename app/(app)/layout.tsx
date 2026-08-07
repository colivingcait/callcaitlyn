import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/nav/Sidebar";
import { BottomNav } from "@/components/nav/BottomNav";
import { QuickAddButton } from "@/components/nav/QuickAddButton";
import { SignOutButton } from "@/components/nav/SignOutButton";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex min-h-dvh">
      <Sidebar userEmail={user?.email} />
      <div className="flex min-h-dvh flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-neutral-200 bg-white px-4 py-3 md:hidden">
          <h1 className="text-base font-semibold text-neutral-900">CallCaitlyn</h1>
          <SignOutButton />
        </header>
        <main className="flex-1 pb-24 md:pb-8">{children}</main>
      </div>
      <QuickAddButton />
      <BottomNav />
    </div>
  );
}
