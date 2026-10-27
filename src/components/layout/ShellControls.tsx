import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Command } from 'cmdk';
import { motion, useReducedMotion } from 'motion/react';
import { ChevronsUpDown, Monitor, Moon, Search, Sun, Plus, FlaskConical, CalendarRange, Download, ArrowRightLeft, Home, Compass, LayoutGrid, Calculator, GraduationCap, Info, BookOpen, Hash, Gauge, Target, Sparkles, MessageSquareText } from 'lucide-react';
import { useTheme, type ThemePref } from '@/theme/ThemeProvider';
import { useStore } from '@/state/store';
import { useMoney, usePlan } from '@/state/selectors';
import { useExploreDemo } from '@/state/useDemo';
import { exportSummary } from '@/services/export';
import { MODULES } from '@/features/learn/modules';
import { GLOSSARY } from '@/components/ui/definitions';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/shadcn/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/shadcn/menu';
import { ALL_APP_PAGES } from './nav';

const THEME_ICON = { light: Sun, dark: Moon, system: Monitor };

/** The palette's highlighted value, so each item can draw the gliding highlight behind itself. */
const SelectedCtx = createContext('');

function Item({ value, onSelect, children }: { value: string; onSelect: () => void; children: ReactNode }) {
  const selected = useContext(SelectedCtx);
  const reduce = useReducedMotion();
  return (
    <Command.Item value={value} onSelect={onSelect} className="tap relative flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-charcoal aria-selected:text-evergreen">
      {selected.toLowerCase() === value.toLowerCase() && (
        <motion.span layoutId={reduce ? undefined : 'cmdk-highlight'} className="absolute inset-0 rounded-xl bg-muted shadow-[0_0_0_1px_var(--frame-line),var(--edge-highlight)]" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />
      )}
      <span className="relative flex w-full min-w-0 items-center gap-2.5">{children}</span>
    </Command.Item>
  );
}

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
        <DropdownMenuItem onSelect={() => navigate('/start/detailed')}>Detailed setup</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const PUBLIC_PAGES = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/how-it-works', label: 'How it works', icon: Compass },
  { to: '/features', label: 'Features', icon: LayoutGrid },
  { to: '/tools', label: 'Calculators', icon: Calculator },
  { to: '/learn', label: 'Learn', icon: GraduationCap },
  { to: '/about', label: 'About', icon: Info },
];

/**
 * ⌘K / Ctrl+K. On the public site it searches pages, lessons and terms; in the planner it adds actions,
 * your goals and your own figures. A highlight glides between results as you move.
 */
