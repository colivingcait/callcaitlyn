import { Home, MessageCircle, Users, KanbanSquare, DollarSign, Mail, BarChart3, Settings, PhoneCall } from "lucide-react";

export const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/messages", label: "Messages", icon: MessageCircle },
  { href: "/contacts", label: "Contacts", icon: Users },
  { href: "/pipeline", label: "Pipeline", icon: KanbanSquare },
  { href: "/commissions", label: "Commissions", icon: DollarSign },
  { href: "/sequences", label: "Bulk Communication", icon: Mail },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

// Bottom nav (mobile) drops Settings, Commissions, Sequences, and Reports
// to keep tap targets wide - all are occasional-use, reachable from
// Settings on mobile instead. Desktop sidebar keeps the full list since
// there's room there. Dialer is a phone-in-hand workflow, so it's
// mobile-only - added here instead of to the desktop NAV_ITEMS list.
export const MOBILE_NAV_ITEMS = [
  ...NAV_ITEMS.filter((item) => !["/settings", "/commissions", "/sequences", "/reports"].includes(item.href)),
  { href: "/dialer", label: "Dialer", icon: PhoneCall },
];
