import type { NewsFeedResponse, NewsItem } from './types';

/**
 * Indian headlines come from /api/news on the dev and preview servers, or from the Cloudflare Worker's /news
 * route on the hosted site (VITE_NEWS_API_URL, or next to VITE_COACH_API_URL). Global headlines come straight
 * from Finnhub with the reader's own free key, which is kept in this browser only.
 */
const COACH_URL = import.meta.env.VITE_COACH_API_URL;
export const NEWS_ENDPOINT = import.meta.env.VITE_NEWS_API_URL || (COACH_URL ? `${COACH_URL.replace(/\/+$/, '')}/news` : '/api/news');

export const FINNHUB_SIGNUP_URL = 'https://finnhub.io/register';
const FINNHUB_KEY = 'e2e:finnhub-key';

export function getFinnhubKey(): string {
  try {
    return localStorage.getItem(FINNHUB_KEY) ?? '';
  } catch {
    return '';
  }
}

export function setFinnhubKey(key: string): void {
  try {
    if (key) localStorage.setItem(FINNHUB_KEY, key);
    else localStorage.removeItem(FINNHUB_KEY);
  } catch {
    // Storage blocked (private window): the key lasts for this visit only.
  }
}

export async function fetchIndianNews(signal?: AbortSignal): Promise<NewsFeedResponse> {
  const r = await fetch(NEWS_ENDPOINT, { signal });
  if (!r.ok || !r.headers.get('content-type')?.includes('json')) throw new Error(`news-${r.status}`);
  return (await r.json()) as NewsFeedResponse;
}

export class FinnhubKeyError extends Error {}

interface FinnhubArticle {
  id: number;
  headline: string;
  summary: string;
  url: string;
  source: string;
  datetime: number;
}

export async function fetchGlobalNews(key: string, signal?: AbortSignal): Promise<NewsItem[]> {
  const r = await fetch(`https://finnhub.io/api/v1/news?category=general&token=${encodeURIComponent(key)}`, { signal });
  if (r.status === 401 || r.status === 403) throw new FinnhubKeyError('Finnhub did not accept this key.');
  if (!r.ok) throw new Error(`finnhub-${r.status}`);
  const data = (await r.json()) as FinnhubArticle[];
  return data
    .filter((a) => a.headline && a.url?.startsWith('https://'))
    .slice(0, 30)
    .map((a) => ({
      id: `finnhub-${a.id}`,
      title: a.headline,
      summary: a.summary.length > 220 ? `${a.summary.slice(0, 220).replace(/\s+\S*$/, '')}…` : a.summary,
      url: a.url,
      source: a.source,
      publishedAt: new Date(a.datetime * 1000).toISOString(),
      topic: 'global',
    }));
}
