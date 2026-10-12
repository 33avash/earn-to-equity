import { MODULES } from '@/features/learn/modules';
import { Button } from '@/components/ui/Button';
import { useStore } from '@/state/store';
import { useExploreDemo } from '@/state/useDemo';

export default function LearnPublic() {
  const hasPlan = useStore((s) => s.hasPlan);
  const explore = useExploreDemo();
  const open = (id: string) => explore(`/app/learn/${id}`, true);
  return (
    <div className="container-x py-16 lg:py-24">
      <p className="eyebrow">Learn</p>
      <h1 className="display mt-3 max-w-3xl text-[44px] leading-[1.06] sm:text-[56px]">Financial confidence, one idea at a time.</h1>
      <p className="mt-6 max-w-2xl text-[17px] leading-relaxed text-grey">
        Eleven concise modules. Each has a worked example calculated with the planner’s own engine, the key takeaways and a short knowledge check.
      </p>
      <ol className="mt-14">
        {MODULES.map((m, i) => (
          <li key={m.id} id={m.id} className="scroll-mt-24 border-t border-line last:border-b">
            <div className="grid gap-4 py-8 md:grid-cols-12">
              <span className="num text-sm text-grey md:col-span-1">{String(i + 1).padStart(2, '0')}</span>
              <div className="md:col-span-8">
                <h2 className="display text-[26px] leading-snug">{m.title}</h2>
                <p className="mt-2 text-[15px] leading-relaxed text-grey">{m.summary}</p>
                <ul className="mt-4 space-y-1 text-sm text-charcoal">
                  {m.takeaways.map((t) => (
                    <li key={t} className="flex gap-2">
                      <span className="text-champagne">—</span>
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex items-start gap-3 md:col-span-3 md:justify-end">
                <span className="num pt-2 text-xs text-grey">{m.minutes} min</span>
                <Button variant="secondary" size="sm" onClick={() => open(m.id)}>
                  Open module
                </Button>
              </div>
            </div>
          </li>
        ))}
      </ol>
      {!hasPlan && <p className="mt-6 text-xs text-grey">Opening a module loads the demo profile so the examples can link to the relevant tools.</p>}
    </div>
  );
}
