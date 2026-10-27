import { describe, expect, it } from 'vitest';
import { computePlan } from '@/state/selectors';
import { DEFAULT_ASSUMPTIONS, demoProfile } from '@/state/demo';
import { defaultCoachSettings } from '@/state/store';
import { answerWithRules, coachContext } from '@/services/coach/ruleCoach';
import { buildMessages, HISTORY_TURNS, SYSTEM_PROMPT } from '@/services/coach/prompt';
import { extractFigures, unverifiedFigures } from '@/services/coach/verify';
import { retrieve } from '@/services/coach/retrieve';
import { engineChain, resolveEngine, shouldAutoDownload } from '@/features/coach/resolve';
import { parseBlocks } from '@/features/coach/RichText';

const plan = computePlan(demoProfile(), DEFAULT_ASSUMPTIONS);

describe('figure check', () => {
  it('reads rupees in compact, lakh, crore and Indian-grouped forms', () => {
    const f = extractFigures('₹12.4 L, ₹1.2 Cr, 3 lakh, Rs 45,000 and ₹12,40,000 at 6.5%');
    expect(f.map((x) => [x.kind, x.value])).toEqual([
      ['inr', 1240000],
      ['inr', 12000000],
      ['inr', 45000],
      ['inr', 1240000],
      ['inr', 300000],
      ['pct', 6.5],
    ]);
  });

  it('accepts figures quoted from the plan, in any rupee format', () => {
    const grounding = ['Net worth ₹12.4 L, return 9.2%'];
    expect(unverifiedFigures('You have ₹12.4 lakh (₹12,40,000) growing at 9.2%.', grounding)).toEqual([]);
  });

  it('doesn’t swallow a trailing comma into the figure', () => {
    expect(extractFigures('cover ₹20, 172 a month').map((f) => f.raw)).toEqual(['₹20']);
  });

  it('flags a figure the plan never produced', () => {
    expect(unverifiedFigures('You will have ₹2.5 Cr, growing at 14%.', ['Net worth ₹12.4 L, return 9.2%'])).toEqual(['₹2.5 Cr', '14%']);
  });

  it('passes every figure in the engine’s own answers', () => {
    for (const q of ['Can I afford a home in five years?', 'What if markets fall 30% in Year 4?', 'What happens if my salary grows by only 5%?', 'How much more should I save?']) {
      const facts = answerWithRules(q, plan).text;
      expect(unverifiedFigures(facts, [JSON.stringify(coachContext(plan)), facts, q])).toEqual([]);
    }
  });
});

describe('prompt', () => {
  it('adds engine facts for recognised questions and keeps the system prompt first', () => {
    const q = 'What happens if my salary grows by only 5%?';
    const rules = answerWithRules(q, plan);
    expect(rules.intent).toBe('salary');
    const msgs = buildMessages({ history: [], question: q, context: coachContext(plan), facts: rules.text });
    expect(msgs[0]).toEqual({ role: 'system', content: SYSTEM_PROMPT });
    expect(msgs.at(-1)!.content).toContain(`FACTS:\n${rules.text}`);
    expect(msgs.at(-1)!.content).toMatch(/QUESTION:\nWhat happens if my salary/);
  });

  it('returns no intent for questions the engine has no calculation for', () => {
    expect(answerWithRules('What is an index fund?', plan).intent).toBeNull();
  });

  it('keeps only recent turns and starts them with a user turn', () => {
    const history = Array.from({ length: 11 }, (_, i) => ({ role: (i % 2 ? 'coach' : 'user') as 'user' | 'coach', text: `turn ${i}` }));
    const msgs = buildMessages({ history, question: 'next', context: {} });
    const turns = msgs.slice(1, -1);
    expect(turns.length).toBeLessThanOrEqual(HISTORY_TURNS);
    expect(turns[0].role).toBe('user');
    expect(turns.at(-1)!.content).toBe('turn 10');
  });

  it('sends a brief context, without the long projection, when the engine has already answered', () => {
    const brief = coachContext(plan, { brief: true });
    expect(Object.keys(brief)).toEqual(['currency', 'profile', 'assumptions', 'today']);
    expect(JSON.stringify(coachContext(plan))).toContain('projection');
  });

  it('never includes the person’s name in the plan context', () => {
    const name = plan.profile.about.name;
    expect(name).toBeTruthy();
    expect(JSON.stringify(coachContext(plan))).not.toContain(name);
  });
});

describe('reference retrieval', () => {
  it('finds the lesson or glossary note for a concept question', () => {
    expect(retrieve('What is a SIP step-up?').join(' ')).toMatch(/step-up/i);
    expect(retrieve('Explain section 80C').join(' ')).toMatch(/80C/);
  });
  it('returns nothing for unrelated text', () => {
    expect(retrieve('hello there')).toEqual([]);
  });
});

describe('engine choice', () => {
  const auto = defaultCoachSettings();
  it('falls back to rules when nothing is ready', () => {
    expect(resolveEngine(auto, { webllm: 'downloadable', chrome: 'unavailable', gemini: 'unavailable' })).toBe('rules');
  });
  it('prefers a configured Gemini, then models on the device', () => {
    expect(engineChain(auto, { gemini: 'ready', chrome: 'ready', webllm: 'ready' })).toEqual(['gemini', 'chrome', 'webllm']);
    expect(resolveEngine(auto, { gemini: 'unavailable', chrome: 'unavailable', webllm: 'ready' })).toBe('webllm');
  });
  it('uses Ollama only when it is switched on', () => {
    expect(resolveEngine(auto, { ollama: 'ready' })).toBe('rules');
    expect(resolveEngine({ ...auto, ollamaEnabled: true }, { ollama: 'ready' })).toBe('ollama');
  });
  it('tries an explicit choice first, falls back when it can’t answer, and never uses a model when rules is chosen', () => {
    expect(engineChain({ ...auto, engine: 'webllm' }, { webllm: 'ready', gemini: 'ready' })).toEqual(['webllm', 'gemini']);
    expect(resolveEngine({ ...auto, engine: 'webllm' }, { webllm: 'downloadable', gemini: 'ready' })).toBe('gemini');
    expect(resolveEngine({ ...auto, engine: 'rules' }, { webllm: 'ready' })).toBe('rules');
  });
});

describe('automatic model download', () => {
  const auto = defaultCoachSettings();
  it('starts on a question when no model can answer and the browser can run one', () => {
    expect(shouldAutoDownload(auto, { webllm: 'downloadable', gemini: 'unavailable', chrome: 'unavailable' })).toBe(true);
  });
  it('doesn’t start when another model already answers, the browser can’t run it, or rules is chosen', () => {
    expect(shouldAutoDownload(auto, { webllm: 'downloadable', gemini: 'ready' })).toBe(false);
    expect(shouldAutoDownload(auto, { webllm: 'unavailable' })).toBe(false);
    expect(shouldAutoDownload(auto, { webllm: 'ready' })).toBe(false);
    expect(shouldAutoDownload({ ...auto, engine: 'rules' }, { webllm: 'downloadable' })).toBe(false);
    expect(shouldAutoDownload({ ...auto, engine: 'chrome' }, { webllm: 'downloadable' })).toBe(false);
  });
});

describe('answer formatting', () => {
  it('splits paragraphs, bullets and numbered lists', () => {
    expect(parseBlocks('Intro line\n\n- one\n• two\n\n1. first\n2. second\nAfter')).toEqual([
      { kind: 'p', text: 'Intro line' },
      { kind: 'ul', items: ['one', 'two'] },
      { kind: 'ol', items: ['first', 'second'] },
      { kind: 'p', text: 'After' },
    ]);
  });
});
