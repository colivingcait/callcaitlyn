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
  CalendarClock,
  DollarSign,
  BarChart3,
  Settings,
  NotebookText,
  UserPlus,
  Menu,
  type LucideIcon,
} from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon };
export type NavGroup = { label: string; items: NavItem[] };
export type NavCounts = { contacts?: number; dialer?: number; messages?: number; notes?: number };

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
  { href: "/scheduling", label: "Scheduling", icon: CalendarClock },
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

// Five along the bottom - what she touches standing up. An explicit list,
// not a positional slice of WORK_ITEMS/PEOPLE_ITEMS (the old approach broke
// silently the moment a new item was inserted rather than appended) -
// everything else lives behind the More sheet, grouped exactly like
// NAV_GROUPS above. "More" has no href - it opens a sheet over whatever
// screen is already showing, so it's a distinct kind rather than a link.
export type MobileNavItem = { kind: "link"; href: string; label: string; icon: LucideIcon } | { kind: "more"; label: string; icon: LucideIcon };

export const MOBILE_NAV_ITEMS: MobileNavItem[] = [
  { kind: "link", href: "/", label: "Today", icon: Sunrise },
  { kind: "link", href: "/messages", label: "Inbox", icon: MessageCircle },
  { kind: "link", href: "/contacts", label: "People", icon: Users },
  { kind: "link", href: "/pipeline", label: "Pipeline", icon: KanbanSquare },
  { kind: "more", label: "More", icon: Menu },
];
