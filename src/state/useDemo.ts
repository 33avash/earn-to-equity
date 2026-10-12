import { useNavigate } from 'react-router-dom';
import { confirmAction } from '@/components/ui/Confirm';
import { useStore } from './store';

/**
 * Opens the demo. If the person has their own saved plan, asks before replacing it.
 * When `preferExisting` is set and a plan exists, navigates without loading the demo.
 */
export function useExploreDemo() {
  const navigate = useNavigate();
  return async (to = '/app', preferExisting = false) => {
    const s = useStore.getState();
    const ownPlan = s.hasPlan && !s.isDemo;
    if (ownPlan && preferExisting) return navigate(to);
    if (s.hasPlan && s.isDemo) return navigate(to);
    if (ownPlan) {
      const ok = await confirmAction({
        title: 'Replace your plan with the demo?',
        body: 'Your saved plan in this browser will be replaced by the fictional demo profile. Export a summary from Settings first if you want to keep it.',
        confirmLabel: 'Load demo',
        danger: true,
      });
      if (!ok) return;
    }
    s.loadDemo();
    navigate(to);
  };
}
