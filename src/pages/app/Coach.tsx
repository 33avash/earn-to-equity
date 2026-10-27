import { useStore } from '@/state/store';
import { PageHeader, Button, Disclaimer } from '@/components/ui';
import { CoachChat } from '@/features/coach/CoachChat';
import { GENERAL_SUGGESTIONS } from '@/features/coach/suggestions';

export default function Coach() {
  const hasMessages = useStore((s) => s.coach.length > 0);
  const clear = useStore((s) => s.clearCoach);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Coach"
        description="Ask about your plan. The planner’s engine works out the figures; the model explains them and names the assumptions behind them."
        actions={hasMessages && <Button variant="ghost" size="sm" onClick={clear}>Clear conversation</Button>}
      />
      <CoachChat suggestions={GENERAL_SUGGESTIONS} />
      <Disclaimer>The coach provides general education based on your inputs and assumptions. It does not give personalised investment, tax or legal advice, guarantee returns, or recommend specific products. Language models can make mistakes: figures that don’t match your plan are flagged, and the calculated answer is always one click away.</Disclaimer>
    </div>
  );
}
