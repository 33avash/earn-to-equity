import { useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ExternalLink, KeyRound, RefreshCw } from 'lucide-react';
import { PageHeader, Section, Button, Field, TextInput, Notice, Disclaimer, toast } from '@/components/ui';
import { useNews } from '@/features/news/useNews';
import { TOPICS, TOPIC_ORDER, isTodayIst, timeAgo } from '@/features/news/topics';
import { FINNHUB_SIGNUP_URL, fetchGlobalNews, FinnhubKeyError, getFinnhubKey, setFinnhubKey } from '@/services/news/client';
import type { NewsItem, NewsTopic } from '@/services/news/types';

function Headline({ item }: { item: NewsItem }) {
  const t = TOPICS[item.topic];
  return (
    <li className="flex flex-col gap-1.5 border-b border-line py-4 last:border-b-0">
      <p className="text-[12px] text-grey">
        <span className="font-medium text-charcoal/80">{item.source}</span> · <time dateTime={item.publishedAt}>{timeAgo(item.publishedAt)}</time> · {t.label}
      </p>
      <a href={item.url} target="_blank" rel="noreferrer noopener" className="group text-[15px] font-semibold leading-snug tracking-[-0.01em] text-evergreen hover:underline">
        {item.title}
        <ExternalLink size={12} className="ml-1.5 inline align-baseline text-grey" aria-label="(opens in a new tab)" />
      </a>
      {item.summary && <p className="line-clamp-2 text-[13.5px] leading-relaxed text-grey">{item.summary}</p>}
      <Link to={t.to} className="link mt-0.5 inline-flex w-fit items-center gap-1 text-[12.5px] font-medium">
        {t.action} <ArrowRight size={12} aria-hidden />
      </Link>
    </li>
  );
}

function FinnhubKeyForm({ saved, onChange }: { saved: string; onChange: (key: string) => void }) {
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const key = draft.trim();
    if (!key) return setError('Paste your Finnhub API key.');
    setChecking(true);
    setError(null);
    try {
      await fetchGlobalNews(key, AbortSignal.timeout(10000));
      setFinnhubKey(key);
      onChange(key);
      setDraft('');
      toast('Finnhub key saved in this browser');
    } catch (err) {
      setError(err instanceof FinnhubKeyError ? 'Finnhub did not accept this key. Check it on your Finnhub dashboard.' : 'Finnhub could not be reached. Try again shortly.');
    } finally {
      setChecking(false);
    }
  }

  if (saved) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <p className="text-charcoal/90">
          Global headlines are on, using your Finnhub key ending <span className="font-mono">…{saved.slice(-4)}</span>. It is stored in this browser only.
        </p>
        <Button variant="ghost" size="sm" onClick={() => { setFinnhubKey(''); onChange(''); toast('Finnhub key removed'); }}>Remove key</Button>
      </div>
    );
  }
  return (
    <form onSubmit={submit} className="flex max-w-xl flex-col gap-3">
      <p className="text-sm leading-relaxed text-charcoal/90">
        Add global market headlines with a free Finnhub API key. Sign up at{' '}
        <a className="link" href={FINNHUB_SIGNUP_URL} target="_blank" rel="noreferrer noopener">finnhub.io/register</a> (free plan, no card), then copy the key from your dashboard. It stays in this browser and is sent only to Finnhub.
      </p>
      <Field label="Finnhub API key" error={error}>
        {(id, describedBy, invalid) => (
          <TextInput id={id} aria-describedby={describedBy} aria-invalid={invalid} value={draft} onChange={(e) => setDraft(e.target.value)} autoComplete="off" spellCheck={false} placeholder="e.g. c1a2b3…" />
        )}
      </Field>
      <Button type="submit" size="sm" className="w-fit" icon={<KeyRound size={14} />} disabled={checking}>{checking ? 'Checking…' : 'Save key'}</Button>
    </form>
  );
}

