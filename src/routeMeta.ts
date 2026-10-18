/** Document title and meta description for each route. Titles read "Page · Earn to Equity" except Home. */
export interface RouteMeta {
  title: string;
  description: string;
}

const SITE = 'Earn to Equity';

const META: Record<string, RouteMeta> = {
  '/': { title: `${SITE}: a 20-year plan for your salary`, description: 'Plan the next 20 years of your salary. Budget, goals, loans, investments and stress tests for salaried professionals in India, in one projection.' },
  '/how-it-works': { title: 'How it works', description: 'How Earn to Equity turns your salary, spending, goals and loans into one year-by-year projection, and the assumptions behind it.' },
  '/features': { title: 'Features', description: 'Fourteen planning tools that share one profile and one projection: budget, goals, portfolio, SIP, simulator, risk lab, FI and more.' },
  '/tools': { title: 'Financial tools', description: 'SIP, goal, emergency fund, debt payoff and financial independence calculators for India, built on the same projection engine.' },
  '/learn': { title: 'Learn', description: 'Short lessons on compounding, inflation, SIPs, asset allocation, debt, insurance and tax for salaried earners in India.' },
  '/legal': { title: 'Privacy, terms and disclaimers', description: 'Where your data is stored, the terms of use, and what Earn to Equity is not: a SEBI-registered adviser or a tax professional.' },
  '/about': { title: 'About', description: 'Who built Earn to Equity and why.' },
  '/start': { title: 'Build your plan', description: 'Eight short steps: income, spending, savings, loans, protection, goals and investments. About eight minutes.' },
  '/app': { title: 'Overview', description: 'Net worth, monthly surplus, goals and your 20-year projection.' },
  '/app/health': { title: 'Financial health', description: 'A score from six documented components: emergency fund, savings rate, debt, investing, goals and protection.' },
  '/app/budget': { title: 'Budget planner', description: 'Monthly income, spending, EMIs and transfers to savings and investments.' },
  '/app/emergency-debt': { title: 'Emergency fund & debt', description: 'Size your emergency reserve and compare avalanche and snowball repayment.' },
  '/app/goals': { title: 'Goals', description: 'Goals priced for the year you need them, and how your plan pays for each one.' },
  '/app/portfolio': { title: 'Portfolio', description: 'Target allocation, drift and rebalancing with new SIP money.' },
  '/app/sip': { title: 'SIP calculator', description: 'Monthly SIP growth with annual step-ups, in future and today’s rupees.' },
  '/app/simulator': { title: 'Wealth simulator', description: 'Year-by-year projection of income, spending, loans, goals and net worth, with scenarios.' },
  '/app/life-events': { title: 'Life events', description: 'Promotions, breaks, marriage, a home: see how each one moves your projection.' },
  '/app/risk-lab': { title: 'Risk lab', description: 'Stress-test your plan against slower raises, inflation, career breaks and market falls.' },
  '/app/fi': { title: 'Financial independence', description: 'When your investments could cover your living costs, and what would bring that date closer.' },
  '/app/coach': { title: 'Coach', description: 'Ask questions about your plan. Answers use figures from your own projection.' },
  '/app/learn': { title: 'Learning centre', description: 'Lessons and quizzes on the ideas behind your plan.' },
  '/app/settings': { title: 'Settings', description: 'Profile, assumptions, display and data.' },
};

const NOT_FOUND: RouteMeta = { title: 'Page not found', description: 'This page doesn’t exist.' };

export function routeMeta(pathname: string): RouteMeta {
  const path = pathname.replace(/\/+$/, '') || '/';
  if (META[path]) return META[path];
  if (path.startsWith('/app/learn/')) return { title: 'Lesson', description: META['/app/learn'].description };
  return NOT_FOUND;
}

export function documentTitle(meta: RouteMeta, pathname: string): string {
  return pathname === '/' ? meta.title : `${meta.title} · ${SITE}`;
}
