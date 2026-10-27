import { FEEDS, mergeItems, parseFeed } from '../../server/news';
import { classify } from '@/services/news/types';
import { isTodayIst } from '@/features/news/topics';

const rbi = FEEDS.find((f) => f.source === 'RBI')!;
const et = FEEDS.find((f) => f.source === 'Economic Times')!;

const xml = `<rss><channel><title>Feed</title><link>http://example.com</link>
<item><title><![CDATA[RBI keeps repo rate at 5.75%]]></title><link>http://www.rbi.org.in/scripts/BS_PressReleaseDisplay.aspx?prid=1</link>
<description><![CDATA[<p>The MPC voted&nbsp;4&ndash;2 &amp; kept the stance.</p>]]></description><pubDate>Tue, 27 Oct 2026 09:00:00 +0530</pubDate></item>
<item><title><![CDATA[Money Market Operations as on October 26, 2026]]></title><link>https://www.rbi.org.in/x</link><pubDate>Tue, 27 Oct 2026 08:00:00 +0530</pubDate></item>
<item><title>No date</title><link>https://example.com/a</link></item>
</channel></rss>`;

describe('news feed parsing', () => {
  it('reads CDATA, decodes entities, upgrades links to https and drops routine RBI notices', () => {
    const items = parseFeed(xml, rbi);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ title: 'RBI keeps repo rate at 5.75%', url: 'https://www.rbi.org.in/scripts/BS_PressReleaseDisplay.aspx?prid=1', source: 'RBI', topic: 'rates' });
    expect(items[0].summary).toBe('The MPC voted 4–2 & kept the stance.');
    expect(items[0].publishedAt).toBe('2026-10-27T03:30:00.000Z');
  });

  it('merges newest first and removes the same headline from two publishers', () => {
    const a = { id: '1', title: 'Sensex falls 800 points', summary: '', url: 'https://a/1', source: 'A', publishedAt: '2026-10-27T05:00:00.000Z', topic: 'markets' as const };
    const b = { ...a, id: '2', url: 'https://b/1', source: 'B', title: 'Sensex falls 800 points!' };
    const c = { ...a, id: '3', url: 'https://c/1', title: 'Gold hits a record', publishedAt: '2026-10-27T06:00:00.000Z' };
    expect(mergeItems([[a], [b, c]]).map((x) => x.id)).toEqual(['3', '1']);
  });
});

describe('news topics', () => {
  it('tags headlines by what they affect, falling back to the feed topic', () => {
    expect(classify('Home loan EMIs to rise after repo hike', et.topic)).toBe('property');
    expect(classify('ITR filing deadline extended', et.topic)).toBe('tax');
    expect(classify('SBI cuts FD rates by 25 bps', et.topic)).toBe('rates');
    expect(classify('Best ELSS funds for SIP investors', et.topic)).toBe('investing');
    expect(classify('Tata Motors results beat estimates', et.topic)).toBe('markets');
    expect(classify('US Fed decision: what to expect on interest rates', et.topic)).toBe('global');
  });

  it('decides "today" in Indian time', () => {
    const now = new Date('2026-10-27T20:00:00.000Z'); // 28 Oct, 01:30 IST
    expect(isTodayIst('2026-10-27T19:00:00.000Z', now)).toBe(true); // 00:30 IST on the 28th
    expect(isTodayIst('2026-10-27T18:00:00.000Z', now)).toBe(false); // 23:30 IST on the 27th
  });
});
