"use client";

import { useState } from "react";
import { listKey, syncIncomingOrder, type OrderSnapshot } from "@/lib/listings/photo-order";

// Local permutation for an optimistic reorder. Server echoes update the
// list; an unchanged prop array must not wipe a drag that hasn't saved yet.
export function useOrderedItems<T>(
  incoming: readonly T[],
  holdKey: string | null = null,
  keyOf: (item: T) => string = (item) => String(item),
): [T[], (next: T[] | ((current: T[]) => T[])) => void] {
  const [state, setState] = useState<OrderSnapshot<T>>(() => ({
    items: [...incoming],
    seenKey: listKey(incoming, keyOf),
  }));
  const synced = syncIncomingOrder(state, incoming, keyOf, holdKey);
  if (synced !== state) setState(synced);

  function setItems(next: T[] | ((current: T[]) => T[])) {
    setState((current) => {
      const items = typeof next === "function" ? next(current.items) : next;
      return { items, seenKey: current.seenKey };
    });
  }

  return [synced.items, setItems];
}
