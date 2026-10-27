import type { NewsTopic } from '@/services/news/types';

/** Each topic's label and the planner screen a reader would open next, so a headline leads somewhere useful. */
export const TOPICS: Record<NewsTopic, { label: string; to: string; action: string }> = {
  markets: { label: 'Markets', to: '/app/portfolio', action: 'Check your allocation' },
  rates: { label: 'Rates & loans', to: '/app/emergency-debt', action: 'Review your loans and EMIs' },
  tax: { label: 'Tax', to: '/app/budget', action: 'See your take-home pay' },
  investing: { label: 'Investing', to: '/app/sip', action: 'Review your SIPs' },
  property: { label: 'Property', to: '/app/life-events', action: 'Plan a home purchase' },
  global: { label: 'Global', to: '/app/risk-lab', action: 'Stress-test your plan' },
};

export const TOPIC_ORDER: NewsTopic[] = ['markets', 'rates', 'tax', 'investing', 'property', 'global'];

const IST = { timeZone: 'Asia/Kolkata' } as const;

/** True when the timestamp falls on today's date in India. */
export function isTodayIst(iso: string, now = new Date()): boolean {
  return new Date(iso).toLocaleDateString('en-CA', IST) === now.toLocaleDateString('en-CA', IST);
}

export function timeAgo(iso: string, now = Date.now()): string {
  const min = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000));
  if (min < 1) return 'just now';
  if (min < 60) return `${min} min ago`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} h ago`;
  return new Date(iso).toLocaleDateString('en-IN', { ...IST, day: 'numeric', month: 'short' });
}
