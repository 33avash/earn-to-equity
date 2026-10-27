import { useEffect, useMemo, useState } from 'react';
import { Search, Trash2 } from 'lucide-react';
import type { FinancialProfile } from '@/types/profile';
import { usePlan, useMoney } from '@/state/selectors';
import { useStore } from '@/state/store';
import { Badge, Button, Field, MoneyInput, TextInput, toast } from '@/components/ui';
import { ASSET_LABELS } from '@/finance/portfolio';
import { REGULAR_PLAN_DRAG } from '@/finance/assumptions';
import { assetClassFor, cagr, dragFor, holdingsWithFunds, planType, regularCost, regularShareOf, type HeldFund } from '@/finance/funds';
import { formatPct } from '@/finance/money';
import { amfiSchemes, fundHistory, searchFunds, SOURCES, type FundHit, type FundHistory } from '@/services/data/sources';
import { istStamp } from '@/services/data/http';

/*
 * Fund check: the mutual funds someone already holds, with facts about each one (category, direct or regular
 * plan, past returns from NAV history) and what a regular plan costs over the plan. It never ranks, scores or
 * suggests a fund. Only the typed search text and scheme codes leave the browser.
 */

/** Writes the funds into the profile: holdings for each class that has a fund, and the regular-plan share. */
export function applyFunds(x: FinancialProfile, funds: HeldFund[]) {
  x.position.funds = funds;
  const valued = funds.filter((f) => f.amount > 0);
  if (!valued.length) return;
  x.position.holdings = holdingsWithFunds(x.position.holdings, valued);
  if (valued.some((f) => f.plan)) x.preferences.regularPlanShare = regularShareOf(valued);
}

const pct = (r: number | null) => (r === null ? '—' : formatPct(r, 1));

