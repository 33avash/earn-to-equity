import { PublicHero } from '@/components/layout/PublicHero';
import { SourcesList } from '@/features/sources/SourcesList';
import { LAST_REVIEW } from '@/finance/assumptions';

/** Every dated rule and rate the planner uses, with its source. The same list is in Settings. */
export default function Sources() {
  return (
    <>
      <PublicHero title={<>Rates, rules and <span className="serif-accent">sources</span></>}>
        <p>Every rule and rate the planner relies on, with the date it was checked and the page it was checked against. Last full review: {LAST_REVIEW}.</p>
      </PublicHero>
      <div className="container-x pb-10">
        <SourcesList />
      </div>
    </>
  );
}
