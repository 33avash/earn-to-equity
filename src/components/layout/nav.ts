import { LayoutDashboard, HeartPulse, Wallet, ShieldCheck, Target, PieChart, Repeat, LineChart, CalendarRange, FlaskConical, Mountain, MessageSquareText, GraduationCap } from 'lucide-react';

/**
 * Sidebar navigation, grouped the way people use it: today's money, the plan, what-ifs, and learning.
 * Plan score and Coach are reached from the top bar on every screen, so they are not repeated here.
 */
export const APP_NAV = [
  {
    group: 'Today',
    items: [
      { to: '/app', label: 'Overview', icon: LayoutDashboard, end: true },
      { to: '/app/budget', label: 'Budget', icon: Wallet },
      { to: '/app/emergency-debt', label: 'Emergency & debt', icon: ShieldCheck },
    ],
  },
  {
    group: 'Plan',
    items: [
      { to: '/app/goals', label: 'Goals', icon: Target },
      { to: '/app/life-events', label: 'Life events', icon: CalendarRange },
      { to: '/app/portfolio', label: 'Portfolio', icon: PieChart },
      { to: '/app/sip', label: 'SIP', icon: Repeat },
    ],
  },
  {
    group: 'What if',
    items: [
      { to: '/app/simulator', label: 'Simulator', icon: LineChart },
      { to: '/app/risk-lab', label: 'Risk lab', icon: FlaskConical },
      { to: '/app/fi', label: 'Financial independence', icon: Mountain },
    ],
  },
  {
    group: 'Learn',
    items: [{ to: '/app/learn', label: 'Learning centre', icon: GraduationCap }],
  },
];

/** Screens reached from the top bar rather than the sidebar. Listed for breadcrumbs and search. */
export const TOP_BAR_PAGES = [
  { to: '/app/health', label: 'Financial health', icon: HeartPulse, group: 'Today' },
  { to: '/app/coach', label: 'Coach', icon: MessageSquareText, group: 'Learn' },
];

/** Every planner screen in its group, for the Features page and search. */
export const MODULE_GROUPS = APP_NAV.map((g) => ({ ...g, items: [...g.items, ...TOP_BAR_PAGES.filter((p) => p.group === g.group)] }));
export const ALL_APP_PAGES = MODULE_GROUPS.flatMap((g) => g.items);
