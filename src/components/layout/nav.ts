import { LayoutDashboard, HeartPulse, Wallet, ShieldCheck, Target, PieChart, Repeat, LineChart, CalendarRange, FlaskConical, Mountain, MessageSquareText, GraduationCap, Newspaper, BadgeIndianRupee, Route } from 'lucide-react';

const P = {
  overview: { to: '/app', label: 'Overview', icon: LayoutDashboard, end: true },
  offers: { to: '/app/offers', label: 'Salary & offers', icon: BadgeIndianRupee },
  goals: { to: '/app/goals', label: 'Goals', icon: Target },
  plan: { to: '/app/plan', label: 'My plan', icon: Route },
  learn: { to: '/app/learn', label: 'Learn', icon: GraduationCap },
  news: { to: '/app/news', label: 'Today’s news', icon: Newspaper },
  budget: { to: '/app/budget', label: 'Budget', icon: Wallet },
  emergency: { to: '/app/emergency-debt', label: 'Emergency & debt', icon: ShieldCheck },
  lifeEvents: { to: '/app/life-events', label: 'Life events', icon: CalendarRange },
  portfolio: { to: '/app/portfolio', label: 'Portfolio', icon: PieChart },
  sip: { to: '/app/sip', label: 'SIP', icon: Repeat },
  simulator: { to: '/app/simulator', label: 'Simulator', icon: LineChart },
  riskLab: { to: '/app/risk-lab', label: 'Risk lab', icon: FlaskConical },
  fi: { to: '/app/fi', label: 'Financial independence', icon: Mountain },
  health: { to: '/app/health', label: 'Financial health', icon: HeartPulse },
};

export type NavItem = { to: string; label: string; icon: typeof LayoutDashboard; end?: boolean };

/** Simple mode (the default): the five screens most people need. */
export const SIMPLE_NAV: NavItem[] = [P.overview, P.offers, P.goals, P.plan, P.learn];

/** Revealed by "Advanced tools" in the sidebar. Every one is also reachable from ⌘K in simple mode. */
export const ADVANCED_NAV: NavItem[] = [P.budget, P.emergency, P.portfolio, P.sip, P.lifeEvents, P.simulator, P.riskLab, P.fi, P.health, P.news];

/** True for screens that live under "Advanced tools". */
export function isAdvancedPath(pathname: string): boolean {
  return ADVANCED_NAV.some((i) => pathname === i.to || pathname.startsWith(`${i.to}/`));
}

/**
 * Every planner screen in groups, for breadcrumbs, the Features page and search: today's money, the plan,
 * what-ifs and learning. Plan score and Coach are reached from the top bar.
 */
export const APP_NAV: { group: string; items: NavItem[] }[] = [
  { group: 'Today', items: [P.overview, P.offers, P.news, P.budget, P.emergency] },
  { group: 'Plan', items: [P.goals, P.plan, P.lifeEvents, P.portfolio, P.sip] },
  { group: 'What if', items: [P.simulator, P.riskLab, P.fi] },
  { group: 'Learn', items: [P.learn] },
];

/** Screens reached from the top bar rather than the sidebar. Listed for breadcrumbs and search. */
export const TOP_BAR_PAGES = [
  { ...P.health, group: 'Today' },
  { to: '/app/coach', label: 'Coach', icon: MessageSquareText, group: 'Learn' },
];

/** Every planner screen in its group, for the Features page and search. */
export const MODULE_GROUPS = APP_NAV.map((g) => ({ ...g, items: [...g.items, ...TOP_BAR_PAGES.filter((p) => p.group === g.group)] }));
export const ALL_APP_PAGES = MODULE_GROUPS.flatMap((g) => g.items);