export function CommandPalette({ open, onOpenChange, mode = 'app' }: { open: boolean; onOpenChange: (o: boolean) => void; mode?: 'app' | 'public' }) {
  const navigate = useNavigate();
  const explore = useExploreDemo();
  const { setTheme } = useTheme();
  const isDemo = useStore((s) => s.isDemo);
  const hasOwn = useStore((s) => s.ownPlan !== null);
  const loadDemo = useStore((s) => s.loadDemo);
  const switchToOwn = useStore((s) => s.switchToOwnPlan);
  const setCoachOpen = useStore((s) => s.setCoachOpen);
  const money = useMoney();
  const [selected, setSelected] = useState('');
  const app = mode === 'app';
  const run = (fn: () => void) => {
    onOpenChange(false);
    fn();
  };
  const go = (to: string) => run(() => (to.startsWith('/app') && !app ? explore(to, true) : navigate(to)));
  const group = 'px-1 py-1 text-xs font-medium text-grey [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-2';
  const term = GLOSSARY.find((g) => `term ${g.term}`.toLowerCase() === selected.toLowerCase());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent hideClose className="frame-glass top-[16%] w-[min(94vw,620px)] translate-y-0 overflow-hidden !rounded-[1.75rem] p-0">
        <DialogTitle className="sr-only">Search and actions</DialogTitle>
        <SelectedCtx.Provider value={selected}>
        <Command label="Search pages, lessons, terms and actions" loop value={selected} onValueChange={setSelected}>
          <div className="flex items-center gap-2 border-b border-line px-4">
            <Search size={16} className="text-grey" aria-hidden />
            <Command.Input autoFocus placeholder={app ? 'Search modules, goals, terms…' : 'Search pages, lessons, terms…'} className="h-14 w-full bg-transparent text-[15px] text-evergreen outline-none placeholder:text-grey" />
            <kbd className="num hidden rounded-md border border-line bg-muted px-1.5 py-px text-[11px] text-grey sm:inline">esc</kbd>
          </div>
          <Command.List className="max-h-[min(56vh,420px)] overflow-y-auto p-1.5">
            <Command.Empty className="px-3 py-8 text-center text-sm text-grey">No matches.</Command.Empty>
            {app && (
              <Command.Group heading="Your numbers" className={group}>
                <NumbersItems go={go} money={money} />
              </Command.Group>
            )}
            {app && (
              <Command.Group heading="Actions" className={group}>
                <Item value="action add goal" onSelect={() => go('/app/goals?new=1')}><Plus size={15} aria-hidden /> Add goal</Item>
                <Item value="action add life event" onSelect={() => go('/app/life-events?new=1')}><CalendarRange size={15} aria-hidden /> Add life event</Item>
                <Item value="action ask the coach" onSelect={() => run(() => setCoachOpen(true))}><MessageSquareText size={15} aria-hidden /> Ask the coach</Item>
                <Item value="action stress test crash" onSelect={() => go('/app/risk-lab?preset=crash')}><FlaskConical size={15} aria-hidden /> Run stress test: 2008-style crash</Item>
                <ExportItem run={run} />
                {isDemo && hasOwn && <Item value="action switch to my plan" onSelect={() => run(switchToOwn)}><ArrowRightLeft size={15} aria-hidden /> Switch to my plan</Item>}
                {!isDemo && <Item value="action open demo plan" onSelect={() => run(loadDemo)}><ArrowRightLeft size={15} aria-hidden /> Open the demo plan</Item>}
              </Command.Group>
            )}
            {!app && (
              <Command.Group heading="Get started" className={group}>
                <Item value="start build your plan" onSelect={() => go('/start')}><Sparkles size={15} aria-hidden /> Build your plan</Item>
                <Item value="start see the demo plan" onSelect={() => run(() => explore('/app'))}><ArrowRightLeft size={15} aria-hidden /> See the demo plan</Item>
              </Command.Group>
            )}
            <Command.Group heading={app ? 'Modules' : 'Pages'} className={group}>
              {(app ? ALL_APP_PAGES : PUBLIC_PAGES).map(({ to, label, icon: Icon }) => (
                <Item key={to} value={`page ${label}`} onSelect={() => go(to)}>
                  <Icon size={15} aria-hidden /> {label}
                </Item>
              ))}
            </Command.Group>
            {app && <GoalItems go={go} />}
            <Command.Group heading="Lessons" className={group}>
              {MODULES.map((m) => (
                <Item key={m.id} value={`lesson ${m.title}`} onSelect={() => go(`/app/learn/${m.id}`)}>
                  <BookOpen size={15} aria-hidden /> {m.title}
                  <span className="ml-auto shrink-0 text-xs text-grey">{m.minutes} min</span>
                </Item>
              ))}
            </Command.Group>
            <Command.Group heading="Glossary" className={group}>
              {GLOSSARY.map((g) => (
                <Item key={g.term} value={`term ${g.term}`} onSelect={() => go(g.to)}>
                  <Hash size={15} aria-hidden /> {g.term}
                </Item>
              ))}
            </Command.Group>
            <Command.Group heading="Theme" className={group}>
              {(['light', 'dark', 'system'] as const).map((t) => {
                const I = THEME_ICON[t];
                return (
                  <Item key={t} value={`theme ${t}`} onSelect={() => run(() => setTheme(t))}>
                    <I size={15} aria-hidden /> {t === 'system' ? 'Use system theme' : t === 'light' ? 'Light theme' : 'Dark theme'}
                  </Item>
                );
              })}
            </Command.Group>
          </Command.List>
          <div className="flex min-h-[52px] items-center gap-3 border-t border-line px-4 py-3 text-[12px] text-grey">
            {term ? (
              <p className="leading-relaxed">
                <span className="font-medium text-evergreen">{term.term}:</span> {term.def}
              </p>
            ) : (
              <p className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <span><kbd className="num rounded border border-line bg-muted px-1">↑↓</kbd> move</span>
                <span><kbd className="num rounded border border-line bg-muted px-1">↵</kbd> open</span>
                <span><kbd className="num rounded border border-line bg-muted px-1">⌘K</kbd> toggle</span>
              </p>
            )}
          </div>
        </Command>
        </SelectedCtx.Provider>
      </DialogContent>
    </Dialog>
  );
}

/** Live figures from the current plan; selecting one opens the screen it comes from. */
function NumbersItems({ go, money }: { go: (to: string) => void; money: (v: number) => string }) {
  const plan = usePlan();
  const rows = [
    { label: 'Net worth today', value: money(plan.sheet.netWorth), to: '/app' },
    { label: 'Left after bills', value: money(plan.cashflow.investableSurplus), to: '/app/budget' },
    { label: 'Plan score', value: `${Math.round(plan.health.score)} / 100`, to: '/app/health' },
    { label: 'Financial independence', value: plan.fi.fiAge ? `age ${plan.fi.fiAge}` : 'beyond the plan', to: '/app/fi' },
    { label: `Net worth in ${plan.headline.year}`, value: money(plan.headline.netWorthReal), to: '/app/simulator' },
  ];
  return (
    <>
      {rows.map((r) => (
        <Item key={r.label} value={`number ${r.label}`} onSelect={() => go(r.to)}>
          <Gauge size={15} aria-hidden /> {r.label}
          <span className="num ml-auto shrink-0 text-xs text-evergreen">{r.value}</span>
        </Item>
      ))}
    </>
  );
}

function GoalItems({ go }: { go: (to: string) => void }) {
  const plan = usePlan();
  if (plan.profile.goals.length === 0) return null;
  return (
    <Command.Group heading="Goals" className="px-1 py-1 text-xs font-medium text-grey [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-2">
      {plan.goalViews.map((v) => (
        <Item key={v.goal.id} value={`goal ${v.goal.name} ${v.goal.targetYear}`} onSelect={() => go(`/app/goals#goal-${v.goal.id}`)}>
          <Target size={15} aria-hidden /> {v.goal.name} <span className="ml-auto text-xs text-grey">{v.goal.targetYear}</span>
        </Item>
      ))}
    </Command.Group>
  );
}

function ExportItem({ run }: { run: (fn: () => void) => void }) {
  const plan = usePlan();
  return (
    <Item value="action export summary" onSelect={() => run(() => exportSummary(plan))}>
      <Download size={15} aria-hidden /> Export summary
    </Item>
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
