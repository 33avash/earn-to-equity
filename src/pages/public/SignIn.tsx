import { Button, ButtonLink } from '@/components/ui/Button';
import { useStore } from '@/state/store';
import { useExploreDemo } from '@/state/useDemo';
import { Disclaimer } from '@/components/ui/Misc';

/**
 * This prototype has no accounts. Instead of a fake login form, the page explains where
 * data lives and offers the real entry points.
 */
export default function SignIn() {
  const explore = useExploreDemo();
  const hasPlan = useStore((s) => s.hasPlan);
  const isDemo = useStore((s) => s.isDemo);
  const name = useStore((s) => s.profile.about.name);
  return (
    <div className="container-x grid gap-12 py-16 lg:grid-cols-12 lg:py-24">
      <div className="lg:col-span-6">
        <p className="eyebrow">Sign in</p>
        <h1 className="display mt-3 text-[44px] leading-[1.06] sm:text-[52px]">No account needed in this prototype.</h1>
        <p className="mt-6 max-w-lg text-[16px] leading-relaxed text-grey">
          Earn to Equity currently stores your plan only in this browser’s local storage. There is no password, no server-side account and no syncing across devices. Clearing your browser data or switching device starts fresh.
        </p>
        <Disclaimer className="mt-8 max-w-lg">We never ask for bank passwords, PAN, Aadhaar or other identity documents. You can export a summary or erase everything from Settings.</Disclaimer>
      </div>
      <div className="flex flex-col gap-4 lg:col-span-5 lg:col-start-8">
        {hasPlan && !isDemo && (
          <div className="panel p-6">
            <p className="eyebrow">Saved in this browser</p>
            <p className="mt-2 text-lg font-semibold text-evergreen">{name ? `${name}’s plan` : 'Your plan'}</p>
            <ButtonLink to="/app" className="mt-4 w-full">
              Continue to my plan
            </ButtonLink>
          </div>
        )}
        <div className="panel p-6">
          <p className="text-lg font-semibold text-evergreen">Start your own plan</p>
          <p className="mt-1 text-sm text-grey">About 8 minutes. You can save and come back.</p>
          <ButtonLink to="/start" className="mt-4 w-full" variant={hasPlan && !isDemo ? 'secondary' : 'primary'}>
            Build My Wealth Plan
          </ButtonLink>
        </div>
        <div className="panel p-6">
          <p className="text-lg font-semibold text-evergreen">Look around first</p>
          <p className="mt-1 text-sm text-grey">A complete fictional profile with every module populated.</p>
          <Button
            variant="secondary"
            className="mt-4 w-full"
            onClick={() => explore('/app')}
          >
            Explore the Demo
          </Button>
          {hasPlan && !isDemo && <p className="mt-2 text-xs text-grey">You’ll be asked before your saved plan is replaced.</p>}
        </div>
      </div>
    </div>
  );
}
