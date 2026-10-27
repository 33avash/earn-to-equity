import { DISCLAIMER_SHORT } from '@/pages/public/Legal';
import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { ArrowRight, Search } from 'lucide-react';
import { Atmosphere } from '@/components/motion/Motion';
import { Wordmark } from './Wordmark';
import { CommandPalette, ThemeToggle, useCommandShortcut } from './ShellControls';
import { ButtonLink } from '@/components/ui/Button';
import { useExploreDemo } from '@/state/useDemo';

const NAV = [
  { to: '/how-it-works', label: 'How it works' },
  { to: '/features', label: 'Features' },
  { to: '/tools', label: 'Calculators' },
  { to: '/learn', label: 'Learn' },
];

/**
 * Floating island nav: a glass pill detached from the top edge. On small screens the two-line
 * hamburger morphs into an X and opens a full-screen frosted menu whose links rise in one by one.
 */
export function PublicNav() {
  const [open, setOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useCommandShortcut();
  const loc = useLocation();
  useEffect(() => setOpen(false), [loc.pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [open]);
  const line = 'absolute left-1/2 top-[calc(50%-0.5px)] h-px w-[18px] -translate-x-1/2 bg-evergreen transition-transform duration-700 ease-spring';
  return (
    <>
      <header className="pointer-events-none fixed inset-x-0 top-0 z-40 flex justify-center px-4 pt-4 sm:pt-6">
        <div className="glass pointer-events-auto flex w-full max-w-[920px] items-center justify-between gap-3 !rounded-full py-1.5 pl-4 pr-1.5 lg:w-max lg:gap-10">
          <Wordmark />
          <nav aria-label="Main" className="hidden items-center gap-0.5 lg:flex">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                className={({ isActive }) => `tap inline-flex h-9 items-center rounded-full px-4 text-[13.5px] transition-colors duration-300 ${isActive ? 'bg-muted font-medium text-evergreen' : 'text-grey hover:text-evergreen'}`}
              >
                {n.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              aria-label="Search pages, lessons and terms"
              className="tap inline-flex h-9 items-center gap-2 rounded-full px-2.5 text-[13px] text-grey transition-colors hover:bg-muted hover:text-evergreen"
            >
              <Search size={16} aria-hidden />
              <kbd className="num hidden rounded-md border border-line bg-muted px-1.5 py-px text-[11px] xl:inline">⌘K</kbd>
            </button>
            <ThemeToggle />
            <ButtonLink to="/start" size="sm" className="hidden lg:inline-flex">
              Build your plan <ArrowRight size={14} aria-hidden />
            </ButtonLink>
            <button
              type="button"
              className="tap relative inline-flex h-10 w-10 items-center justify-center rounded-full text-evergreen transition-colors hover:bg-muted lg:hidden"
              aria-label={open ? 'Close menu' : 'Open menu'}
              aria-expanded={open}
              aria-controls="mobile-menu"
              onClick={() => setOpen((o) => !o)}
            >
              <span aria-hidden className={`${line} ${open ? 'translate-y-0 rotate-45' : '-translate-y-[3.5px]'}`} />
              <span aria-hidden className={`${line} ${open ? 'translate-y-0 -rotate-45' : 'translate-y-[3.5px]'}`} />
            </button>
          </div>
        </div>
      </header>

      <div
        id="mobile-menu"
        {...(open ? {} : { inert: '' })}
        className={`fixed inset-0 z-30 bg-ivory/80 backdrop-blur-3xl transition-[opacity,visibility] duration-700 ease-spring lg:hidden ${open ? 'visible opacity-100' : 'invisible opacity-0'}`}
      >
        <nav aria-label="Mobile" className="flex min-h-[100dvh] flex-col justify-between px-6 pb-10 pt-32">
          <ul className="flex flex-col gap-2">
            {NAV.map((n, i) => (
              <li key={n.to} className="overflow-hidden">
                <NavLink
                  to={n.to}
                  style={{ transitionDelay: open ? `${100 + i * 60}ms` : '0ms' }}
                  className={`block py-2 text-[40px] font-semibold leading-tight tracking-[-0.04em] text-evergreen transition-[transform,opacity] duration-700 ease-spring ${open ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'}`}
                >
                  {n.label}
                </NavLink>
              </li>
            ))}
          </ul>
          <div style={{ transitionDelay: open ? '360ms' : '0ms' }} className={`transition-[transform,opacity] duration-700 ease-spring ${open ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'}`}>
            <ButtonLink to="/start" size="lg" className="w-full">
              Build your plan <ArrowRight size={16} aria-hidden />
            </ButtonLink>
          </div>
        </nav>
      </div>
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} mode="public" />
    </>
  );
}

const footLink = 'hit text-charcoal transition-colors hover:text-forest';

export function Footer() {
  const explore = useExploreDemo();
  return (
    <footer className="px-4 pb-4 pt-24 sm:px-6 sm:pb-6 lg:pt-32">
      <div className="bezel relative mx-auto max-w-content overflow-hidden">
        <div className="relative grid gap-14 px-6 pb-10 pt-14 sm:px-10 lg:grid-cols-12 lg:px-14 lg:pt-20">
          <div className="lg:col-span-5">
            <Wordmark />
            <p className="mt-6 max-w-sm text-sm leading-relaxed text-grey">A 20-year financial plan for salaried professionals in India. Free, and your plan is saved only in your browser.</p>
            <p className="mt-8 text-xs text-grey">Built by Atulya Singh, Avash Srivastava, Aayushi Paul and Agustyae Gupta.</p>
          </div>
          <div className="grid grid-cols-2 gap-10 text-sm sm:grid-cols-3 lg:col-span-7">
            <div>
              <p className="eyebrow mb-4">Product</p>
              <ul className="space-y-3">
                <li><Link className={footLink} to="/features">Features</Link></li>
                <li><Link className={footLink} to="/tools">Calculators</Link></li>
                <li>
                  <button type="button" className={footLink} onClick={() => explore('/app')}>
                    Demo plan
                  </button>
                </li>
              </ul>
            </div>
            <div>
              <p className="eyebrow mb-4">Company</p>
              <ul className="space-y-3">
                <li><Link className={footLink} to="/about">About</Link></li>
                <li><Link className={footLink} to="/learn">Learning</Link></li>
              </ul>
            </div>
            <div>
              <p className="eyebrow mb-4">Legal</p>
              <ul className="space-y-3">
                <li><Link className={footLink} to="/legal#privacy">Privacy</Link></li>
                <li><Link className={footLink} to="/legal#terms">Terms</Link></li>
                <li><Link className={footLink} to="/legal#disclaimers">Disclaimers</Link></li>
              </ul>
            </div>
          </div>
        </div>
        <p aria-hidden className="pointer-events-none select-none whitespace-nowrap px-4 text-center text-[15vw] font-semibold leading-[0.85] tracking-[-0.06em] text-evergreen/[0.05] lg:text-[184px]">
          earn<span className="mx-[0.12em] font-light">to</span>equity
        </p>
        <div className="relative border-t border-line/70">
          <p className="px-6 py-6 text-xs leading-relaxed text-grey sm:px-10 lg:px-14">
            {DISCLAIMER_SHORT}
          </p>
        </div>
      </div>
    </footer>
  );
}

export function PublicLayout() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView();
    else window.scrollTo(0, 0);
  }, [pathname, hash]);
  return (
    <div className="relative isolate flex min-h-[100dvh] flex-col">
      <Atmosphere />
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-evergreen focus:px-3 focus:py-2 focus:text-onbrand">
        Skip to content
      </a>
      <PublicNav />
      <main id="main" className="flex-1 pt-24 sm:pt-28">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
