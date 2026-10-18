import { Suspense, lazy, useEffect, useLayoutEffect, type ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { AppShell, NotFound } from '@/components/layout/AppShell';
import { Toaster } from '@/components/ui/Misc';
import { ConfirmHost } from '@/components/ui/Confirm';
import { useStore } from '@/state/store';
import Home from '@/pages/public/Home';
import { documentTitle, routeMeta } from '@/routeMeta';

const HowItWorks = lazy(() => import('@/pages/public/HowItWorks'));
const Features = lazy(() => import('@/pages/public/Features'));
const Tools = lazy(() => import('@/pages/public/Tools'));
const LearnPublic = lazy(() => import('@/pages/public/LearnPublic'));
const Legal = lazy(() => import('@/pages/public/Legal'));
const About = lazy(() => import('@/pages/public/About'));
const Onboarding = lazy(() => import('@/features/onboarding/Onboarding'));

const Overview = lazy(() => import('@/pages/app/Overview'));
const Health = lazy(() => import('@/pages/app/Health'));
const Budget = lazy(() => import('@/pages/app/Budget'));
const EmergencyDebt = lazy(() => import('@/pages/app/EmergencyDebt'));
const Goals = lazy(() => import('@/pages/app/Goals'));
const Portfolio = lazy(() => import('@/pages/app/Portfolio'));
const Sip = lazy(() => import('@/pages/app/Sip'));
const Simulator = lazy(() => import('@/pages/app/Simulator'));
const LifeEvents = lazy(() => import('@/pages/app/LifeEvents'));
const RiskLab = lazy(() => import('@/pages/app/RiskLab'));
const Fi = lazy(() => import('@/pages/app/Fi'));
const Coach = lazy(() => import('@/pages/app/Coach'));
const Learn = lazy(() => import('@/pages/app/Learn'));
const LearnModule = lazy(() => import('@/pages/app/LearnModule'));
const Settings = lazy(() => import('@/pages/app/Settings'));

function Loading() {
  return (
    <div role="status" aria-live="polite" className="container-x flex min-h-[40vh] flex-col gap-5 py-4">
      <span className="sr-only">Loading…</span>
      <div className="skeleton h-3 w-28" />
      <div className="skeleton h-10 w-2/3 max-w-md" />
      <div className="skeleton h-4 w-1/2 max-w-sm" />
      <div className="skeleton mt-6 h-64 w-full" />
    </div>
  );
}

const S = ({ children }: { children: ReactNode }) => <Suspense fallback={<Loading />}>{children}</Suspense>;

function useTheme() {
  const theme = useStore((s) => s.settings.theme);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && mq.matches);
      document.documentElement.classList.toggle('dark', dark);
    };
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [theme]);
}

/**
 * Sets the document title and meta description for the current route. A layout effect, so a page
 * that sets a more specific title in an ordinary effect (e.g. a lesson) runs after it and wins.
 */
function useRouteMeta() {
  const { pathname } = useLocation();
  useLayoutEffect(() => {
    const meta = routeMeta(pathname);
    document.title = documentTitle(meta, pathname);
    let tag = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!tag) {
      tag = document.createElement('meta');
      tag.name = 'description';
      document.head.appendChild(tag);
    }
    tag.content = meta.description;
  }, [pathname]);
}

export function App() {
  useTheme();
  useRouteMeta();
  return (
    <>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route index element={<Home />} />
          <Route path="how-it-works" element={<S><HowItWorks /></S>} />
          <Route path="features" element={<S><Features /></S>} />
          <Route path="tools" element={<S><Tools /></S>} />
          <Route path="learn" element={<S><LearnPublic /></S>} />
          {/* No accounts yet: keep old links working without a dead-end page. */}
          <Route path="sign-in" element={<Navigate to="/" replace />} />
          <Route path="legal" element={<S><Legal /></S>} />
          <Route path="about" element={<S><About /></S>} />
          <Route path="*" element={<NotFound />} />
        </Route>
        <Route path="start" element={<S><Onboarding /></S>} />
        <Route path="app" element={<AppShell />}>
          <Route index element={<S><Overview /></S>} />
          <Route path="health" element={<S><Health /></S>} />
          <Route path="budget" element={<S><Budget /></S>} />
          <Route path="emergency-debt" element={<S><EmergencyDebt /></S>} />
          <Route path="goals" element={<S><Goals /></S>} />
          <Route path="portfolio" element={<S><Portfolio /></S>} />
          <Route path="sip" element={<S><Sip /></S>} />
          <Route path="simulator" element={<S><Simulator /></S>} />
          <Route path="life-events" element={<S><LifeEvents /></S>} />
          <Route path="risk-lab" element={<S><RiskLab /></S>} />
          <Route path="fi" element={<S><Fi /></S>} />
          <Route path="coach" element={<S><Coach /></S>} />
          <Route path="learn" element={<S><Learn /></S>} />
          <Route path="learn/:id" element={<S><LearnModule /></S>} />
          <Route path="settings" element={<S><Settings /></S>} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
      <Toaster />
      <ConfirmHost />
    </>
  );
}
