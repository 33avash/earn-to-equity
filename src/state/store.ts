import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Assumptions, FinancialProfile, ScenarioDeltas, ScenarioKey } from '@/types/profile';
import { DEFAULT_SCENARIO_DELTAS } from '@/finance/scenarios';
import { DEFAULT_TAX, type TaxAssumptions } from '@/features/learn/tax';
import type { EngineId } from '@/services/coach/engines/types';
import { DEFAULT_WEBLLM_MODEL, WEBLLM_MODELS } from '@/services/coach/engines/webllm';
import { DEFAULT_OLLAMA_MODEL } from '@/services/coach/engines/ollama';
import { setFinnhubKey } from '@/services/news/client';
import { DEFAULT_ASSUMPTIONS, blankProfile, demoProfile } from './demo';

export interface CoachMessage {
  id: string;
  role: 'user' | 'coach';
  text: string;
  source?: 'rules' | CoachEngineId;
  /** Model answers only: figures that don't appear in the plan's numbers. */
  unverified?: string[];
  /** Model answers only: the rule-based answer computed by the engine for the same question. */
  engineText?: string;
  /** Model answers only: the engine recognised the question and calculated the answer (engineText is a real answer, not a summary). */
  engineAnswered?: boolean;
  /** Rule-based answers only: why no model answered. */
  note?: string;
}

export type CoachEngineId = EngineId;

export interface CoachSettings {
  /** auto picks the best engine that is ready; rules never uses a language model. */
  engine: 'auto' | 'rules' | CoachEngineId;
  webllmModel: string;
  ollamaEnabled: boolean;
  ollamaModel: string;
}

export const defaultCoachSettings = (): CoachSettings => ({ engine: 'auto', webllmModel: DEFAULT_WEBLLM_MODEL, ollamaEnabled: false, ollamaModel: DEFAULT_OLLAMA_MODEL });

export interface RiskLabSettings {
  salaryGrowthDelta: number;
  inflationDelta: number;
  expenseCut: number;
  stepUpDelta: number;
  retireDelay: number; // years later than FI age (0 = none)
  breakMonths: number;
  breakYear: number;
  purchaseCost: number;
  purchaseYear: number;
  shockOn: boolean;
  shockDrop: number;
  shockYear: number;
  recoveryYears: number;
  creepDelta: number; // added to the lifestyle-creep assumption
  spikeOn: boolean; // a temporary inflation spike
  spikeRate: number;
  spikeFrom: number; // first calendar year
  spikeYears: number;
  mcModel: 'student-t' | 'historical';
}

export interface AppState {
  profile: FinancialProfile;
  assumptions: Assumptions;
  scenarioDeltas: Record<ScenarioKey, ScenarioDeltas>;
  isDemo: boolean;
  hasPlan: boolean; // the user completed onboarding (or chose the demo)
  /** The person's own plan, kept aside while the demo is open so the plan switcher can bring it back. */
  ownPlan: { profile: FinancialProfile; assumptions: Assumptions } | null;
  /** Next steps ticked off on Overview, by insight id. */
  doneSteps: Record<string, boolean>;
  /** A saved copy of the plan to compare against in the Wealth Simulator. */
  baseline: { profile: FinancialProfile; assumptions: Assumptions; savedAt: string; label: string } | null;
  onboarding: { step: number; draft: FinancialProfile | null };
  settings: { compact: boolean; showRule503020: boolean };
  riskLab: RiskLabSettings;
  tax: TaxAssumptions;
  coach: CoachMessage[];
  coachSettings: CoachSettings;
  /** The coach side panel. Not saved. */
  coachOpen: boolean;
  learnProgress: Record<string, number>; // module id → best quiz score

