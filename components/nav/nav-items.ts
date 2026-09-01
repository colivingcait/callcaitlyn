import {
  Sunrise,
  Lightbulb,
  MessageCircle,
  PhoneCall,
  Users,
  HeartHandshake,
  KanbanSquare,
  CalendarHeart,
  Mail,
  Calculator,
  DollarSign,
  BarChart3,
  Settings,
  NotebookText,
  UserPlus,
  type LucideIcon,
} from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon };
export type NavGroup = { label: string; items: NavItem[] };

// Thirteen items in three groups - about the ceiling before a sidebar
// becomes a list you scan instead of a map you know. Insights, Sphere,
// Events, and Numbers are new destinations (Phase 2+) that route to a
// placeholder for now so the nav isn't lying about what exists yet.
export const WORK_ITEMS: NavItem[] = [
  { href: "/", label: "Today", icon: Sunrise },
  { href: "/insights", label: "Insights", icon: Lightbulb },
  { href: "/messages", label: "Messages", icon: MessageCircle },
  { href: "/dialer", label: "Dialer", icon: PhoneCall },
  // Appended, not inserted - MOBILE_NAV_ITEMS below indexes into this
  // array positionally, so a new item has to go last or it'd silently
  // swap which item shows up on the bottom nav.
  { href: "/notes", label: "Notes", icon: NotebookText },
];

export const PEOPLE_ITEMS: NavItem[] = [
  { href: "/contacts", label: "Contacts", icon: Users },
  { href: "/sphere", label: "Sphere", icon: HeartHandshake },
  { href: "/pipeline", label: "Pipeline", icon: KanbanSquare },
  { href: "/events", label: "Events", icon: CalendarHeart },
];

export const BUSINESS_ITEMS: NavItem[] = [
  { href: "/sequences", label: "Campaigns", icon: Mail },
  { href: "/numbers", label: "Numbers", icon: Calculator },
  { href: "/commissions", label: "Commissions", icon: DollarSign },
  { href: "/recruiting", label: "Agent recruiting", icon: UserPlus },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export const NAV_GROUPS: NavGroup[] = [
  { label: "Work", items: WORK_ITEMS },
  { label: "People", items: PEOPLE_ITEMS },
  { label: "Business", items: BUSINESS_ITEMS },
];

// Five along the bottom - what she touches standing up. Everything else
// sits behind a More sheet on mobile (unchanged from before).
export const MOBILE_NAV_ITEMS: NavItem[] = [
  WORK_ITEMS[0], // Today
  WORK_ITEMS[2], // Messages
  PEOPLE_ITEMS[0], // Contacts
  WORK_ITEMS[3], // Dialer
  PEOPLE_ITEMS[3], // Events
];
