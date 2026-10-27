import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useSearchParams } from 'react-router-dom';
import { ChevronRight, Menu, Search, Settings, PanelLeftClose, PanelLeftOpen, Sparkles, LayoutDashboard, Target, Route, MessageSquareText, MoreHorizontal, SlidersHorizontal } from 'lucide-react';
import { Wordmark } from './Wordmark';
import { ADVANCED_NAV, APP_NAV, MODULE_GROUPS, SIMPLE_NAV, isAdvancedPath, type NavItem } from './nav';
import { CommandPalette, PlanSwitcher, ThemeToggle, useCommandShortcut } from './ShellControls';
import { useStore } from '@/state/store';
import { Button } from '@/components/ui/Button';
import { CoachPanel } from '@/features/coach/CoachPanel';
import { FixPlanSheet } from '@/features/fixplan/FixPlanSheet';
import { Dialog, DialogTitle, SheetContent } from '@/components/ui/shadcn/dialog';
import { PageTransition } from '@/components/motion/Motion';
import { ScoreButton } from '@/components/ui/ScoreRing';
import { usePlan } from '@/state/selectors';
import { motion, useReducedMotion } from 'motion/react';

export { APP_NAV };

const SIDEBAR_KEY = 'e2e:sidebar';

const navItem = (active: boolean, collapsed: boolean) =>
  `tap relative flex h-8 items-center gap-2.5 rounded-lg px-2.5 text-[13px] transition-colors duration-150 ${collapsed ? 'justify-center' : ''} ${
    active ? 'font-medium text-evergreen' : 'text-charcoal/80 hover:bg-muted/50 hover:text-evergreen'
  }`;

function NavList({ items, collapsed, onNavigate, pill, reduce }: { items: NavItem[]; collapsed: boolean; onNavigate?: () => void; pill: string; reduce: boolean | null }) {
  return (
    <ul className="flex flex-col gap-px">
      {items.map(({ to, label, icon: Icon, end }) => (
        <li key={to}>
          <NavLink to={to} end={end} onClick={onNavigate} title={collapsed ? label : undefined} aria-label={collapsed ? label : undefined} className={({ isActive }) => navItem(isActive, collapsed)}>
            {({ isActive }) => (
              <>
                {isActive && <motion.span layoutId={reduce ? undefined : pill} className="absolute inset-0 rounded-lg bg-muted shadow-[0_0_0_1px_var(--frame-line),var(--edge-highlight)]" transition={{ type: 'spring', stiffness: 420, damping: 36 }} />}
                <Icon size={16} strokeWidth={1.75} aria-hidden className={`relative shrink-0 ${isActive ? 'text-forest' : ''}`} />
                {!collapsed && <span className="relative">{label}</span>}
              </>
            )}
          </NavLink>
        </li>
      ))}
    </ul>
  );
}

/** Simple mode shows five screens; "Advanced tools" adds the rest underneath. */
function NavItems({ collapsed = false, onNavigate, pill = 'nav-pill' }: { collapsed?: boolean; onNavigate?: () => void; pill?: string }) {
  const reduce = useReducedMotion();
  const advanced = useStore((s) => s.settings.navMode === 'advanced');
  return (
    <nav aria-label="Application" className="flex flex-col gap-5">
      <NavList items={SIMPLE_NAV} collapsed={collapsed} onNavigate={onNavigate} pill={pill} reduce={reduce} />
      {advanced && (
        <div>
          {collapsed ? <div className="mx-auto mb-2 h-px w-6 bg-line" aria-hidden /> : <p className="mb-1 px-2.5 text-[11px] font-medium text-grey">Advanced tools</p>}
          <NavList items={ADVANCED_NAV} collapsed={collapsed} onNavigate={onNavigate} pill={pill} reduce={reduce} />
        </div>
      )}
    </nav>
  );
}

