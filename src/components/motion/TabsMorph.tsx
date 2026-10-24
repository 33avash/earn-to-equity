import { useId, useState, type ReactNode } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';

export interface MorphTab {
  id: string;
  label: string;
  icon?: ReactNode;
  content: ReactNode;
}

/**
 * Segmented tabs whose active pill glides between triggers (shared layout), with the panel cross-fading
 * underneath. Radix Tabs supplies roles, arrow-key navigation and focus handling.
 */
export function TabsMorph({ tabs, label, className = '' }: { tabs: MorphTab[]; label: string; className?: string }) {
  const [value, setValue] = useState(tabs[0].id);
  const layoutId = useId();
  const reduce = useReducedMotion();
  const active = tabs.find((t) => t.id === value) ?? tabs[0];
  return (
    <Tabs.Root value={value} onValueChange={setValue} className={className}>
      <Tabs.List aria-label={label} className="frame-glass mx-auto flex w-max max-w-full gap-1 overflow-x-auto !rounded-full p-1">
        {tabs.map((t) => (
          <Tabs.Trigger
            key={t.id}
            value={t.id}
            className="tap relative inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-full px-4 text-[13.5px] font-medium text-grey outline-none transition-colors duration-300 hover:text-evergreen data-[state=active]:text-evergreen focus-visible:ring-2 focus-visible:ring-ring"
          >
            {value === t.id && (
              <motion.span
                layoutId={reduce ? undefined : `pill-${layoutId}`}
                className="absolute inset-0 rounded-full bg-muted shadow-[0_0_0_1px_var(--frame-line),var(--edge-highlight)]"
                transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              />
            )}
            <span className="relative flex items-center gap-2">
              {t.icon}
              {t.label}
            </span>
          </Tabs.Trigger>
        ))}
      </Tabs.List>
      <Tabs.Content value={active.id} forceMount className="mt-10 outline-none">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={active.id}
            initial={reduce ? false : { opacity: 0, y: 16, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)', transitionEnd: { filter: 'none' } }}
            exit={reduce ? undefined : { opacity: 0, y: -10, filter: 'blur(6px)' }}
            transition={{ duration: 0.45, ease: [0.32, 0.72, 0, 1] }}
          >
            {active.content}
          </motion.div>
        </AnimatePresence>
      </Tabs.Content>
    </Tabs.Root>
  );
}
