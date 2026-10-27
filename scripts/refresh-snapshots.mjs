// Refreshes the committed fallback snapshots in src/services/data/snapshots/ from the live public sources.
// Run with `node scripts/refresh-snapshots.mjs`. The app uses these when a source is down or the reader is offline.
import { writeFileSync } from 'node:fs';

const OUT = new URL('../src/services/data/snapshots/', import.meta.url);
const takenAt = new Date().toISOString();
const get = async (url) => {
  const r = await fetch(url, { headers: { 'User-Agent': 'earn-to-equity snapshot script' } });
  if (!r.ok) throw new Error(`${url} → ${r.status}`);
  return r.json();
};

/** MFapi history, newest first, thinned to weekly points beyond the last 400 days to keep the file small. */
async function nav(code, file) {
  const d = await get(`https://api.mfapi.in/mf/${code}`);
  const cutoff = Date.now() - 400 * 864e5;
  const toIso = (s) => s.split('-').reverse().join('-');
  const points = d.data.filter((p, i) => Date.parse(toIso(p.date)) >= cutoff || i % 5 === 0).filter((p) => Date.parse(toIso(p.date)) >= Date.now() - 6.2 * 365 * 864e5);
  writeFileSync(new URL(file, OUT), JSON.stringify({ takenAt, meta: d.meta, data: points }) + '\n');
  console.log(file, points.length, 'points, latest', points[0].date);
}

await nav(120716, 'nifty-proxy.json');
await nav(119132, 'gold-proxy.json');

const from = new Date(Date.now() - 400 * 864e5).toISOString().slice(0, 10);
const fx = await get(`https://api.frankfurter.dev/v2/providers/ecb/rates?base=USD&quotes=INR&from=${from}`);
writeFileSync(new URL('usdinr.json', OUT), JSON.stringify({ takenAt, data: fx }) + '\n');
console.log('usdinr.json', fx.length, 'days, latest', fx.at(-1).date);

const wb = await get('https://api.worldbank.org/v2/country/IND/indicator/FP.CPI.TOTL.ZG?format=json&per_page=100');
writeFileSync(new URL('cpi-india.json', OUT), JSON.stringify({ takenAt, data: wb }) + '\n');
console.log('cpi-india.json', wb[1].length, 'years, last updated', wb[0].lastupdated);