/** The sidebar switch between simple and advanced navigation. */
function AdvancedToggle({ collapsed = false }: { collapsed?: boolean }) {
  const advanced = useStore((s) => s.settings.navMode === 'advanced');
  const setSettings = useStore((s) => s.setSettings);
  return (
    <button type="button" aria-pressed={advanced} onClick={() => setSettings({ navMode: advanced ? 'simple' : 'advanced' })} className={navItem(false, collapsed)} title={collapsed ? 'Advanced tools' : undefined} aria-label={collapsed ? 'Advanced tools' : undefined}>
      <SlidersHorizontal size={16} aria-hidden />
      {!collapsed && (
        <>
          <span className="flex-1 text-left">Advanced tools</span>
          <span aria-hidden className={`relative h-4 w-7 rounded-full transition-colors ${advanced ? 'bg-forest' : 'bg-line'}`}>
            <span className={`absolute top-0.5 h-3 w-3 rounded-full bg-surface shadow transition-transform ${advanced ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
          </span>
        </>
      )}
    </button>
  );
}

function SettingsLink({ collapsed = false, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  return (
    <NavLink to="/app/settings" onClick={onNavigate} aria-label={collapsed ? 'Settings' : undefined} className={({ isActive }) => navItem(isActive, collapsed)}>
      <Settings size={16} strokeWidth={1.75} aria-hidden /> {!collapsed && 'Settings'}
    </NavLink>
  );
}

/** Group and page label for the top-bar breadcrumb, from the longest matching nav route. */
function crumbs(pathname: string): [string, string] {
  if (pathname.startsWith('/app/settings')) return ['Account', 'Settings'];
  let best: [string, string] = ['Today', 'Overview'];
  let len = 0;
  for (const g of MODULE_GROUPS)
    for (const i of g.items) {
      const hit = 'end' in i && i.end ? pathname === i.to || pathname === `${i.to}/` : pathname.startsWith(i.to);
      if (hit && i.to.length > len) {
        best = [g.group, i.label];
        len = i.to.length;
      }
    }
  return best;
}

export function AppShell() {
  const [drawer, setDrawer] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [paletteOpen, setPaletteOpen] = useCommandShortcut();
  const { pathname } = useLocation();
  const isDemo = useStore((s) => s.isDemo);
  const setCoachOpen = useStore((s) => s.setCoachOpen);
  const plan = usePlan();
  const onCoachPage = pathname.startsWith('/app/coach');
  const [search, setSearch] = useSearchParams();
  const setFixOpen = useStore((s) => s.setFixOpen);
  // ?fix=1 opens "Fix my plan" (from Next steps, the landing page and shared links).
  useEffect(() => {
    if (search.get('fix') !== '1') return;
    setFixOpen(true);
    const next = new URLSearchParams(search);
    next.delete('fix');
    setSearch(next, { replace: true });
  }, [search, setSearch, setFixOpen]);
  const [group, page] = crumbs(pathname);
  const advancedPage = useStore((s) => s.settings.navMode === 'simple') && isAdvancedPath(pathname);

  useEffect(() => {
    setDrawer(false);
    window.scrollTo(0, 0);
  }, [pathname]);
  useEffect(() => {
    if (onCoachPage) setCoachOpen(false);
  }, [onCoachPage, setCoachOpen]);
  const toggleCollapsed = () =>
    setCollapsed((c) => {
      try {
        localStorage.setItem(SIDEBAR_KEY, c ? '0' : '1');
      } catch {
        /* storage unavailable */
      }
      return !c;
    });
  const sidebarWidth = collapsed ? 'lg:w-[64px]' : 'lg:w-[244px]';
  const contentPad = collapsed ? 'lg:pl-[64px]' : 'lg:pl-[244px]';

  return (
    <div className="app-ui relative isolate min-h-[100dvh] bg-background">
      <a href="#app-main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-evergreen focus:px-3 focus:py-2 focus:text-onbrand">
        Skip to content
      </a>

      {/* Desktop sidebar: full height, flush to the window edge */}
      <aside aria-label="Sidebar" className={`fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-line bg-surface/80 backdrop-blur-xl [background-image:var(--surface-grad)] lg:flex ${sidebarWidth}`}>
        <div className={`flex h-14 shrink-0 items-center border-b border-line ${collapsed ? 'justify-center' : 'px-4'}`}>
          <Wordmark to="/" compact={collapsed} />
        </div>
        {!collapsed && (
          <div className="px-3 pt-3">
            <PlanSwitcher />
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
          <NavItems collapsed={collapsed} />
        </div>
        <div className="flex flex-col gap-px border-t border-line px-3 py-3">
          <AdvancedToggle collapsed={collapsed} />
          <SettingsLink collapsed={collapsed} />
          <button type="button" onClick={toggleCollapsed} className={navItem(false, collapsed)} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
            {collapsed ? <PanelLeftOpen size={16} aria-hidden /> : <PanelLeftClose size={16} aria-hidden />}
            {!collapsed && 'Collapse'}
          </button>
        </div>
      </aside>

      {/* Navigation drawer for narrow windows */}
      <Dialog open={drawer} onOpenChange={setDrawer}>
        <SheetContent side="left" className="justify-between px-3 py-5" aria-describedby={undefined}>
          <DialogTitle className="sr-only">Navigation</DialogTitle>
          <div className="flex flex-col gap-4">
            <div className="px-1.5">
              <Wordmark to="/" />
            </div>
            <PlanSwitcher />
            <NavItems onNavigate={() => setDrawer(false)} pill="nav-pill-drawer" />
          </div>
          <div className="flex flex-col gap-px border-t border-line pt-3">
            <AdvancedToggle />
            <SettingsLink onNavigate={() => setDrawer(false)} />
          </div>
        </SheetContent>
      </Dialog>

      <div className={contentPad}>
        {/* Top bar: breadcrumb, search, theme and coach */}
        <header className="sticky top-0 z-20 border-b border-line bg-background/85 backdrop-blur-md">
          <div className="flex h-14 items-center gap-3 px-4 sm:px-6 lg:px-8">
            <button type="button" onClick={() => setDrawer(true)} aria-label="Open navigation" className="hit -ml-1.5 inline-flex h-9 w-9 items-center justify-center rounded-md text-evergreen hover:bg-muted lg:hidden">
              <Menu size={19} />
            </button>
            <p className="flex min-w-0 items-center gap-1.5 text-[13px]">
              <span className="hidden text-grey sm:inline">{group}</span>
              <ChevronRight size={14} className="hidden text-grey sm:inline" aria-hidden />
              <span className="truncate font-medium text-evergreen">{page}</span>
              {advancedPage && <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-grey">Advanced</span>}
            </p>
            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPaletteOpen(true)}
                className="tap inline-flex h-9 items-center gap-2 rounded-full bg-surface px-3 text-[13px] text-grey shadow-[0_0_0_1px_var(--frame-line),var(--edge-highlight)] whitespace-nowrap transition-colors hover:text-evergreen md:w-56"
                aria-label="Search and actions"
              >
                <Search size={14} aria-hidden />
                <span className="hidden truncate md:inline">Search or jump to…</span>
                <kbd className="num ml-auto hidden rounded border border-line bg-muted px-1.5 py-px text-[11px] md:inline">⌘K</kbd>
              </button>
              <ScoreButton health={plan.health} />
              <ThemeToggle />
              {!onCoachPage && (
                <Button size="sm" className="hidden sm:inline-flex" onClick={() => setCoachOpen(true)}>
                  <Sparkles size={14} aria-hidden /> Ask coach
                </Button>
              )}
            </div>
          </div>
          {isDemo && (
            <p className="flex flex-wrap items-center gap-x-2 border-t border-champagne/25 bg-champagne/10 px-4 py-1.5 text-[12.5px] text-charcoal sm:px-6 lg:px-8">
              <span className="h-1.5 w-1.5 rounded-full bg-champagne" aria-hidden />
              You’re viewing a fictional demo plan.
              <Link to="/start" className="link">
                Build your own
              </Link>
            </p>
          )}
        </header>

        <main id="app-main" className="mx-auto max-w-[1440px] px-4 pb-28 pt-8 sm:px-6 lg:px-8 lg:pb-20">
          <PageTransition id={pathname}>
            <Outlet />
          </PageTransition>
        </main>
      </div>

      <MobileTabBar onMore={() => setDrawer(true)} onCoach={() => setCoachOpen(true)} onCoachPage={onCoachPage} />
      <CoachPanel />
      <FixPlanSheet />
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  );
}

/** Bottom tab bar on phones and narrow windows: the three most used screens, the coach, and the full menu. */
function MobileTabBar({ onMore, onCoach, onCoachPage }: { onMore: () => void; onCoach: () => void; onCoachPage: boolean }) {
  const tab = 'tap flex h-14 flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors';
  const tabs = [
    { to: '/app', label: 'Overview', icon: LayoutDashboard, end: true },
    { to: '/app/goals', label: 'Goals', icon: Target },
    { to: '/app/plan', label: 'My plan', icon: Route },
  ];
  return (
    <nav aria-label="Quick navigation" className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
      <ul className="mx-auto flex max-w-lg">
        {tabs.map(({ to, label, icon: Icon, end }) => (
          <li key={to} className="flex flex-1">
            <NavLink to={to} end={end} className={({ isActive }) => `${tab} ${isActive ? 'text-forest' : 'text-grey hover:text-evergreen'}`}>
              <Icon size={19} strokeWidth={1.75} aria-hidden />
              {label}
            </NavLink>
          </li>
        ))}
        <li className="flex flex-1">
          <button type="button" onClick={onCoach} disabled={onCoachPage} className={`${tab} ${onCoachPage ? 'text-forest' : 'text-grey hover:text-evergreen'}`}>
            <MessageSquareText size={19} strokeWidth={1.75} aria-hidden />
            Coach
          </button>
        </li>
        <li className="flex flex-1">
          <button type="button" onClick={onMore} className={`${tab} text-grey hover:text-evergreen`}>
            <MoreHorizontal size={19} strokeWidth={1.75} aria-hidden />
            More
          </button>
        </li>
      </ul>
    </nav>
  );
}

export function NotFound() {
  return (
    <div className="container-x flex min-h-[60dvh] flex-col justify-center py-24">
      <p className="num text-[96px] font-semibold leading-none tracking-[-0.06em] text-evergreen/10 sm:text-[160px]">404</p>
      <h1 className="display mt-2 text-[40px] leading-tight sm:text-[56px]">
        This page doesn’t <span className="text-gradient">exist.</span>
      </h1>
      <p className="mt-6 text-grey">
        <Link className="link" to="/">
          Return home
        </Link>
      </p>
    </div>
  );
}
