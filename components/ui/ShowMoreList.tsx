"use client";

import { useState } from "react";

export function ShowMoreList<T>({
  items,
  initial = 6,
  renderItem,
  moreLabel,
}: {
  items: T[];
  initial?: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  moreLabel?: (remaining: number) => string;
}) {
  const [open, setOpen] = useState(false);
  const visible = open ? items : items.slice(0, initial);
  const remaining = items.length - visible.length;

  return (
    <>
      {visible.map((item, index) => renderItem(item, index))}
      {remaining > 0 && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full px-3.5 py-3 text-left text-[14px] font-semibold text-[#c45c4a]"
        >
          {moreLabel ? moreLabel(remaining) : `Show ${remaining} more`}
        </button>
      )}
    </>
  );
}
