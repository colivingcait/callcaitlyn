import { Home, MessageCircle, Users, KanbanSquare, DollarSign, Settings } from "lucide-react";

export const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/messages", label: "Messages", icon: MessageCircle },
  { href: "/contacts", label: "Contacts", icon: Users },
  { href: "/pipeline", label: "Pipeline", icon: KanbanSquare },
  { href: "/commissions", label: "Commissions", icon: DollarSign },
  { href: "/settings", label: "Settings", icon: Settings },
];

// Bottom nav (mobile) drops Settings and Commissions to keep tap targets
// wide - both are occasional-use, so they live as header icons instead.
// Desktop sidebar keeps the full list since there's room there.
export const MOBILE_NAV_ITEMS = NAV_ITEMS.filter((item) => item.href !== "/settings" && item.href !== "/commissions");
