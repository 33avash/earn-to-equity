import { useNavigate } from 'react-router-dom';
import { useStore } from './store';

/**
 * Opens the demo. Your own plan is kept aside and comes back from the plan switcher, so nothing is lost.
 * When `preferExisting` is set and you have a plan, navigates without loading the demo.
 */
export function useExploreDemo() {
  const navigate = useNavigate();
  return (to = '/app', preferExisting = false) => {
    const s = useStore.getState();
    if (s.hasPlan && (s.isDemo || preferExisting)) return navigate(to);
    s.loadDemo();
    navigate(to);
  };
}
