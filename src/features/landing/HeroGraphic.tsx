import { useMemo } from 'react';
import { simulate } from '@/finance/simulate';
import { formatCompact } from '@/finance/money';
import { DEFAULT_ASSUMPTIONS, demoProfile } from '@/state/demo';

export interface HeroSeries {
  points: number[];
  start: number;
  age: number;
  homeIndex: number | null;
  fiIndex: number | null;
}

/** Real-terms net-worth path for the fictional sample profile, computed by the engine. */
export function useHeroSeries(): HeroSeries {
  return useMemo(() => {
    const p = demoProfile();
    const sim = simulate(p, DEFAULT_ASSUMPTIONS, { years: 22 });
    const home = sim.rows.find((r) => r.events.includes('Buy a flat'));
    const fi = sim.rows.find((r) => r.fiReached);
    return {
      points: [sim.startNetWorth, ...sim.rows.map((r) => r.netWorthReal)],
      start: p.planStartYear,
      age: p.about.age,
      homeIndex: home ? home.index - 1 : null,
      fiIndex: fi ? fi.index : null,
    };
  }, []);
}

/**
 * Editorial wealth-trajectory graphic: a single drawn line over a faint baseline grid,
 * with three annotated milestones. The line draws itself once on load (CSS only).
 */
export function HeroGraphic({ series }: { series: HeroSeries }) {
  const { points, start, age, homeIndex, fiIndex } = series;
  const years = points.length - 1;
  const maxV = Math.max(...points);
  const W = 600;
  const H = 420;
  const pad = { l: 4, r: 4, t: 40, b: 36 };
  const x = (i: number) => pad.l + (i / years) * (W - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - Math.max(0, v) / (maxV * 1.1)) * (H - pad.t - pad.b);

  const pts = points.map((v, i) => [x(i), y(v)] as const);
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    d += ` C${p1[0] + (p2[0] - p0[0]) / 6},${p1[1] + (p2[1] - p0[1]) / 6} ${p2[0] - (p3[0] - p1[0]) / 6},${p2[1] - (p3[1] - p1[1]) / 6} ${p2[0]},${p2[1]}`;
  }
  const area = `${d} L${x(years)},${H - pad.b} L${x(0)},${H - pad.b} Z`;

  const milestones = [
    { i: 0, label: 'First SIP', sub: `${start} · age ${age}` },
    ...(homeIndex !== null ? [{ i: homeIndex, label: 'First home', sub: `${start + homeIndex} · age ${age + homeIndex}` }] : []),
    ...(fiIndex !== null ? [{ i: fiIndex, label: 'Work becomes optional', sub: `${start + fiIndex} · age ${age + fiIndex}` }] : []),
  ];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full overflow-visible" role="img" aria-labelledby="hero-g-title hero-g-desc">
      <title id="hero-g-title">Illustrative wealth trajectory</title>
      <desc id="hero-g-desc">
        Net worth in today’s rupees for a fictional 26-year-old, rising from {formatCompact(points[0])} to about {formatCompact(points[years])} over {years} years, with milestones for the first investment, a first home and financial independence.
      </desc>
      <defs>
        <linearGradient id="hero-area" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" style={{ stopColor: 'rgb(var(--c-forest))' }} stopOpacity="0.2" />
          <stop offset="100%" style={{ stopColor: 'rgb(var(--c-forest))' }} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.33, 0.66, 1].map((f) => (
        <line key={f} x1={pad.l} x2={W - pad.r} y1={y(maxV * f)} y2={y(maxV * f)} className="stroke-charcoal/[0.07]" strokeDasharray="2 6" />
      ))}
      <path d={area} fill="url(#hero-area)" className="fade-late" />
      <path d={d} pathLength={1} fill="none" className="draw stroke-forest" strokeWidth="2.5" strokeLinecap="round" />
      <line x1={pad.l} x2={W - pad.r} y1={H - pad.b} y2={H - pad.b} className="stroke-charcoal/30" />
      {[0, 5, 10, 15, 20].filter((i) => i <= years).map((i) => (
        <text key={i} x={x(i)} y={H - pad.b + 22} textAnchor={i === 0 ? 'start' : 'middle'} className="num fill-grey" fontSize="11.5">
          {start + i}
        </text>
      ))}
      <g className="fade-late">
        {milestones.map((m, k) => {
          const cx = x(m.i);
          const cy = y(points[m.i]);
          const end = m.i > years * 0.7;
          const ly = cy - (k === 0 ? 46 : 58);
          return (
            <g key={m.label}>
              <line x1={cx} x2={cx} y1={ly + 12} y2={cy - 7} className="stroke-champagne" strokeWidth="1" />
              <circle cx={cx} cy={cy} r="5.5" className="fill-ivory stroke-champagne" strokeWidth="2" />
              <text x={end ? cx + 4 : cx - 4} y={ly - 4} textAnchor={end ? 'end' : 'start'} className="fill-evergreen" fontSize="12.5" fontWeight="600">
                {m.label}
              </text>
              <text x={end ? cx + 4 : cx - 4} y={ly + 10} textAnchor={end ? 'end' : 'start'} className="num fill-grey" fontSize="11">
                {m.sub}
              </text>
            </g>
          );
        })}
      </g>
    </svg>
  );
}
