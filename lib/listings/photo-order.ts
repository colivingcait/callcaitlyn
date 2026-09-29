// Public OM gallery order is the array order already stored on the listing:
// photo_paths for uploads, padsplit_gallery for a curated PadSplit snapshot.
// Drag-and-drop only permutes that array. Hero stays a pin, not a slot.

export const PHOTO_ORDER_SAVE_ERROR = "Couldn't save the new photo order.";

export type OrderSnapshot<T> = {
  items: T[];
  seenKey: string;
};

export function listKey<T>(items: readonly T[], keyOf: (item: T) => string = (item) => String(item)): string {
  return items.map(keyOf).join("\u0000");
}

export function memberKey<T>(items: readonly T[], keyOf: (item: T) => string = (item) => String(item)): string {
  return items.map(keyOf).slice().sort().join("\u0000");
}

export function reorderById<T>(
  items: readonly T[],
  activeId: string,
  overId: string | null,
  idOf: (item: T) => string = (item) => String(item),
): T[] | null {
  if (!overId || activeId === overId) return null;
  const oldIndex = items.findIndex((item) => idOf(item) === activeId);
  const newIndex = items.findIndex((item) => idOf(item) === overId);
  if (oldIndex < 0 || newIndex < 0) return null;
  const next = items.slice();
  const [moved] = next.splice(oldIndex, 1);
  next.splice(newIndex, 0, moved);
  return next;
}

// Adopt a server list when it confirms the drag, changes membership
// (upload, delete, PadSplit pull), or there is no in-flight reorder.
// Ignore a stale permutation so a slow refresh cannot snap the grid back.
export function syncIncomingOrder<T>(
  state: OrderSnapshot<T>,
  incoming: readonly T[],
  keyOf: (item: T) => string,
  holdKey: string | null,
): OrderSnapshot<T> {
  const incomingKey = listKey(incoming, keyOf);
  if (incomingKey === state.seenKey) return state;
  const membersChanged = memberKey(incoming, keyOf) !== memberKey(state.items, keyOf);
  const confirmsHold = holdKey != null && incomingKey === holdKey;
  const matchesLocal = incomingKey === listKey(state.items, keyOf);
  if (holdKey && !membersChanged && !confirmsHold && !matchesLocal) {
    return { items: state.items, seenKey: incomingKey };
  }
  return { items: [...incoming], seenKey: incomingKey };
}

export function shouldReleaseOrderHold(holdKey: string | null, incoming: readonly string[], local: readonly string[]): boolean {
  if (!holdKey) return false;
  if (listKey(incoming) === holdKey) return true;
  return memberKey(incoming) !== memberKey(local);
}

export function revertOrderIfSameMembers<T>(current: readonly T[], previous: readonly T[], keyOf: (item: T) => string): T[] | null {
  if (memberKey(current, keyOf) !== memberKey(previous, keyOf)) return null;
  return [...previous];
}
