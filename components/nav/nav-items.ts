import { Home, MessageCircle, Users, KanbanSquare, Settings } from "lucide-react";

export const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/messages", label: "Messages", icon: MessageCircle },
  { href: "/contacts", label: "Contacts", icon: Users },
  { href: "/pipeline", label: "Pipeline", icon: KanbanSquare },
  { href: "/settings", label: "Settings", icon: Settings },
];

// Bottom nav (mobile) drops Settings to keep tap targets wide - it's
// occasional-use, so it lives as a gear icon in the mobile header instead.
// Desktop sidebar keeps the full list since there's room there.
export const MOBILE_NAV_ITEMS = NAV_ITEMS.filter((item) => item.href !== "/settings");
