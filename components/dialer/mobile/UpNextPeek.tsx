import { Avatar } from "@/components/ui";
import { fullName } from "@/lib/utils";
import type { DialerContact } from "@/lib/data/dialer";

export function UpNextPeek({ contacts }: { contacts: DialerContact[] }) {
  if (contacts.length === 0) return null;
  return (
    <div className="mt-3">
      <p className="mb-1.5 text-[13px] font-semibold uppercase tracking-[.05em] text-neutral-400">Up next</p>
      <div className="divide-y divide-neutral-100 rounded-[14px] border border-[#ebe9e7] bg-white">
        {contacts.slice(0, 2).map((c) => (
          <div key={c.id} className="flex items-center gap-3 px-3.5 py-2.5">
            <Avatar firstName={c.first_name} lastName={c.last_name} size={36} />
            <p className="truncate text-[15px] font-medium text-neutral-700">{fullName(c)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
