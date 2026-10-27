/** What a headline is about, so it can point to the part of the planner it affects. */
export type NewsTopic = 'markets' | 'rates' | 'tax' | 'investing' | 'property' | 'global';

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  url: string;
  source: string;
  /** ISO timestamp. */
  publishedAt: string;
  topic: NewsTopic;
}

export interface NewsFeedResponse {
  items: NewsItem[];
  /** ISO timestamp of the fetch. */
  fetchedAt: string;
  /** Feeds that failed this time, by publisher name. */
  failed: string[];
}

const RULES: [NewsTopic, RegExp][] = [
  ['global', /^global market|\b(us fed|federal reserve|wall street|nasdaq|dow jones|s&p 500|global markets?)\b/i],
  ['property', /\b(home loans?|housing|real estate|property|flats?|builders?|stamp duty|rera|redevelop\w*)\b/i],
  ['tax', /\b(tax\w*|itr|gst|tds|budget|80c|cbdt)\b/i],
  ['rates', /\b(rbi|repo|rate (cut|hike)s?|inflation|cpi|fds?|fixed deposits?|bond yields?|g-?sec|emis?|loans?|monetary policy|interest rates?)\b/i],
  ['investing', /\b(sips?|mutual funds?|nps|epf|ppf|insurance|retire\w*|credit cards?|gold|silver|savings|pension|elss)\b/i],
  ['markets', /\b(sensex|nifty|stocks?|shares?|ipos?|markets?|equit\w*|smallcap|midcap|fii|dii)\b/i],
];

/** Topic from the headline and summary; falls back to the feed's own topic. */
export function classify(text: string, fallback: NewsTopic): NewsTopic {
  for (const [topic, re] of RULES) if (re.test(text)) return topic;
  return fallback;
}
