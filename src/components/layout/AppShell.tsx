import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { ChevronRight, Menu, Search, Settings, PanelLeftClose, PanelLeftOpen, Sparkles } from 'lucide-react';
import { Wordmark } from './Wordmark';
import { APP_NAV } from './nav';
import { CommandPalette, PlanSwitcher, ThemeToggle, useCommandShortcut } from './ShellControls';
import { useStore } from '@/state/store';
import { ButtonLink } from '@/components/ui/Button';
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

function NavItems({ collapsed = false, onNavigate, pill = 'nav-pill' }: { collapsed?: boolean; onNavigate?: () => void; pill?: string }) {
  const reduce = useReducedMotion();
  return (
    <nav aria-label="Application" className="flex flex-col gap-5">
      {APP_NAV.map((g) => (
        <div key={g.group}>
          {collapsed ? <div className="mx-auto mb-2 h-px w-6 bg-line" aria-hidden /> : <p className="mb-1 px-2.5 text-[11px] font-medium text-grey">{g.group}</p>}
          <ul className="flex flex-col gap-px">
            {g.items.map(({ to, label, icon: Icon, end }) => (
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
        </div>
      ))}
    </nav>
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
  for (const g of APP_NAV)
    for (const i of g.items) {
      const hit = i.end ? pathname === i.to || pathname === `${i.to}/` : pathname.startsWith(i.to);
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
  const plan = usePlan();
  const [group, page] = crumbs(pathname);

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
          <div className="border-t border-line pt-3">
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
              <ButtonLink to="/app/coach" size="sm" className="hidden sm:inline-flex">
                <Sparkles size={14} aria-hidden /> Ask coach
              </ButtonLink>
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

        <main id="app-main" className="mx-auto max-w-[1440px] px-4 pb-20 pt-8 sm:px-6 lg:px-8">
          <PageTransition id={pathname}>
            <Outlet />
          </PageTransition>
        </main>
      </div>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
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
