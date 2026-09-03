"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { BottomSheet } from "@/components/mobile/BottomSheet";
import { ListRow } from "@/components/mobile/ListRow";

type ContactOption = { id: string; first_name: string; last_name: string; phone: string | null; email: string | null };

// Scoped to a lightweight in-memory name filter over contacts already on
// the page - no search backend exists anywhere in this app to build on,
// and the header button's job here is "find someone fast," not a
// full-text search product.
export function TodaySearch({ contacts }: { contacts: ContactOption[] }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const results = query.trim()
    ? contacts.filter((c) => `${c.first_name} ${c.last_name}`.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 20)
    : [];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Search"
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-neutral-200 text-neutral-500"
      >
        <Search size={19} />
      </button>
      <BottomSheet open={open} onClose={() => setOpen(false)} title="Search">
        <div className="pb-4">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name"
            className="mb-2 w-full rounded-[14px] border border-neutral-200 px-3.5 py-2.5 text-[16px] text-neutral-900"
          />
          <div className="divide-y divide-neutral-100">
            {results.map((c) => (
              <ListRow key={c.id} href={`/contacts/${c.id}`} avatar={{ firstName: c.first_name, lastName: c.last_name }} name={`${c.first_name} ${c.last_name}`} />
            ))}
          </div>
        </div>
      </BottomSheet>
    </>
  );
}
