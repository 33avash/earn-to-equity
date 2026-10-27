import type { Plan } from '@/state/selectors';

export const GENERAL_SUGGESTIONS = [
  'Can I afford a home in five years?',
  'Why am I behind my financial goal?',
  'What happens if my salary grows by only 5%?',
  'How much more should I save to reach my target?',
  'What if markets fall sharply in Year 4?',
  'Explain my projected wealth in simple terms.',
];

/** Questions that fit the screen the person is on, then general ones. Four at most. */
export function suggestionsFor(pathname: string, plan: Plan): string[] {
  const short = plan.goalViews.find((v) => v.status === 'unfunded');
  const page = pathname.replace(/\/+$/, '');
  const specific: Record<string, string[]> = {
    '/app': ['Explain my projected wealth in simple terms.', short ? `Why is ${short.goal.name} short?` : 'Why am I behind my financial goal?'],
    '/app/health': ['How much more should I save to reach my target?', 'What is emergency coverage?'],
    '/app/budget': ['Why is my savings rate what it is?', 'What is the 50/30/20 rule?'],
    '/app/emergency-debt': ['What is a good EMI-to-income ratio?', 'Should I pay off costly debt before investing?'],
    '/app/goals': [short ? `Why is ${short.goal.name} short?` : 'Why am I behind my financial goal?', 'Can I afford a home in five years?'],
    '/app/portfolio': ['What does asset allocation mean for me?', 'What is volatility?'],
    '/app/sip': ['What is a SIP step-up?', 'How much more should I save to reach my target?'],
    '/app/simulator': ['What happens if my salary grows by only 5%?', 'What does today’s rupees mean?'],
    '/app/life-events': ['Can I afford a home in five years?', 'Explain my projected wealth in simple terms.'],
    '/app/risk-lab': ['What if markets fall 30% in Year 4?', 'What happens if my salary grows by only 5%?'],
    '/app/fi': ['How much more should I save to reach my target?', 'What is an FI target?'],
  };
  const list = [...(specific[page] ?? []), ...GENERAL_SUGGESTIONS];
  return [...new Set(list)].slice(0, 4);
}
