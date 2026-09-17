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

export type NavItem = { href: string; label: string; icon: LucideIcon; hint?: string };
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
    label: "Also today",
    items: [
      { href: "/?focus=tasks", label: "Today's tasks", icon: ListTodo, hint: "Lives on Today" },
      { href: "/insights", label: "Insights", icon: Lightbulb, hint: "What changed on its own" },
      { href: "/notes", label: "Meeting notes", icon: NotebookText, hint: "Granola inbox" },
      { href: "/dialer", label: "Event calls", icon: PhoneCall, hint: "Meetup follow-up, not daily calls" },
    ],
  },
  {
    label: "People",
    items: [
      { href: "/sphere", label: "Past clients", icon: HeartHandshake, hint: "Birthdays, reviews, referrers" },
      { href: "/events", label: "Events", icon: CalendarHeart, hint: "Rosters & check-in" },
    ],
  },
  {
    label: "Money & tools",
    items: [
      { href: "/commissions", label: "Commissions", icon: DollarSign, hint: "Deals and cap" },
      { href: "/scheduling", label: "Bookings", icon: CalendarClock, hint: "Approve requests" },
      { href: "/sequences", label: "Campaigns", icon: Mail, hint: "Email and text sequences" },
      { href: "/numbers", label: "House hack", icon: Calculator, hint: "Calculator" },
      { href: "/listings", label: "Listings", icon: Home, hint: "Your listing pages" },
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

export function navItemIsActive(href: string, pathname: string, focus?: string | null): boolean {
  if (href === "/?focus=tasks") return pathname === "/" && focus === "tasks";
  if (href === "/") return pathname === "/";
  if (href.startsWith("/?")) return false;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function isMorePath(pathname: string): boolean {
  return MORE_NAV_GROUPS.some((group) =>
    group.items.some((item) => {
      if (item.href.startsWith("/?")) return false;
      return pathname === item.href || pathname.startsWith(`${item.href}/`);
    }),
  );
}
