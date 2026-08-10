import { Home, MessageCircle, Users, KanbanSquare, DollarSign, Mail, Settings, PhoneCall } from "lucide-react";

export const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/messages", label: "Messages", icon: MessageCircle },
  { href: "/contacts", label: "Contacts", icon: Users },
  { href: "/dialer", label: "Dialer", icon: PhoneCall },
  { href: "/pipeline", label: "Pipeline", icon: KanbanSquare },
  { href: "/commissions", label: "Commissions", icon: DollarSign },
  { href: "/sequences", label: "Sequences", icon: Mail },
  { href: "/settings", label: "Settings", icon: Settings },
];

// Bottom nav (mobile) drops Settings, Commissions, and Sequences to keep
// tap targets wide - all three are occasional-use, reachable from Settings
// on mobile instead. Desktop sidebar keeps the full list since there's
// room there.
export const MOBILE_NAV_ITEMS = NAV_ITEMS.filter(
  (item) => !["/settings", "/commissions", "/sequences"].includes(item.href),
);
