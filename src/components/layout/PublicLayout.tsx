import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { Wordmark } from './Wordmark';
import { Button, ButtonLink } from '@/components/ui/Button';
import { useExploreDemo } from '@/state/useDemo';

const NAV = [
  { to: '/how-it-works', label: 'How It Works' },
  { to: '/features', label: 'Features' },
  { to: '/tools', label: 'Financial Tools' },
  { to: '/learn', label: 'Learn' },
];

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
  // Transparent over the hero; becomes a thin glass bar once the page scrolls.
  return (
    <header
      className={`sticky top-0 z-40 border-b transition-[background-color,border-color,backdrop-filter] duration-300 ${
        scrolled || open ? 'border-line/60 bg-ivory/70 backdrop-blur-xl backdrop-saturate-150' : 'border-transparent bg-transparent'
      }`}
    >
      <div className="container-x flex h-16 items-center justify-between gap-6">
        <Wordmark />
        <nav aria-label="Main" className="hidden items-center gap-7 lg:flex">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} className={({ isActive }) => `relative py-1 text-[14px] transition-colors after:absolute after:inset-x-0 after:-bottom-0.5 after:h-px after:origin-left after:bg-champagne after:transition-transform after:duration-300 ${isActive ? 'text-evergreen font-medium after:scale-x-100' : 'text-grey hover:text-evergreen after:scale-x-0 hover:after:scale-x-100'}`}>
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="hidden items-center gap-5 lg:flex">
          <NavLink to="/sign-in" className="text-[14px] text-grey hover:text-evergreen">
            Sign In
          </NavLink>
          <ButtonLink to="/start" size="md">
            Build My Wealth Plan
          </ButtonLink>
        </div>
        <button type="button" className="rounded p-2 text-evergreen lg:hidden" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>
      {open && (
        <nav aria-label="Mobile" className="border-t border-line bg-ivory lg:hidden">
          <div className="container-x flex flex-col py-3">
            {[...NAV, { to: '/sign-in', label: 'Sign In' }].map((n) => (
              <NavLink key={n.to} to={n.to} className="border-b border-line/60 py-3 text-[15px] text-charcoal">
                {n.label}
              </NavLink>
            ))}
            <ButtonLink to="/start" className="mt-4">
              Build My Wealth Plan
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
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-grey">From your first paycheck to your future wealth. An educational planning prototype for young Indian earners.</p>
          <p className="mt-6 text-xs text-grey">Built by Atulya Singh, Avash Srivastava, Aayushi Paul and Agustyae Gupta.</p>
        </div>
        <div className="grid grid-cols-2 gap-8 text-sm sm:grid-cols-3 md:col-span-7">
          <div>
            <p className="eyebrow mb-3">Product</p>
            <ul className="space-y-2">
              <li><Link className="text-charcoal hover:text-forest" to="/features">Features</Link></li>
              <li><Link className="text-charcoal hover:text-forest" to="/tools">Financial Tools</Link></li>
              <li>
                <Button variant="ghost" size="sm" className="-ml-3 !h-auto !py-0 !text-sm !font-normal text-charcoal" onClick={() => explore('/app')}>
                  Explore the demo
                </Button>
              </li>
            </ul>
          </div>
          <div>
            <p className="eyebrow mb-3">Company</p>
            <ul className="space-y-2">
              <li><Link className="text-charcoal hover:text-forest" to="/about">About</Link></li>
              <li><Link className="text-charcoal hover:text-forest" to="/learn">Learning</Link></li>
            </ul>
          </div>
          <div>
            <p className="eyebrow mb-3">Legal</p>
            <ul className="space-y-2">
              <li><Link className="text-charcoal hover:text-forest" to="/legal#privacy">Privacy</Link></li>
              <li><Link className="text-charcoal hover:text-forest" to="/legal#terms">Terms</Link></li>
              <li><Link className="text-charcoal hover:text-forest" to="/legal#disclaimers">Disclaimers</Link></li>
            </ul>
          </div>
        </div>
      </div>
      <div className="border-t border-line">
        <p className="container-x py-5 text-xs leading-relaxed text-grey">
          Earn to Equity is an educational tool, not a SEBI-registered investment adviser. Projections are illustrative estimates based on assumptions you can change, and are not guarantees of future returns. Your data stays in this browser.
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
