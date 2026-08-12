export function ReportCategory({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-6 border-t border-neutral-200 pt-6 first:border-t-0 first:pt-0">
      <h2 className="font-serif text-lg font-semibold text-neutral-900">{title}</h2>
      <div className="space-y-6">{children}</div>
    </div>
  );
}
