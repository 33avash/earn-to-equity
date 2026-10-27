# Live data sources

The markets strip and the fund check read a few free public sources. This file records what each one is, how the app reaches it, and what happens when it can't. The code is in `src/services/data/`.

Every request goes through `fetchCached` in `http.ts`. It tries a fresh cached copy first, then the network (with a timeout), then a stale cached copy, then a committed snapshot. It fails only when all four are missing. Cached copies are stored in local storage under `e2e:data:` keys. Only scheme codes or the text someone typed in the fund search are sent, never anything from the plan.

| Source | Used for | Key | Reached from | Cache | Fallback |
|---|---|---|---|---|---|
| Yahoo Finance chart data (`query1`/`query2.finance.yahoo.com/v8/finance/chart/{symbol}`) | Live Nifty 50 (`^NSEI`), Sensex (`^BSESN`), gold (`GC=F`, converted to ₹ per 10 g with `INR=X`) and USD/INR | None | `server/markets.ts`: the dev and preview servers at `/api/markets`, the Cloudflare Worker at `/markets`. Yahoo sends no CORS headers. | 1 minute on the server and in the browser; the strip refreshes every minute while visible | The MFapi and ECB tiles below |
| [MFapi.in](https://www.mfapi.in/) (`api.mfapi.in/mf/{code}`, `/mf/search`) | Fund search; NAV history for held funds and the Nifty 50 and gold proxies | None | The browser directly (CORS is open) | 12 hours (search: 1 hour) | Snapshots for the two proxies; none for other funds |
| [AMFI NAVAll.txt](https://www.amfiindia.com/net-asset-value) | Official category, plan (direct or regular) and NAV for held funds | None | `server/amfi.ts`: the dev and preview servers at `/api/amfi`, the Cloudflare Worker at `/amfi`. AMFI sends no CORS headers, so browsers can't read it directly. | 12 hours on the server, 12 hours in the browser | Plan type read from the scheme name |
| [Frankfurter](https://frankfurter.dev/), ECB provider | USD→INR reference rate, last ~400 days | None | The browser directly | 12 hours | `snapshots/usdinr.json` |
| [World Bank WDI](https://data.worldbank.org/indicator/FP.CPI.TOTL.ZG?locations=IN), `FP.CPI.TOTL.ZG` | India's annual CPI inflation | None | The browser directly | 7 days | `snapshots/cpi-india.json` |

The repo rate and the latest monthly CPI on the strip are not fetched. They are dated entries in `src/finance/assumptions.ts` (`REPO_RATE`, `CPI_LATEST`), checked by hand against the RBI and MoSPI releases, like every other rate in the planner.

## Notes on each source

- **Yahoo Finance** has no official public API. The chart endpoint is unofficial, needs no key, and can change or rate-limit without notice; the endpoint tries Yahoo's second host before giving up, and the strip then falls back to fund NAVs. Only four fixed symbols are fetched, so the endpoint can't be used as an open proxy. Gold is the international COMEX futures price in rupees, which is below the Indian retail price by the import duty and GST.
- **MFapi.in** is a free, unofficial mirror of AMFI's NAV data. Its figures match AMFI's, but it publishes no uptime promise, which is why the proxies have snapshots and AMFI's own file is used for plan type. Its cached full-history responses sometimes arrive without a CORS header; `fundHistory` then retries with a date range, and the strip takes today's NAV from the quicker `/latest` endpoint.
- **Index and gold proxies (fallback).** When the Yahoo endpoint can't be reached, the strip shows the NAV of an index fund (scheme 120716) and a gold fund-of-fund (scheme 119132) instead, and labels them as proxies. They are data sources only, not suggestions to buy those funds.
- **ECB reference rate.** Published once each working day around 16:00 CET. It is not a live market rate, and the strip says so.
- **Fund categories.** `assetClassFor` in `src/finance/funds.ts` maps AMFI's category, and for index funds, ETFs and fund-of-funds the scheme name, to one of the planner's seven asset classes. Hybrid funds go to their dominant side; balanced-advantage and multi-asset funds go to "other".

## Refreshing the snapshots

```bash
node scripts/refresh-snapshots.mjs
```

This rewrites the files in `src/services/data/snapshots/` with a `takenAt` timestamp. NAV history older than 400 days is thinned to about one point a week to keep the files small. The app shows a snapshot's own date and marks it as a saved copy.
