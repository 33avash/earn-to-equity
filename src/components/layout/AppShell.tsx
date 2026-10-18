import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, Target, LineChart, MessageSquareText, MoreHorizontal, Menu, Search, Settings, PanelLeftClose, PanelLeftOpen, Sparkles } from 'lucide-react';
import { Wordmark } from './Wordmark';
import { APP_NAV } from './nav';
import { CommandPalette, PlanSwitcher, ThemeToggle, useCommandShortcut } from './ShellControls';
import { useStore } from '@/state/store';
import { ButtonLink } from '@/components/ui/Button';
import { Dialog, DialogTitle, SheetContent } from '@/components/ui/shadcn/dialog';
import { PageTransition } from '@/components/motion/Motion';

export { APP_NAV };

const SIDEBAR_KEY = 'e2e:sidebar';

function NavItems({ collapsed = false, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  return (
    <nav aria-label="Application" className="flex flex-col gap-5">
      {APP_NAV.map((g) => (
        <div key={g.group}>
          {collapsed ? <div className="mx-auto mb-1.5 h-px w-6 bg-line" aria-hidden /> : <p className="mb-1 px-2.5 text-[11px] font-medium text-grey">{g.group}</p>}
          <ul className="flex flex-col gap-px">
            {g.items.map(({ to, label, icon: Icon, end }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={end}
                  onClick={onNavigate}
                  title={collapsed ? label : undefined}
                  aria-label={collapsed ? label : undefined}
                  className={({ isActive }) =>
                    `tap flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13.5px] transition-colors ${collapsed ? 'justify-center' : ''} ${
                      isActive ? 'bg-muted font-medium text-evergreen' : 'text-grey hover:bg-muted/60 hover:text-evergreen'
                    }`
                  }
                >
                  <Icon size={16} strokeWidth={1.75} aria-hidden className="shrink-0" />
                  {!collapsed && label}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function SettingsLink({ collapsed = false, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  return (
    <NavLink
      to="/app/settings"
      onClick={onNavigate}
      aria-label={collapsed ? 'Settings' : undefined}
      className={({ isActive }) => `tap flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13.5px] ${collapsed ? 'justify-center' : ''} ${isActive ? 'bg-muted font-medium text-evergreen' : 'text-grey hover:bg-muted/60 hover:text-evergreen'}`}
    >
      <Settings size={16} strokeWidth={1.75} aria-hidden /> {!collapsed && 'Settings'}
    </NavLink>
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

  useEffect(() => {
    setDrawer(false);
    window.scrollTo(0, 0);
  }, [pathname]);
  const toggleCollapsed = () =>
    setCollapsed((c) => {
      try {
        localStorage.setItem(SIDEBAR_KEY, c ? '0' : '1');
      } catch {
        /* storage unavailable */
      }
      return !c;
    });
  const sidebarWidth = collapsed ? 'lg:w-[64px]' : 'lg:w-[232px]';
  const contentPad = collapsed ? 'lg:pl-[64px]' : 'lg:pl-[232px]';

  return (
    <div className="min-h-screen bg-ivory">
      <a href="#app-main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-evergreen focus:px-3 focus:py-2 focus:text-onbrand">
        Skip to content
      </a>

      {/* Desktop sidebar */}
      <aside aria-label="Sidebar" className={`fixed inset-y-0 left-0 z-30 hidden flex-col justify-between border-r border-line bg-surface px-2.5 py-4 transition-[width] duration-200 lg:flex ${sidebarWidth}`}>
        <div className="flex min-h-0 flex-col gap-6 overflow-y-auto">
          <div className={`flex h-9 items-center ${collapsed ? 'justify-center' : 'px-1.5'}`}>
            <Wordmark to="/" compact={collapsed} />
          </div>
          <NavItems collapsed={collapsed} />
        </div>
        <div className="flex flex-col gap-1 border-t border-line pt-3">
          <SettingsLink collapsed={collapsed} />
          <button type="button" onClick={toggleCollapsed} className={`tap flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13.5px] text-grey hover:bg-muted/60 hover:text-evergreen ${collapsed ? 'justify-center' : ''}`} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
            {collapsed ? <PanelLeftOpen size={16} aria-hidden /> : <PanelLeftClose size={16} aria-hidden />}
            {!collapsed && 'Collapse'}
          </button>
        </div>
      </aside>

      {/* Mobile navigation drawer */}
      <Dialog open={drawer} onOpenChange={setDrawer}>
        <SheetContent side="left" className="justify-between px-3 py-4" aria-describedby={undefined}>
          <DialogTitle className="sr-only">Navigation</DialogTitle>
          <div className="flex flex-col gap-6">
            <div className="px-1.5">
              <Wordmark to="/" />
            </div>
            <NavItems onNavigate={() => setDrawer(false)} />
          </div>
          <div className="border-t border-line pt-3">
            <SettingsLink onNavigate={() => setDrawer(false)} />
          </div>
        </SheetContent>
      </Dialog>

      <div className={`transition-[padding] duration-200 ${contentPad}`}>
        {/* Top bar */}
        <header className="sticky top-0 z-20 border-b border-line bg-ivory/80 backdrop-blur-md">
          <div className="mx-auto flex h-14 max-w-[1240px] items-center gap-2 px-4 sm:px-6">
            <button type="button" onClick={() => setDrawer(true)} aria-label="Open navigation" className="hit -ml-1 inline-flex h-9 w-9 items-center justify-center rounded-md text-evergreen lg:hidden">
              <Menu size={20} />
            </button>
            <div className="lg:hidden">
              <Wordmark to="/" compact />
            </div>
            <PlanSwitcher />
            <div className="ml-auto flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPaletteOpen(true)}
                className="tap hidden h-9 items-center gap-2 rounded-md border border-line bg-surface px-2.5 text-[13px] text-grey hover:text-evergreen sm:inline-flex"
                aria-label="Search and actions"
              >
                <Search size={14} aria-hidden />
                <span className="hidden md:inline">Search</span>
                <kbd className="num rounded border border-line px-1.5 text-[11px]">⌘K</kbd>
              </button>
              <button type="button" onClick={() => setPaletteOpen(true)} className="hit inline-flex h-9 w-9 items-center justify-center rounded-md text-grey sm:hidden" aria-label="Search and actions">
                <Search size={17} aria-hidden />
              </button>
              <ThemeToggle />
              <ButtonLink to="/app/coach" size="sm" variant="secondary" className="hidden sm:inline-flex">
                <Sparkles size={14} aria-hidden /> Ask coach
              </ButtonLink>
            </div>
          </div>
          {isDemo && (
            <div className="border-t border-line bg-muted/60">
              <p className="mx-auto max-w-[1240px] px-4 py-1.5 text-[12.5px] text-grey sm:px-6">
                You’re viewing a fictional demo plan.{' '}
                <Link to="/start" className="link">
                  Build your own
                </Link>
              </p>
            </div>
          )}
        </header>

        <main id="app-main" className="mx-auto max-w-[1240px] px-4 pb-28 pt-8 sm:px-6 lg:pb-16 lg:pt-10">
          <PageTransition id={pathname}>
            <Outlet />
          </PageTransition>
        </main>
      </div>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />

      {/* Mobile bottom navigation */}
      <nav aria-label="Quick" className="no-print fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        {BOTTOM.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => `flex min-h-[52px] flex-col items-center justify-center gap-0.5 text-[11px] ${isActive ? 'font-medium text-evergreen' : 'text-grey'}`}>
            <Icon size={19} strokeWidth={1.75} aria-hidden />
            {label}
          </NavLink>
        ))}
        <button type="button" onClick={() => setDrawer(true)} className="flex min-h-[52px] flex-col items-center justify-center gap-0.5 text-[11px] text-grey" aria-label="More sections">
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
