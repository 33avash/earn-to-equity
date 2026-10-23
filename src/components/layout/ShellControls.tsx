import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Command } from 'cmdk';
import { ChevronsUpDown, Monitor, Moon, Search, Sun, Plus, FlaskConical, CalendarRange, Download, ArrowRightLeft } from 'lucide-react';
import { useTheme, type ThemePref } from '@/theme/ThemeProvider';
import { useStore } from '@/state/store';
import { usePlan } from '@/state/selectors';
import { exportSummary } from '@/services/export';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/shadcn/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/shadcn/menu';
import { APP_NAV } from './nav';

const THEME_ICON = { light: Sun, dark: Moon, system: Monitor };

export function ThemeToggle() {
  const { theme, resolved, setTheme } = useTheme();
  const Icon = theme === 'system' ? Monitor : resolved === 'dark' ? Moon : Sun;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="hit inline-flex h-9 w-9 items-center justify-center rounded-full text-grey transition-colors hover:bg-muted hover:text-evergreen" aria-label={`Theme: ${theme}`}>
        <Icon size={17} aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Theme</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={theme} onValueChange={(v) => setTheme(v as ThemePref)}>
          {(['light', 'dark', 'system'] as const).map((t) => {
            const I = THEME_ICON[t];
            return (
              <DropdownMenuRadioItem key={t} value={t}>
                <I size={14} aria-hidden /> {t === 'system' ? 'System' : t === 'light' ? 'Light' : 'Dark'}
              </DropdownMenuRadioItem>
            );
          })}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** "My plan" / "Demo". Opening the demo keeps your plan aside; switching back restores it. */
export function PlanSwitcher() {
  const navigate = useNavigate();
  const isDemo = useStore((s) => s.isDemo);
  const hasOwn = useStore((s) => (s.hasPlan && !s.isDemo) || s.ownPlan !== null);
  const name = useStore((s) => (s.isDemo ? s.ownPlan?.profile.about.name : s.profile.about.name));
  const loadDemo = useStore((s) => s.loadDemo);
  const switchToOwn = useStore((s) => s.switchToOwnPlan);
  const mine = name ? `${name}’s plan` : 'My plan';
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="tap flex h-9 w-full items-center gap-2 rounded-md border border-line bg-surface px-2.5 text-left text-[13px] font-medium text-evergreen transition-colors hover:bg-muted/60">
        <span className={`h-2 w-2 shrink-0 rounded-full ${isDemo ? 'bg-champagne' : 'bg-forest'}`} aria-hidden />
        <span className="min-w-0 flex-1 truncate">{isDemo ? 'Demo plan' : mine}</span>
        <ChevronsUpDown size={14} className="shrink-0 text-grey" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuLabel>Plan</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={isDemo ? 'demo' : 'mine'}
          onValueChange={(v) => {
            if (v === 'demo' && !isDemo) loadDemo();
            if (v === 'mine') hasOwn ? switchToOwn() : navigate('/start');
          }}
        >
          <DropdownMenuRadioItem value="mine">{hasOwn ? mine : 'Start my plan'}</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="demo">Demo (Riya, 26)</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => navigate('/start')}>Re-run guided setup</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** ⌘K / Ctrl+K: jump to a module or goal, or run an action. */
export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const navigate = useNavigate();
  const plan = usePlan();
  const { setTheme } = useTheme();
  const isDemo = useStore((s) => s.isDemo);
  const hasOwn = useStore((s) => s.ownPlan !== null);
  const loadDemo = useStore((s) => s.loadDemo);
  const switchToOwn = useStore((s) => s.switchToOwnPlan);
  const run = (fn: () => void) => {
    onOpenChange(false);
    fn();
  };
  const item = 'tap flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-charcoal aria-selected:bg-muted aria-selected:text-evergreen';
  const group = 'px-1 py-1 text-xs font-medium text-grey [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-2';
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent hideClose className="top-[18%] w-[min(94vw,580px)] translate-y-0 overflow-hidden rounded-[1.75rem] p-0">
        <DialogTitle className="sr-only">Search and actions</DialogTitle>
        <Command label="Search modules, goals and actions" loop>
          <div className="flex items-center gap-2 border-b border-line px-3">
            <Search size={16} className="text-grey" aria-hidden />
            <Command.Input autoFocus placeholder="Search modules, goals and actions…" className="h-12 w-full bg-transparent text-sm text-evergreen outline-none placeholder:text-grey" />
          </div>
          <Command.List className="max-h-[360px] overflow-y-auto p-1.5">
            <Command.Empty className="px-3 py-6 text-center text-sm text-grey">No matches.</Command.Empty>
            <Command.Group heading="Actions" className={group}>
              <Command.Item className={item} onSelect={() => run(() => navigate('/app/goals?new=1'))}><Plus size={15} aria-hidden /> Add goal</Command.Item>
              <Command.Item className={item} onSelect={() => run(() => navigate('/app/life-events?new=1'))}><CalendarRange size={15} aria-hidden /> Add life event</Command.Item>
              <Command.Item className={item} onSelect={() => run(() => navigate('/app/risk-lab?preset=crash'))}><FlaskConical size={15} aria-hidden /> Run stress test: 2008-style crash</Command.Item>
              <Command.Item className={item} onSelect={() => run(() => exportSummary(plan))}><Download size={15} aria-hidden /> Export summary</Command.Item>
              {isDemo && hasOwn && <Command.Item className={item} onSelect={() => run(switchToOwn)}><ArrowRightLeft size={15} aria-hidden /> Switch to my plan</Command.Item>}
              {!isDemo && <Command.Item className={item} onSelect={() => run(loadDemo)}><ArrowRightLeft size={15} aria-hidden /> Open the demo plan</Command.Item>}
            </Command.Group>
            <Command.Group heading="Modules" className={group}>
              {APP_NAV.flatMap((g) => g.items).map(({ to, label, icon: Icon }) => (
                <Command.Item key={to} value={`module ${label}`} className={item} onSelect={() => run(() => navigate(to))}>
                  <Icon size={15} aria-hidden /> {label}
                </Command.Item>
              ))}
            </Command.Group>
            {plan.profile.goals.length > 0 && (
              <Command.Group heading="Goals" className={group}>
                {plan.goalViews.map((v) => (
                  <Command.Item key={v.goal.id} value={`goal ${v.goal.name} ${v.goal.targetYear}`} className={item} onSelect={() => run(() => navigate(`/app/goals#goal-${v.goal.id}`))}>
                    {v.goal.name} <span className="ml-auto text-xs text-grey">{v.goal.targetYear}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}
            <Command.Group heading="Theme" className={group}>
              {(['light', 'dark', 'system'] as const).map((t) => {
                const I = THEME_ICON[t];
                return (
                  <Command.Item key={t} value={`theme ${t}`} className={item} onSelect={() => run(() => setTheme(t))}>
                    <I size={15} aria-hidden /> {t === 'system' ? 'Use system theme' : t === 'light' ? 'Light theme' : 'Dark theme'}
                  </Command.Item>
                );
              })}
            </Command.Group>
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

/** Opens the palette on ⌘K / Ctrl+K. */
export function useCommandShortcut(): [boolean, (o: boolean) => void] {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  return [open, setOpen];
}
