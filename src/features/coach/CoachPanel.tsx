import { useLocation } from 'react-router-dom';
import { Maximize2, X } from 'lucide-react';
import { useStore } from '@/state/store';
import { usePlan } from '@/state/selectors';
import { ButtonLink } from '@/components/ui';
import { Dialog, DialogClose, DialogDescription, DialogTitle, SheetContent } from '@/components/ui/shadcn/dialog';
import { CoachChat } from './CoachChat';
import { suggestionsFor } from './suggestions';

/** The coach as a side panel, so a question can be asked without leaving the screen it is about. */
export function CoachPanel() {
  const open = useStore((s) => s.coachOpen);
  const setOpen = useStore((s) => s.setCoachOpen);
  const { pathname } = useLocation();
  const plan = usePlan();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <SheetContent side="right" className="w-[calc(100vw-1.5rem)] max-w-[520px] gap-4 overflow-hidden px-4 pb-4 pt-5 sm:px-5">
        <div className="flex items-start justify-between gap-2">
          <div className="mr-auto">
            <DialogTitle>Coach</DialogTitle>
            <DialogDescription className="!mt-1 text-[13px]">Ask about your plan. Answers use your own projection.</DialogDescription>
          </div>
          <ButtonLink to="/app/coach" variant="ghost" size="sm" onClick={() => setOpen(false)} aria-label="Open the coach full page">
            <Maximize2 size={14} aria-hidden />
          </ButtonLink>
          <DialogClose className="hit -mr-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-grey hover:bg-muted hover:text-evergreen" aria-label="Close the coach">
            <X size={17} aria-hidden />
          </DialogClose>
        </div>
        {open && <CoachChat compact suggestions={suggestionsFor(pathname, plan)} />}
      </SheetContent>
    </Dialog>
  );
}
