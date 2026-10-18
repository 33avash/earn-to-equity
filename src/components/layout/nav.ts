import { LayoutDashboard, HeartPulse, Wallet, ShieldCheck, Target, PieChart, Repeat, LineChart, CalendarRange, FlaskConical, Mountain, MessageSquareText, GraduationCap } from 'lucide-react';

/** App navigation, grouped the way people use it: today's money, the plan, what-ifs, and learning. */
export const APP_NAV = [
  {
    group: 'Today',
    items: [
      { to: '/app', label: 'Overview', icon: LayoutDashboard, end: true },
      { to: '/app/health', label: 'Health', icon: HeartPulse },
      { to: '/app/budget', label: 'Budget', icon: Wallet },
      { to: '/app/emergency-debt', label: 'Emergency & debt', icon: ShieldCheck },
    ],
  },
  {
    group: 'Plan',
    items: [
      { to: '/app/goals', label: 'Goals', icon: Target },
      { to: '/app/portfolio', label: 'Portfolio', icon: PieChart },
      { to: '/app/sip', label: 'SIP', icon: Repeat },
    ],
  },
  {
    group: 'Explore',
    items: [
      { to: '/app/simulator', label: 'Simulator', icon: LineChart },
      { to: '/app/life-events', label: 'Life events', icon: CalendarRange },
      { to: '/app/risk-lab', label: 'Risk lab', icon: FlaskConical },
      { to: '/app/fi', label: 'Financial independence', icon: Mountain },
    ],
  },
  {
    group: 'Learn',
    items: [
      { to: '/app/coach', label: 'Coach', icon: MessageSquareText },
      { to: '/app/learn', label: 'Learning centre', icon: GraduationCap },
    ],
  },
];
