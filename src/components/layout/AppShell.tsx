import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  HeartPulse,
  Wallet,
  ShieldCheck,
  Target,
  PieChart,
  Repeat,
  LineChart,
  CalendarRange,
  FlaskConical,
  Mountain,
  MessageSquareText,
  GraduationCap,
  Settings,
  Menu,
  X,
  MoreHorizontal,
} from 'lucide-react';
import { Wordmark } from './Wordmark';
import { useStore } from '@/state/store';
import { ButtonLink } from '@/components/ui/Button';

export const APP_NAV = [
  {
    group: 'Today',
    items: [
      { to: '/app', label: 'Overview', icon: LayoutDashboard, end: true },
      { to: '/app/health', label: 'Financial Health', icon: HeartPulse },
      { to: '/app/budget', label: 'Budget Planner', icon: Wallet },
      { to: '/app/emergency-debt', label: 'Emergency Fund & Debt', icon: ShieldCheck },
    ],
  },
  {
    group: 'Plan',
    items: [
      { to: '/app/goals', label: 'Goals Planner', icon: Target },
      { to: '/app/portfolio', label: 'Portfolio Builder', icon: PieChart },
      { to: '/app/sip', label: 'SIP Calculator', icon: Repeat },
    ],
  },
  {
    group: 'Explore',
    items: [
      { to: '/app/simulator', label: 'Wealth Simulator', icon: LineChart },
      { to: '/app/life-events', label: 'Life Events', icon: CalendarRange },
      { to: '/app/risk-lab', label: 'Risk Lab', icon: FlaskConical },
      { to: '/app/fi', label: 'Financial Independence', icon: Mountain },
    ],
  },
  {
    group: 'Guidance',
    items: [
      { to: '/app/coach', label: 'AI Wealth Coach', icon: MessageSquareText },
      { to: '/app/learn', label: 'Learning Centre', icon: GraduationCap },
    ],
  },
];

