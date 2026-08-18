import Link from "next/link";
import { MessageSquareText } from "lucide-react";
import { Card } from "@/components/ui";
import { estimatedTextBlastMinutes } from "@/lib/crm/text-blast-timing";
import type { TextBlastWithProgress } from "@/lib/crm/text-blasts";

export function TextBlastStatusCard({ blasts }: { blasts: TextBlastWithProgress[] }) {
  if (blasts.length === 0) return null;

  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold text-neutral-700">Text reminders in progress</h2>
      <div className="space-y-2">
        {blasts.map((b) => (
          <Link key={b.id} href={`/contacts?regEvent=${encodeURIComponent(b.event_name)}&openBlast=1`}>
            <Card className="flex items-center gap-3 hover:border-brand-200">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                <MessageSquareText size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-neutral-900">{b.event_name}</p>
                <p className="text-xs text-neutral-500">
                  {b.sent}/{b.total} sent
                  {b.pending > 0 && ` - about ${estimatedTextBlastMinutes(b.pending)} min left`}
                </p>
              </div>
              <div className="h-1.5 w-16 shrink-0 overflow-hidden rounded-full bg-neutral-100">
                <div className="h-full rounded-full bg-brand-500" style={{ width: `${b.total ? (b.sent / b.total) * 100 : 0}%` }} />
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
