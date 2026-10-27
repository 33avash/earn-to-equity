import { Download } from 'lucide-react';
import { Button, Toggle } from '@/components/ui';
import { WEBLLM_MODELS } from '@/services/coach/engines/webllm';
import { OLLAMA_URL } from '@/services/coach/engines/ollama';
import type { CoachSettings } from '@/state/store';
import type { useCoach } from './useCoach';

export const ENGINE_LABEL: Record<CoachSettings['engine'], string> = {
  auto: 'Automatic',
  rules: 'Rule-based',
  webllm: 'On-device model',
  chrome: 'Chrome built-in AI',
  ollama: 'Ollama',
  gemini: 'Gemini',
};

export const ENGINE_NOTE: Record<Exclude<CoachSettings['engine'], 'auto'>, string> = {
  webllm: 'Runs in this browser on your device’s GPU. Free, no account, no usage limit, and questions never leave the device. Downloads once (about 1.5 GB).',
  chrome: 'Chrome’s own model (Gemini Nano), running on this device.',
  ollama: 'A model served by Ollama on this computer.',
  gemini: 'Google’s Gemini through this deployment’s server. Questions and a summary of figures (no name) are sent to Google.',
  rules: 'Template answers filled with your plan’s calculations. Works everywhere, offline.',
};

const STATUS_TEXT = { ready: 'Ready', downloadable: 'Download needed', unavailable: 'Not available here' } as const;

type Coach = ReturnType<typeof useCoach>;

/** Engine choice, on-device model size and Ollama options. Used in the coach panel and on Settings. */
export function EngineSettings({ coach }: { coach: Coach }) {
  const { settings, setSettings, statuses, prepare, preparing } = coach;
  const status = (id: Exclude<CoachSettings['engine'], 'auto' | 'rules'>) =>
    id === 'ollama' && !settings.ollamaEnabled
      ? 'Off'
      : statuses?.[id]
          ? STATUS_TEXT[statuses[id]!]
          : 'Checking…';
  const options: CoachSettings['engine'][] = ['auto', 'webllm', 'gemini', 'chrome', 'ollama', 'rules'];
  const webllmReady = statuses?.webllm === 'ready';

  return (
    <div className="flex flex-col gap-5 text-sm">
      <fieldset>
        <legend className="mb-2 text-[13px] font-medium text-evergreen">Who answers</legend>
        <div className="flex flex-col gap-1">
          {options.map((id) => (
            <label key={id} className="tap flex cursor-pointer items-start gap-3 rounded-lg px-2 py-2 hover:bg-muted/60">
              <input type="radio" name="coach-engine" className="mt-1 accent-[rgb(var(--accent))]" checked={settings.engine === id} onChange={() => setSettings({ engine: id })} />
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className="font-medium text-charcoal">{ENGINE_LABEL[id]}</span>
                  {id !== 'auto' && id !== 'rules' && <span className="shrink-0 text-xs text-grey">{status(id)}</span>}
                </span>
                <span className="mt-0.5 block text-xs leading-relaxed text-grey">{id === 'auto' ? 'Uses Gemini where this site has a key, otherwise a model on this device, downloading the in-browser model on your first question. The rule-based coach answers until a model is ready.' : ENGINE_NOTE[id]}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {statuses?.webllm !== 'unavailable' && (
        <fieldset>
          <legend className="mb-2 text-[13px] font-medium text-evergreen">On-device model</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {WEBLLM_MODELS.map((m) => (
              <label key={m.id} className={`tap flex cursor-pointer flex-col rounded-xl px-3 py-2.5 shadow-[0_0_0_1px_var(--frame-line)] ${settings.webllmModel === m.id ? 'bg-mint/50' : 'hover:bg-muted/60'}`}>
                <span className="flex items-center gap-2">
                  <input type="radio" name="coach-webllm" className="accent-[rgb(var(--accent))]" checked={settings.webllmModel === m.id} onChange={() => setSettings({ webllmModel: m.id })} />
                  <span className="font-medium text-charcoal">{m.label}</span>
                  <span className="ml-auto text-xs text-grey">{m.size}</span>
                </span>
                <span className="mt-1 pl-5 text-xs text-grey">{m.note}</span>
              </label>
            ))}
          </div>
          {!webllmReady && (
            <Button size="sm" variant="secondary" className="mt-3" disabled={Boolean(preparing) || !statuses} icon={<Download size={14} aria-hidden />} onClick={() => prepare('webllm')}>
              Download {WEBLLM_MODELS.find((m) => m.id === settings.webllmModel)?.label.toLowerCase()} model
            </Button>
          )}
          <p className="mt-2 text-xs leading-relaxed text-grey">Downloaded once into this browser’s storage, then loads from there. Needs WebGPU (recent Chrome, Edge or Safari).</p>
        </fieldset>
      )}

      <div className="flex flex-col gap-2">
        <Toggle checked={settings.ollamaEnabled} onChange={(v) => setSettings({ ollamaEnabled: v })} label="Use Ollama on this computer" description={`Connects to ${OLLAMA_URL} only when this is on.`} />
        {settings.ollamaEnabled && (
          <>
            <label className="text-xs text-grey" htmlFor="ollama-model">
              Model name
            </label>
            <input id="ollama-model" className="input h-9 text-sm" defaultValue={settings.ollamaModel} onBlur={(e) => e.target.value.trim() && setSettings({ ollamaModel: e.target.value.trim() })} placeholder="gemma3:4b" />
            <p className="text-xs leading-relaxed text-grey">
              Run <code className="num rounded bg-muted px-1">ollama pull {settings.ollamaModel || 'gemma3:4b'}</code>. On the hosted site, also start Ollama with{' '}
              <code className="num rounded bg-muted px-1">OLLAMA_ORIGINS={typeof location === 'undefined' ? '*' : location.origin}</code>.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
