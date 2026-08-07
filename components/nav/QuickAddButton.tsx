"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";

export function QuickAddButton() {
  const pathname = usePathname();
  // Hidden on message threads - the compose bar already occupies that
  // corner of the screen and the two would visually overlap.
  if (pathname.startsWith("/messages/")) return null;

  return (
    <Link
      href="/contacts/new"
      aria-label="Add contact"
      className="fixed bottom-20 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-brand-600 text-white shadow-lg active:scale-95 md:bottom-8 md:right-8"
    >
      <Plus size={26} />
    </Link>
  );
}