  updateProfile: (fn: (draft: FinancialProfile) => void) => void;
  updateAssumptions: (patch: Partial<Assumptions>) => void;
  setScenarioDelta: (key: ScenarioKey, patch: Partial<ScenarioDeltas>) => void;
  resetScenarioDeltas: () => void;
  loadDemo: () => void;
  switchToOwnPlan: () => void;
  toggleStep: (id: string) => void;
  saveBaseline: (label: string) => void;
  clearBaseline: () => void;
  startOnboarding: (fromCurrent?: boolean) => void;
  saveDraft: (draft: FinancialProfile, step: number) => void;
  completeOnboarding: (profile: FinancialProfile) => void;
  setSettings: (patch: Partial<AppState['settings']>) => void;
  setRiskLab: (patch: Partial<RiskLabSettings>) => void;
  setTax: (patch: Partial<TaxAssumptions>) => void;
  pushCoach: (m: CoachMessage) => void;
  clearCoach: () => void;
  setCoachSettings: (patch: Partial<CoachSettings>) => void;
  setCoachOpen: (open: boolean) => void;
  setLearnScore: (id: string, score: number) => void;
  clearAll: () => void;
}

const thisYear = () => new Date().getFullYear();

export const defaultRiskLab = (): RiskLabSettings => ({
  salaryGrowthDelta: 0,
  inflationDelta: 0,
  expenseCut: 0,
  stepUpDelta: 0,
  retireDelay: 0,
  breakMonths: 0,
  breakYear: thisYear() + 3,
  purchaseCost: 0,
  purchaseYear: thisYear() + 5,
  shockOn: false,
  shockDrop: 0.3,
  shockYear: thisYear() + 4,
  recoveryYears: 3,
  creepDelta: 0,
  spikeOn: false,
  spikeRate: 0.08,
  spikeFrom: thisYear() + 1,
  spikeYears: 3,
  mcModel: 'student-t',
});