function useSearch(q: string) {
  const [state, setState] = useState<{ hits: FundHit[]; loading: boolean; failed: boolean }>({ hits: [], loading: false, failed: false });
  useEffect(() => {
    if (q.trim().length < 3) return setState({ hits: [], loading: false, failed: false });
    let live = true;
    setState((s) => ({ ...s, loading: true, failed: false }));
    const t = setTimeout(() => {
      searchFunds(q).then(
        (hits) => live && setState({ hits, loading: false, failed: false }),
        () => live && setState({ hits: [], loading: false, failed: true }),
      );
    }, 350);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [q]);
  return state;
}

/** NAV history for each held fund, loaded once per code (cached 12 hours underneath). */
function useHistories(codes: number[]) {
  const [hist, setHist] = useState<Record<number, FundHistory | 'failed'>>({});
  const key = codes.join(',');
  useEffect(() => {
    let live = true;
    for (const c of codes)
      if (!(c in hist))
        fundHistory(c).then(
          (r) => live && setHist((h) => ({ ...h, [c]: r.data })),
          () => live && setHist((h) => ({ ...h, [c]: 'failed' })),
        );
    return () => {
      live = false;
    };
  }, [key]); // codes are re-read from `key`; `hist` only decides what is still missing
  return hist;
}

export function FundCheck() {
  const plan = usePlan();
  const money = useMoney();
  const update = useStore((s) => s.updateProfile);
  const funds = useMemo(() => plan.profile.position.funds ?? [], [plan.profile.position.funds]);
  const { assumptions: a } = plan;
  const drag = a.regularPlanDrag ?? REGULAR_PLAN_DRAG.value;
  const [q, setQ] = useState('');
  const [adding, setAdding] = useState<number | null>(null);
  const search = useSearch(q);
  const hist = useHistories(funds.map((f) => f.code));

  const save = (next: HeldFund[]) => update((x) => applyFunds(x, next));

  const add = async (hit: FundHit) => {
    if (funds.some((f) => f.code === hit.code)) return toast('That fund is already in your list');
    setAdding(hit.code);
    try {
      const [h, official] = await Promise.all([
        fundHistory(hit.code).then((r) => r.data, () => null),
        amfiSchemes([hit.code]).then((r) => r.data[0] ?? null, () => null),
      ]);
      // AMFI's file drops "Direct Plan"/"Regular Plan" from names, so keep MFapi's fuller name.
      const name = h?.name ?? hit.name;
      save([...funds, { code: hit.code, name, category: official?.category ?? h?.category ?? '', plan: official?.plan ?? planType(name), amount: 0 }]);
      setQ('');
      toast(`Added ${name}. Enter what it is worth today.`);
    } finally {
      setAdding(null);
    }
  };

  const total = funds.reduce((s, f) => s + Math.max(0, f.amount), 0);
  const regular = funds.filter((f) => f.plan === 'Regular' && f.amount > 0);

  return (
    <div className="flex flex-col gap-5">
      <Field label="Find a fund you hold" hint="Type at least three letters of its name. Only what you type is sent, to MFapi.in." className="max-w-xl">
        {(id, d) => (
          <div className="relative">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-grey" aria-hidden />
            <TextInput id={id} aria-describedby={d} value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. Nifty 50 index direct" className="pl-9" autoComplete="off" />
          </div>
        )}
      </Field>

      {q.trim().length >= 3 && (
        <div aria-live="polite">
          {search.loading ? (
            <p className="text-[13px] text-grey">Searching…</p>
          ) : search.failed ? (
            <p className="text-[13px] text-danger">Fund search is unavailable right now. Check your connection and try again.</p>
          ) : search.hits.length === 0 ? (
            <p className="text-[13px] text-grey">No scheme matches “{q.trim()}”.</p>
          ) : (
            <ul className="well flex max-h-72 flex-col divide-y divide-line overflow-y-auto" aria-label="Matching schemes">
              {search.hits.map((h) => (
                <li key={h.code} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <span className="min-w-0 text-[13px] text-charcoal">
                    {h.name} <span className="num text-[11.5px] text-grey">· {h.code}</span>
                  </span>
                  <Button size="sm" variant="secondary" disabled={adding !== null || funds.some((f) => f.code === h.code)} onClick={() => add(h)}>
                    {funds.some((f) => f.code === h.code) ? 'Added' : adding === h.code ? 'Adding…' : 'Add'}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {funds.length > 0 && (
        <>
          <div className="-mx-1 overflow-x-auto px-1">
            <table className="table-fin w-full min-w-[820px]">
              <thead>
                <tr>
                  <th scope="col">Fund</th>
                  <th scope="col">Counted as</th>
                  <th scope="col">Plan</th>
                  <th scope="col">1 yr</th>
                  <th scope="col">3 yr</th>
                  <th scope="col">5 yr</th>
                  <th scope="col">Worth today</th>
                  <th scope="col">
                    <span className="sr-only">Remove</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {funds.map((f, i) => {
                  const h = hist[f.code];
                  const pts = h && h !== 'failed' ? h.points : [];
                  const cls = assetClassFor(f.category, f.name);
                  const extra = f.plan === 'Regular' ? regularCost(f.amount, a.returns[cls], a.horizonYears, dragFor(cls, drag)) : 0;
                  return (
                    <tr key={f.code}>
                      <td className="max-w-[18rem] font-sans">
                        <span className="block text-[13px] text-charcoal">{f.name}</span>
                        <span className="block text-[11.5px] text-grey">{f.category || 'Category not published'}</span>
                        {extra > 0 && (
                          <span className="mt-0.5 block text-[11.5px] text-champagne">
                            Regular plan: about {money(extra)} more over {a.horizonYears} years than the direct plan, on this amount
                          </span>
                        )}
                      </td>
                      <td className="font-sans text-[13px]">{ASSET_LABELS[cls]}</td>
                      <td className="font-sans">{f.plan ? <Badge tone={f.plan === 'Direct' ? 'good' : 'warn'}>{f.plan}</Badge> : <span className="text-[12px] text-grey">Unknown</span>}</td>
                      <td>{h === 'failed' ? '—' : h ? pct(cagr(pts, 1)) : '…'}</td>
                      <td>{h === 'failed' ? '—' : h ? pct(cagr(pts, 3)) : '…'}</td>
                      <td>{h === 'failed' ? '—' : h ? pct(cagr(pts, 5)) : '…'}</td>
                      <td className="w-40">
                        <MoneyInput size="sm" ariaLabel={`${f.name} current value`} value={f.amount} max={1e10} onChange={(v) => save(funds.map((g, j) => (j === i ? { ...g, amount: v } : g)))} />
                      </td>
                      <td>
                        <button type="button" onClick={() => save(funds.filter((_, j) => j !== i))} className="hit rounded-md p-1.5 text-grey hover:bg-muted hover:text-danger" aria-label={`Remove ${f.name}`}>
                          <Trash2 size={15} aria-hidden />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-1.5 text-[13px] leading-relaxed text-charcoal">
            {total > 0 ? (
              <p>
                {money(total)} across {funds.length} fund{funds.length === 1 ? '' : 's'}.{' '}
                {regular.length > 0
                  ? `${formatPct(regularShareOf(funds), 0)} of it is in regular plans, which the projection now charges for.`
                  : funds.some((f) => f.plan === 'Regular')
                    ? 'Enter what your regular-plan funds are worth to see their cost.'
                    : 'All of it is in direct plans.'}{' '}
                Each asset class that has a fund here is set to the total of those funds in the table below; the others keep what you entered.
              </p>
            ) : (
              <p>Enter what each fund is worth today (from your statement or app) to count it in your holdings.</p>
            )}
            <p className="text-[12px] text-grey">
              Past returns are compound yearly growth of the NAV, after the fund’s own costs, from{' '}
              <a href={SOURCES.mfapi.url} target="_blank" rel="noreferrer noopener" className="link">
                {SOURCES.mfapi.name}
              </a>
              {(() => {
                const dates = funds.map((f) => hist[f.code]).flatMap((h) => (h && h !== 'failed' ? [h.points[h.points.length - 1]?.date] : [])).filter(Boolean) as string[];
                const latest = dates.sort().pop();
                return latest ? `, NAVs up to ${istStamp(Date.parse(`${latest}T12:00:00+05:30`), false)}` : '';
              })()}
              . Plan type comes from{' '}
              <a href={SOURCES.amfi.url} target="_blank" rel="noreferrer noopener" className="link">
                {SOURCES.amfi.name}
              </a>{' '}
              where it can be reached, otherwise from the scheme name. Past returns don’t predict future ones, and nothing here suggests buying or selling a fund.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
