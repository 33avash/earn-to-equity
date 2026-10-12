import type { AssetMap } from '@/types/profile';
import { ASSET_CLASSES } from '@/types/profile';
import { ASSET_LABELS, weightSum } from '@/finance/portfolio';
import { PercentInput } from '@/components/ui/Form';
import { useChartTheme } from '@/components/charts/theme';
import { AllocationBar } from '@/components/charts/Bars';

/** Target-weight editor with a live total and validation (must equal 100%). */
export function AllocationEditor({ weights, onChange, returns, onReturnsChange }: { weights: AssetMap; onChange: (w: AssetMap) => void; returns?: AssetMap; onReturnsChange?: (r: AssetMap) => void }) {
  const t = useChartTheme();
  const total = weightSum(weights);
  const ok = Math.abs(total - 1) < 0.001;
  return (
    <div>
      <div className="-mx-1 overflow-x-auto px-1">
        <table className="table-fin w-full min-w-[420px]">
          <caption className="sr-only">Target allocation</caption>
          <thead>
            <tr>
              <th scope="col">Asset class</th>
              <th scope="col" className="w-32">Target weight</th>
              {returns && <th scope="col" className="w-32">Assumed return</th>}
            </tr>
          </thead>
          <tbody>
            {ASSET_CLASSES.map((c) => (
              <tr key={c}>
                <td>
                  <span className="flex items-center gap-2 text-sm">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-[2px]" style={{ background: t.asset[c] }} />
                    {ASSET_LABELS[c]}
                  </span>
                </td>
                <td>
                  <PercentInput size="sm" ariaLabel={`${ASSET_LABELS[c]} target weight`} value={weights[c]} onChange={(v) => onChange({ ...weights, [c]: v })} max={100} />
                </td>
                {returns && onReturnsChange && (
                  <td>
                    <PercentInput size="sm" ariaLabel={`${ASSET_LABELS[c]} assumed return`} value={returns[c]} onChange={(v) => onReturnsChange({ ...returns, [c]: v })} min={-20} max={30} />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td className="!border-t-2 !border-evergreen/20 font-semibold text-evergreen">Total</td>
              <td className={`!border-t-2 !border-evergreen/20 num font-semibold ${ok ? 'text-forest' : 'text-danger'}`}>{(total * 100).toFixed(1)}%</td>
              {returns && <td className="!border-t-2 !border-evergreen/20" />}
            </tr>
          </tfoot>
        </table>
      </div>
      <div className="mt-4">
        <AllocationBar weights={weights} label="Target allocation" />
      </div>
      {!ok && (
        <p role="alert" className="mt-3 text-sm text-danger">
          Weights add up to {(total * 100).toFixed(1)}%. Adjust them so they total exactly 100% ({total > 1 ? `remove ${((total - 1) * 100).toFixed(1)} points` : `add ${((1 - total) * 100).toFixed(1)} points`}). Projections keep using the proportions until then.
        </p>
      )}
    </div>
  );
}
