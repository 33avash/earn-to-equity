// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { axe } from 'vitest-axe';
import { App } from '@/App';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { useStore } from '@/state/store';

/*
 * Every route rendered in jsdom, in light and dark, checked with axe-core.
 * Colour contrast is checked separately in contrast.test.ts (jsdom has no layout, so axe can't measure it).
 */

beforeAll(() => {
  window.matchMedia = vi.fn().mockImplementation((q: string) => ({ matches: false, media: q, addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn(), onchange: null, dispatchEvent: vi.fn() }));
  class Observer {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  }
  Object.assign(window, { ResizeObserver: Observer, IntersectionObserver: Observer });
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
  Element.prototype.scrollIntoView = vi.fn();
  useStore.getState().loadDemo();
});

afterEach(cleanup);

const ROUTES = [
  '/',
  '/how-it-works',
  '/features',
  '/tools',
  '/learn',
  '/legal',
  '/about',
  '/sources',
  '/faq',
  '/start',
  '/start/detailed',
  '/app',
  '/app/plan',
  '/app/offers',
  '/app/health',
  '/app/budget',
  '/app/emergency-debt',
  '/app/goals',
  '/app/portfolio',
  '/app/sip',
  '/app/simulator',
  '/app/life-events',
  '/app/risk-lab',
  '/app/fi',
  '/app/coach',
  '/app/news',
  '/app/learn',
  '/app/learn/tax-awareness',
  '/app/settings',
];

describe.each(['light', 'dark'])('%s theme', (theme) => {
  it.each(ROUTES)('%s has no axe violations', async (path) => {
    localStorage.setItem('e2e:theme', theme);
    const { container } = render(
      <ThemeProvider>
        <MemoryRouter initialEntries={[path]}>
          <App />
        </MemoryRouter>
      </ThemeProvider>,
    );
    // Lazy routes: wait for the page heading.
    await screen.findAllByRole('heading', { level: 1 }, { timeout: 8000 });
    expect(document.documentElement.classList.contains('dark')).toBe(theme === 'dark');
    const results = await axe(container, { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } });
    expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(' | ')}`)).toEqual([]);
  }, 20000);
});

describe('coach side panel', () => {
  it('opens over a planner screen with no axe violations', async () => {
    localStorage.setItem('e2e:theme', 'light');
    useStore.getState().setCoachOpen(true);
    render(
      <ThemeProvider>
        <MemoryRouter initialEntries={['/app/goals']}>
          <App />
        </MemoryRouter>
      </ThemeProvider>,
    );
    const dialog = await screen.findByRole('dialog', { name: 'Coach' }, { timeout: 8000 });
    expect(await screen.findByLabelText('Ask the coach')).toBeTruthy();
    // Page-aware suggestions: on Goals, the first one is about goals.
    expect(dialog.textContent).toMatch(/short\?|behind my financial goal/);
    const results = await axe(dialog, { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } });
    expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(' | ')}`)).toEqual([]);
    useStore.getState().setCoachOpen(false);
  }, 20000);
});

describe('Fix my plan sheet', () => {
  it.each(['light', 'dark'])('opens on Overview with the demo’s fixes and no axe violations (%s)', async (theme) => {
    localStorage.setItem('e2e:theme', theme);
    useStore.getState().loadDemo();
    useStore.getState().setFixOpen(true);
    render(
      <ThemeProvider>
        <MemoryRouter initialEntries={['/app']}>
          <App />
        </MemoryRouter>
      </ThemeProvider>,
    );
    const dialog = await screen.findByRole('dialog', { name: 'Fix my plan' }, { timeout: 8000 });
    await screen.findByRole('button', { name: 'Apply to my plan' }, { timeout: 20000 });
    expect(dialog.textContent).toMatch(/Ask HR to put 14% of basic into NPS/);
    expect(dialog.textContent).toMatch(/Chance of FI by 55/);
    const results = await axe(dialog, { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } });
    expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(' | ')}`)).toEqual([]);
    useStore.getState().setFixOpen(false);
  }, 40000);
});