const initial = () => ({
  profile: demoProfile(),
  assumptions: structuredClone(DEFAULT_ASSUMPTIONS),
  scenarioDeltas: structuredClone(DEFAULT_SCENARIO_DELTAS),
  isDemo: true,
  hasPlan: false,
  ownPlan: null as AppState['ownPlan'],
  doneSteps: {} as Record<string, boolean>,
  baseline: null as AppState['baseline'],
  onboarding: { step: 0, draft: null },
  settings: { compact: true, showRule503020: false },
  riskLab: defaultRiskLab(),
  tax: structuredClone(DEFAULT_TAX),
  coach: [] as CoachMessage[],
  coachSettings: defaultCoachSettings(),
  coachOpen: false,
  learnProgress: {} as Record<string, number>,
});

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      ...initial(),
      updateProfile: (fn) =>
        set((s) => {
          const next = structuredClone(s.profile);
          fn(next);
          return { profile: next };
        }),
      updateAssumptions: (patch) => set((s) => ({ assumptions: { ...s.assumptions, ...patch } })),
      setScenarioDelta: (key, patch) => set((s) => ({ scenarioDeltas: { ...s.scenarioDeltas, [key]: { ...s.scenarioDeltas[key], ...patch } } })),
      resetScenarioDeltas: () => set({ scenarioDeltas: structuredClone(DEFAULT_SCENARIO_DELTAS) }),
      loadDemo: () =>
        set((s) => ({
          ownPlan: s.hasPlan && !s.isDemo ? { profile: s.profile, assumptions: s.assumptions } : s.ownPlan,
          profile: demoProfile(),
          assumptions: structuredClone(DEFAULT_ASSUMPTIONS),
          scenarioDeltas: structuredClone(DEFAULT_SCENARIO_DELTAS),
          riskLab: defaultRiskLab(),
          isDemo: true,
          hasPlan: true,
          onboarding: { step: 0, draft: null },
          coach: [],
        })),
      switchToOwnPlan: () =>
        set((s) => (s.ownPlan ? { profile: s.ownPlan.profile, assumptions: s.ownPlan.assumptions, ownPlan: null, isDemo: false, hasPlan: true, coach: [] } : {})),
      toggleStep: (id) => set((s) => ({ doneSteps: { ...s.doneSteps, [id]: !s.doneSteps[id] } })),
      saveBaseline: (label) => set((s) => ({ baseline: { profile: structuredClone(s.profile), assumptions: structuredClone(s.assumptions), savedAt: new Date().toISOString(), label } })),
      clearBaseline: () => set({ baseline: null }),
      startOnboarding: (fromCurrent = false) =>
        set((s) => ({
          onboarding: {
            step: s.onboarding.draft ? s.onboarding.step : 0,
            draft: s.onboarding.draft ?? (fromCurrent && !s.isDemo ? structuredClone(s.profile) : blankProfile()),
          },
        })),
      saveDraft: (draft, step) => set({ onboarding: { step, draft } }),
      completeOnboarding: (profile) =>
        set({ profile, isDemo: false, hasPlan: true, ownPlan: null, onboarding: { step: 0, draft: null }, coach: [] }),
      setSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
      setRiskLab: (patch) => set((s) => ({ riskLab: { ...s.riskLab, ...patch } })),
      setTax: (patch) => set((s) => ({ tax: { ...s.tax, ...patch } })),
      pushCoach: (m) => set((s) => ({ coach: [...s.coach, m].slice(-40) })),
      clearCoach: () => set({ coach: [] }),
      setCoachSettings: (patch) => set((s) => ({ coachSettings: { ...s.coachSettings, ...patch } })),
      setCoachOpen: (open) => set({ coachOpen: open }),
      setLearnScore: (id, score) => set((s) => ({ learnProgress: { ...s.learnProgress, [id]: Math.max(score, s.learnProgress[id] ?? 0) } })),
      clearAll: () => {
        setFinnhubKey('');
        set({ ...initial() });
      },
    }),
    {
      name: 'e2e:v1',
      version: 1,
      storage: createJSONStorage(() => {
        try {
          const k = '__e2e_probe__';
          localStorage.setItem(k, '1');
          localStorage.removeItem(k);
          return localStorage;
        } catch {
          // Private mode or blocked storage: fall back to an in-memory store.
          const mem = new Map<string, string>();
          return {
            getItem: (k: string) => mem.get(k) ?? null,
            setItem: (k: string, v: string) => void mem.set(k, v),
            removeItem: (k: string) => void mem.delete(k),
          };
        }
      }),
      partialize: (s) => ({
        profile: s.profile,
        assumptions: s.assumptions,
        scenarioDeltas: s.scenarioDeltas,
        isDemo: s.isDemo,
        hasPlan: s.hasPlan,
        ownPlan: s.ownPlan,
        doneSteps: s.doneSteps,
        baseline: s.baseline,
        onboarding: s.onboarding,
        settings: s.settings,
        riskLab: s.riskLab,
        tax: s.tax,
        coach: s.coach,
        coachSettings: s.coachSettings,
        learnProgress: s.learnProgress,
      }),
      // Merge persisted data over fresh defaults so newly added fields always exist.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<AppState>;
        return {
          ...current,
          ...p,
          assumptions: { ...current.assumptions, ...(p.assumptions ?? {}) },
          settings: { ...current.settings, ...(p.settings ?? {}) },
          riskLab: { ...current.riskLab, ...(p.riskLab ?? {}) },
          coachSettings: (() => {
            const c = { ...current.coachSettings, ...(p.coachSettings ?? {}) };
            // A model that is no longer offered falls back to the current default.
            return WEBLLM_MODELS.some((m) => m.id === c.webllmModel) ? c : { ...c, webllmModel: current.coachSettings.webllmModel };
          })(),
          coachOpen: false,
          // Reference dates and rates always come from the current assumptions file, never an old save.
          tax: { ...current.tax, ...(p.tax ?? {}), asOf: current.tax.asOf, ppfRate: current.tax.ppfRate, epfRate: current.tax.epfRate },
        };
      },
    },
  ),
);