export default function News() {
  const [finnhubKey, setKey] = useState(getFinnhubKey);
  const { items, loading, indianUnavailable, failed, globalError, fetchedAt, refresh } = useNews(finnhubKey);
  const [topic, setTopic] = useState<NewsTopic | 'all'>('all');

  const counts = useMemo(() => {
    const c: Partial<Record<NewsTopic, number>> = {};
    for (const it of items) c[it.topic] = (c[it.topic] ?? 0) + 1;
    return c;
  }, [items]);
  const shown = topic === 'all' ? items : items.filter((it) => it.topic === topic);
  const today = shown.filter((it) => isTodayIst(it.publishedAt));
  const earlier = shown.filter((it) => !isTodayIst(it.publishedAt));
  const filters: { value: NewsTopic | 'all'; label: string; n: number }[] = [
    { value: 'all', label: 'All', n: items.length },
    ...TOPIC_ORDER.filter((t) => counts[t]).map((t) => ({ value: t, label: TOPICS[t].label, n: counts[t] ?? 0 })),
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Today’s news"
        description="The day’s Indian money headlines from ET, Mint, Business Standard and the RBI, sorted by topic. Each headline links to the part of your plan it affects."
        actions={<Button variant="ghost" size="sm" icon={<RefreshCw size={14} />} onClick={refresh} disabled={loading}>Refresh</Button>}
      />

      {indianUnavailable && !loading && (
        <Notice tone="warning" title="Indian headlines aren’t available here">
          This copy of the planner has no news endpoint. It runs on <code>npm run dev</code> and on the deployed worker. {finnhubKey ? 'Showing global headlines from Finnhub meanwhile.' : 'Add a free Finnhub key below to see global market headlines now.'}
        </Notice>
      )}
      {globalError && <Notice tone="error">{globalError}</Notice>}

      <Section
        title={topic === 'all' ? 'Headlines' : TOPICS[topic].label}
        description={fetchedAt && !loading ? `Updated ${timeAgo(fetchedAt)}${failed.length ? `. Not reachable this time: ${failed.join(', ')}` : ''}.` : undefined}
      >
        {filters.length > 1 && (
          <div className="mb-2 flex flex-wrap gap-2" role="group" aria-label="Filter by topic">
            {filters.map((f) => (
              <button
                key={f.value}
                type="button"
                aria-pressed={topic === f.value}
                onClick={() => setTopic(f.value)}
                className={`tap rounded-full px-3.5 py-1.5 text-[12.5px] transition-colors ${topic === f.value ? 'bg-evergreen text-onbrand' : 'bg-muted/70 text-grey hover:bg-mint hover:text-evergreen'}`}
              >
                {f.label} <span className="tabular-nums opacity-70">{f.n}</span>
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <ul aria-busy="true" aria-label="Loading headlines">
            {[0, 1, 2, 3].map((i) => (
              <li key={i} className="flex flex-col gap-2 border-b border-line py-4 last:border-b-0">
                <span className="h-3 w-32 animate-pulse rounded bg-muted" />
                <span className="h-4 w-4/5 animate-pulse rounded bg-muted" />
                <span className="h-3 w-3/5 animate-pulse rounded bg-muted" />
              </li>
            ))}
          </ul>
        ) : shown.length === 0 ? (
          <p className="py-6 text-sm text-grey">No headlines to show right now.</p>
        ) : (
          <>
            {today.length > 0 && (
              <>
                <h3 className="mt-3 text-[12px] font-semibold uppercase tracking-[0.08em] text-grey">Today</h3>
                <ul>{today.map((it) => <Headline key={it.id} item={it} />)}</ul>
              </>
            )}
            {earlier.length > 0 && (
              <>
                <h3 className="mt-5 text-[12px] font-semibold uppercase tracking-[0.08em] text-grey">Earlier</h3>
                <ul>{earlier.map((it) => <Headline key={it.id} item={it} />)}</ul>
              </>
            )}
          </>
        )}
      </Section>

      <Section title="Global markets" description="Optional. Powered by Finnhub’s free market news API.">
        <FinnhubKeyForm saved={finnhubKey} onChange={setKey} />
      </Section>

      <Disclaimer>Headlines and summaries belong to their publishers and open on their sites. They are news, not advice; topic links are a shortcut to the relevant part of your plan, not a recommendation to act.</Disclaimer>
    </div>
  );
}