function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav aria-label="Application" className="flex flex-col gap-6">
      {APP_NAV.map((g) => (
        <div key={g.group}>
          <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-ivory/45 dark:text-charcoal/50">{g.group}</p>
          <ul className="flex flex-col gap-0.5">
            {g.items.map(({ to, label, icon: Icon, end }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={end}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    `tap group relative flex items-center gap-3 rounded px-3 py-[7px] text-[13.5px] transition-[background-color,color] duration-200 ${
                      isActive
                        ? 'bg-ivory/[0.09] font-medium text-ivory before:absolute before:left-0 before:top-1/2 before:h-4 before:w-[2px] before:-translate-y-1/2 before:rounded-full before:bg-champagne dark:bg-mint dark:text-charcoal'
                        : 'text-ivory/65 hover:bg-ivory/[0.05] hover:text-ivory dark:text-charcoal/70 dark:hover:text-charcoal'
                    }`
                  }
                >
                  <Icon size={16} strokeWidth={1.6} aria-hidden className="shrink-0 opacity-80 transition-opacity group-hover:opacity-100" />
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function ProfileFooter({ onNavigate }: { onNavigate?: () => void }) {
  const name = useStore((s) => s.profile.about.name);
  const isDemo = useStore((s) => s.isDemo);
  return (
    <div className="border-t border-ivory/10 pt-4 dark:border-line">
      <NavLink
        to="/app/settings"
        onClick={onNavigate}
        className={({ isActive }) => `tap flex items-center gap-3 rounded px-3 py-2 text-[13.5px] ${isActive ? 'bg-ivory/10 text-ivory dark:bg-mint dark:text-charcoal' : 'text-ivory/70 hover:text-ivory dark:text-charcoal/70'}`}
      >
        <Settings size={16} strokeWidth={1.75} aria-hidden /> Settings
      </NavLink>
      <div className="mt-3 flex items-center gap-3 px-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-champagne/90 text-[13px] font-semibold text-evergreen dark:text-onbrand">{(name || 'Y').slice(0, 1).toUpperCase()}</span>
        <div className="min-w-0">
          <p className="truncate text-[13px] font-medium text-ivory dark:text-charcoal">{name || 'Your plan'}</p>
          <p className="text-[11px] text-ivory/50 dark:text-charcoal/50">{isDemo ? 'Demo profile' : 'Saved in this browser'}</p>
        </div>
      </div>
    </div>
  );
}

const BOTTOM = [
  { to: '/app', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/app/goals', label: 'Goals', icon: Target },
  { to: '/app/simulator', label: 'Simulate', icon: LineChart },
  { to: '/app/coach', label: 'Coach', icon: MessageSquareText },
];

export function AppShell() {
  const [drawer, setDrawer] = useState(false);
  const { pathname } = useLocation();
  const isDemo = useStore((s) => s.isDemo);
  useEffect(() => {
    setDrawer(false);
    window.scrollTo(0, 0);
  }, [pathname]);
  useEffect(() => {
    if (!drawer) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setDrawer(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drawer]);

  return (
    <div className="min-h-screen bg-ivory">
      <a href="#app-main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-evergreen focus:px-3 focus:py-2 focus:text-onbrand">
        Skip to content
      </a>
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col justify-between overflow-y-auto bg-evergreen px-3 py-5 dark:border-r dark:border-line dark:bg-surface lg:flex">
        {/* soft light source in the corner of the sidebar */}
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_45%_at_0%_0%,rgba(168,185,160,0.16),transparent_70%)] dark:hidden" />
        <div className="relative">
          <div className="mb-8 px-3">
            <Wordmark to="/" inverse />
          </div>
          <NavItems />
        </div>
        <div className="relative">
          <ProfileFooter />
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-ivory/95 px-4 backdrop-blur-sm lg:hidden">
        <Wordmark to="/" />
        <button type="button" onClick={() => setDrawer(true)} aria-label="Open navigation" aria-expanded={drawer} className="hit rounded p-2 text-evergreen">
          <Menu size={22} />
        </button>
      </header>

      {/* Mobile drawer */}
      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <div className="absolute inset-0 bg-evergreen/40" onClick={() => setDrawer(false)} />
          <div className="absolute inset-y-0 left-0 flex w-[82%] max-w-[300px] flex-col justify-between overflow-y-auto bg-evergreen px-3 py-5 dark:bg-surface">
            <div>
              <div className="mb-6 flex items-center justify-between px-3">
                <Wordmark to="/" inverse />
                <button type="button" onClick={() => setDrawer(false)} aria-label="Close navigation" className="hit text-ivory dark:text-charcoal">
                  <X size={20} />
                </button>
              </div>
              <NavItems onNavigate={() => setDrawer(false)} />
            </div>
            <ProfileFooter onNavigate={() => setDrawer(false)} />
          </div>
        </div>
      )}

      <div className="lg:pl-64">
        {isDemo && (
          <div className="no-print border-b border-line bg-[linear-gradient(90deg,rgb(var(--c-champagne)/0.14),rgb(var(--c-mint)/0.5))]">
            <div className="mx-auto flex max-w-[1180px] flex-col gap-2 px-4 py-2.5 text-[13px] sm:flex-row sm:items-center sm:justify-between sm:px-8">
              <p className="text-charcoal">
                <span className="font-semibold text-evergreen">Demo data.</span> You are viewing a fictional profile. Every figure is illustrative.
              </p>
              <ButtonLink to="/start" size="sm" variant="secondary">
                Start my own plan
              </ButtonLink>
            </div>
          </div>
        )}
        <main id="app-main" className="mx-auto max-w-[1180px] px-4 pb-28 pt-10 sm:px-8 lg:pb-20 lg:pt-12">
          <div key={pathname} className="page-enter">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <nav aria-label="Quick" className="no-print fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-surface lg:hidden">
        {BOTTOM.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => `flex flex-col items-center gap-0.5 py-2 text-[10.5px] ${isActive ? 'text-evergreen font-semibold' : 'text-grey'}`}>
            <Icon size={19} strokeWidth={1.75} aria-hidden />
            {label}
          </NavLink>
        ))}
        <button type="button" onClick={() => setDrawer(true)} className="flex flex-col items-center gap-0.5 py-2 text-[10.5px] text-grey" aria-label="More sections">
          <MoreHorizontal size={19} strokeWidth={1.75} aria-hidden />
          More
        </button>
      </nav>
    </div>
  );
}

export function NotFound() {
  return (
    <div className="container-x py-24">
      <p className="eyebrow">404</p>
      <h1 className="display mt-2 text-4xl">This page doesn’t exist.</h1>
      <p className="mt-3 text-grey">
        <Link className="link" to="/">
          Return home
        </Link>
      </p>
    </div>
  );
}
