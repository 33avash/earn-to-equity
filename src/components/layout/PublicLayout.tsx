import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { Wordmark } from './Wordmark';
import { ThemeToggle } from './ShellControls';
import { ButtonLink } from '@/components/ui/Button';
import { useExploreDemo } from '@/state/useDemo';

const NAV = [
  { to: '/how-it-works', label: 'How it works' },
  { to: '/features', label: 'Features' },
  { to: '/tools', label: 'Calculators' },
  { to: '/learn', label: 'Learn' },
];

/** Sticky nav: transparent at the top, then a compact frosted bar once the page scrolls. */
export function PublicNav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const loc = useLocation();
  useEffect(() => setOpen(false), [loc.pathname]);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <header className={`sticky top-0 z-40 border-b transition-[background-color,border-color] duration-300 ${scrolled || open ? 'border-line bg-ivory/80 backdrop-blur-md' : 'border-transparent bg-transparent'}`}>
      <div className={`container-x flex items-center justify-between gap-6 transition-[height] duration-300 ${scrolled ? 'h-14' : 'h-16'}`}>
        <Wordmark />
        <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} className={({ isActive }) => `tap inline-flex items-center rounded-md px-3 text-[14px] transition-colors ${isActive ? 'font-medium text-evergreen' : 'text-grey hover:text-evergreen'}`}>
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          <ButtonLink to="/start" size="sm" className="hidden lg:inline-flex">
            Build your plan
          </ButtonLink>
          <button type="button" className="hit inline-flex h-9 w-9 items-center justify-center rounded-md text-evergreen lg:hidden" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>
      {open && (
        <nav aria-label="Mobile" className="border-t border-line bg-ivory lg:hidden">
          <div className="container-x flex flex-col py-3">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} className="border-b border-line py-3 text-[15px] text-charcoal">
                {n.label}
              </NavLink>
            ))}
            <ButtonLink to="/start" className="mt-4">
              Build your plan
            </ButtonLink>
          </div>
        </nav>
      )}
    </header>
  );
}

export function Footer() {
  const explore = useExploreDemo();
  return (
    <footer className="border-t border-line bg-ivory">
      <div className="container-x grid gap-10 py-14 md:grid-cols-12">
        <div className="md:col-span-5">
          <Wordmark />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-grey">A 20-year financial plan for salaried professionals in India. Free, and your plan is saved only in your browser.</p>
          <p className="mt-6 text-xs text-grey">Built by Atulya Singh, Avash Srivastava, Aayushi Paul and Agustyae Gupta.</p>
        </div>
        <div className="grid grid-cols-2 gap-8 text-sm sm:grid-cols-3 md:col-span-7">
          <div>
            <p className="eyebrow mb-3">Product</p>
            <ul className="space-y-2">
              <li><Link className="hit text-charcoal hover:text-forest" to="/features">Features</Link></li>
              <li><Link className="hit text-charcoal hover:text-forest" to="/tools">Calculators</Link></li>
              <li>
                <button type="button" className="hit text-charcoal hover:text-forest" onClick={() => explore('/app')}>
                  Demo plan
                </button>
              </li>
            </ul>
          </div>
          <div>
            <p className="eyebrow mb-3">Company</p>
            <ul className="space-y-2">
              <li><Link className="hit text-charcoal hover:text-forest" to="/about">About</Link></li>
              <li><Link className="hit text-charcoal hover:text-forest" to="/learn">Learning</Link></li>
            </ul>
          </div>
          <div>
            <p className="eyebrow mb-3">Legal</p>
            <ul className="space-y-2">
              <li><Link className="hit text-charcoal hover:text-forest" to="/legal#privacy">Privacy</Link></li>
              <li><Link className="hit text-charcoal hover:text-forest" to="/legal#terms">Terms</Link></li>
              <li><Link className="hit text-charcoal hover:text-forest" to="/legal#disclaimers">Disclaimers</Link></li>
            </ul>
          </div>
        </div>
      </div>
      <div className="border-t border-line">
        <p className="container-x py-5 text-xs leading-relaxed text-grey">
          Earn to Equity is an educational tool, not a SEBI-registered investment adviser. Projections are estimates from assumptions you can change, not guarantees of future returns.
        </p>
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
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-evergreen focus:px-3 focus:py-2 focus:text-onbrand">
        Skip to content
      </a>
      <PublicNav />
      <main id="main" className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
