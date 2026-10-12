import { create } from 'zustand';
import { ConfirmDialog } from './Misc';

interface ConfirmRequest {
  title: string;
  body: string;
  confirmLabel: string;
  danger?: boolean;
  resolve: (ok: boolean) => void;
}

const useConfirmStore = create<{ req: ConfirmRequest | null; set: (r: ConfirmRequest | null) => void }>((set) => ({
  req: null,
  set: (req) => set({ req }),
}));

/** Promise-based confirmation using the app's styled dialog. */
export function confirmAction(opts: Omit<ConfirmRequest, 'resolve'>): Promise<boolean> {
  return new Promise((resolve) => useConfirmStore.getState().set({ ...opts, resolve }));
}

export function ConfirmHost() {
  const req = useConfirmStore((s) => s.req);
  const set = useConfirmStore((s) => s.set);
  const close = (ok: boolean) => {
    req?.resolve(ok);
    set(null);
  };
  return (
    <ConfirmDialog open={!!req} title={req?.title ?? ''} confirmLabel={req?.confirmLabel ?? 'Confirm'} danger={req?.danger} onConfirm={() => close(true)} onCancel={() => close(false)}>
      {req?.body}
    </ConfirmDialog>
  );
}
