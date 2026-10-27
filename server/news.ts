import { classify, type NewsFeedResponse, type NewsItem, type NewsTopic } from '../src/services/news/types';

/**
 * The day's Indian financial headlines, read from publishers' free RSS feeds (no API key). Shared by the Vite
 * dev/preview middleware (server/coach.ts) and the Cloudflare Worker (worker/coach.ts), because the feeds
 * don't allow browsers on other sites to read them directly.
 */

interface Feed {
  source: string;
  url: string;
  topic: NewsTopic;
  /** Routine notices that aren't news for a household (RBI's daily money-market tables, auction results). */
  skip?: RegExp;
}

export const FEEDS: Feed[] = [
  { source: 'Economic Times', url: 'https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms', topic: 'markets' },
  { source: 'ET Wealth', url: 'https://economictimes.indiatimes.com/wealth/rssfeeds/837555174.cms', topic: 'investing' },
  { source: 'Mint', url: 'https://www.livemint.com/rss/money', topic: 'investing' },
  { source: 'Business Standard', url: 'https://www.business-standard.com/rss/markets-106.rss', topic: 'markets' },
  {
    source: 'RBI',
    url: 'https://www.rbi.org.in/pressreleases_rss.xml',
    topic: 'rates',
    skip: /money market operations|auction|result of|treasury bills|weekly statistical|lending facility|reserve money|directions under section/i,
  },
];

const PER_FEED = 15;
const MAX_ITEMS = 60;
const FEED_TIMEOUT_MS = 8000;
const CACHE_MS = 10 * 60 * 1000;

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”', hellip: '…', rupee: '₹' };

function decode(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m);
}

function tag(xml: string, name: string): string {
  const m = xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'i'));
  if (!m) return '';
  const inner = m[1].trim().replace(/^<!\[CDATA\[([\s\S]*?)\]\]>$/, '$1');
  return decode(inner).trim();
}

/** Plain text from an RSS description that may hold HTML, cut to about two lines. */
function plain(html: string, max = 220): string {
  const text = decode(html.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
  return text.length > max ? `${text.slice(0, max).replace(/\s+\S*$/, '')}…` : text;
}

/** RSS 2.0 items → NewsItems. Items without a title, an https link or a readable date are dropped. */
export function parseFeed(xml: string, feed: Feed): NewsItem[] {
  const out: NewsItem[] = [];
  for (const [, body] of xml.matchAll(/<item[\s>]([\s\S]*?)<\/item>/gi)) {
    const title = plain(tag(body, 'title'), 200);
    const url = tag(body, 'link').replace(/^http:\/\//, 'https://');
    const date = new Date(tag(body, 'pubDate'));
    if (!title || !url.startsWith('https://') || Number.isNaN(date.getTime())) continue;
    if (feed.skip?.test(title)) continue;
    const summary = plain(tag(body, 'description'));
    out.push({ id: url, title, summary: summary === title ? '' : summary, url, source: feed.source, publishedAt: date.toISOString(), topic: classify(`${title} ${summary}`, feed.topic) });
    if (out.length >= PER_FEED) break;
  }
  return out;
}

/** Newest first, one copy of each headline (publishers syndicate the same headline). */
export function mergeItems(lists: NewsItem[][]): NewsItem[] {
  const seen = new Set<string>();
  return lists
    .flat()
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .filter((it) => {
      const key = it.title.toLowerCase().replace(/[^a-z0-9]+/g, '');
      if (seen.has(key) || seen.has(it.url)) return false;
      seen.add(key).add(it.url);
      return true;
    })
    .slice(0, MAX_ITEMS);
}

let cache: { at: number; body: NewsFeedResponse } | null = null;

export async function handleNews(method: string): Promise<{ status: number; body: unknown }> {
  if (method !== 'GET') return { status: 405, body: { error: 'method-not-allowed' } };
  if (cache && Date.now() - cache.at < CACHE_MS) return { status: 200, body: cache.body };

  const failed: string[] = [];
  const lists = await Promise.all(
    FEEDS.map(async (feed) => {
      try {
        const r = await fetch(feed.url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; EarnToEquity/1.0)', Accept: 'application/rss+xml, application/xml, text/xml' }, signal: AbortSignal.timeout(FEED_TIMEOUT_MS) });
        if (!r.ok) throw new Error(String(r.status));
        return parseFeed(await r.text(), feed);
      } catch {
        failed.push(feed.source);
        return [];
      }
    }),
  );
  const body: NewsFeedResponse = { items: mergeItems(lists), fetchedAt: new Date().toISOString(), failed };
  if (body.items.length === 0) return { status: 502, body: { error: 'upstream-error', failed } };
  cache = { at: Date.now(), body };
  return { status: 200, body };
}
