import {
  Home,
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
  ListTodo,
  type LucideIcon,
} from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon };
export type NavGroup = { label: string; items: NavItem[] };
export type NavCounts = { contacts?: number; dialer?: number; messages?: number; notes?: number; insights?: number; listings?: number };

// Five primaries match the approved IA: Today | Contacts | Messages |
// Pipeline | More. Everything else is secondary and lives in the More
// sheet (mobile) / More group (sidebar). Routes stay live.
export const PRIMARY_NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Today", icon: Home },
  { href: "/contacts", label: "Contacts", icon: Users },
  { href: "/messages", label: "Messages", icon: MessageCircle },
  { href: "/pipeline", label: "Pipeline", icon: KanbanSquare },
];

export const MORE_NAV_GROUPS: NavGroup[] = [
  {
    label: "Work",
    items: [
      { href: "/?focus=tasks", label: "Tasks", icon: ListTodo },
      { href: "/insights", label: "Insights", icon: Lightbulb },
      { href: "/dialer", label: "Dialer", icon: PhoneCall },
      { href: "/notes", label: "Notes", icon: NotebookText },
    ],
  },
  {
    label: "People",
    items: [
      { href: "/sphere", label: "Sphere", icon: HeartHandshake },
      { href: "/events", label: "Events", icon: CalendarHeart },
    ],
  },
  {
    label: "Business",
    items: [
      { href: "/commissions", label: "Commissions", icon: DollarSign },
      { href: "/sequences", label: "Campaigns", icon: Mail },
      { href: "/numbers", label: "Numbers", icon: Calculator },
      { href: "/scheduling", label: "Scheduling", icon: CalendarClock },
      { href: "/listings", label: "Listings", icon: Home },
      { href: "/recruiting", label: "Agent recruiting", icon: UserPlus },
      { href: "/reports", label: "Reports", icon: BarChart3 },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

// Sidebar still wants a grouped list: primaries first, then More.
export const NAV_GROUPS: NavGroup[] = [{ label: "Work", items: PRIMARY_NAV_ITEMS }, ...MORE_NAV_GROUPS];

export type MobileNavItem = { kind: "link"; href: string; label: string; icon: LucideIcon } | { kind: "more"; label: string; icon: LucideIcon };

export const MOBILE_NAV_ITEMS: MobileNavItem[] = [
  { kind: "link", href: "/", label: "Today", icon: Home },
  { kind: "link", href: "/contacts", label: "Contacts", icon: Users },
  { kind: "link", href: "/messages", label: "Messages", icon: MessageCircle },
  { kind: "link", href: "/pipeline", label: "Pipeline", icon: KanbanSquare },
  { kind: "more", label: "More", icon: Menu },
];
