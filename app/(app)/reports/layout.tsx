import { ReportsTabNav } from "@/components/reports/ReportsTabNav";

export default function ReportsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-4">
        <h1 className="font-serif text-2xl font-semibold text-neutral-900">Reports</h1>
        <p className="mt-0.5 text-sm text-neutral-500">
          Where your leads actually come from, which sources turn into closed business, and what&apos;s coming next.
        </p>
      </div>
      <ReportsTabNav />
      <div className="mt-6 space-y-8">{children}</div>
    </div>
  );
}
