/**
 * Shared coach prompt. Imported by every model engine and by the Gemini server handler (server/coach.ts),
 * so it must stay free of app imports and path aliases.
 */

export const SYSTEM_PROMPT = `You are the Earn to Equity Wealth Coach, an educational assistant for young Indian earners.
Rules:
- Use ONLY the figures provided in CONTEXT and FACTS. Never invent, estimate or recompute numbers that are not there.
- FACTS, when present, were calculated by the planner's engine for this exact question. Your answer explains FACTS in plain words: keep every number exactly as written, keep each number attached to what it describes (a projected future value is not today's savings), and never add, subtract, multiply or compare numbers yourself.
- Never introduce a number that is not written in CONTEXT or FACTS.
- Quote rupee figures exactly as they appear (they are pre-formatted, e.g. ₹12.4 L, ₹1.2 Cr).
- State the relevant assumptions (inflation, returns, salary growth) that the figures depend on.
- REFERENCE notes explain concepts. Use them for "what is" questions.
- If the information needed to answer is missing, say what is missing.
- Projections are illustrative estimates, not guarantees. Do not recommend specific securities, funds or insurers.
- This is general education, not personalised financial, tax or legal advice.
- Be concise: at most about 180 words, plain language, short paragraphs or a short list using "- ". Use **bold** sparingly.`;

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/** Earlier turns kept for follow-up questions. Older ones are dropped to fit small context windows. */
export const HISTORY_TURNS = 4;
const MAX_CONTEXT_CHARS = 9000;
const MAX_TURN_CHARS = 900;

export interface PromptInput {
  history: { role: 'user' | 'coach'; text: string }[];
  question: string;
  context: unknown;
  facts?: string | null;
  references?: string[];
}

/** The user turn: plan figures, engine-computed facts, reference notes and the question. */
export function userTurn({ question, context, facts, references }: Omit<PromptInput, 'history'>): string {
  const parts = [`CONTEXT:\n${JSON.stringify(context ?? {}).slice(0, MAX_CONTEXT_CHARS)}`];
  if (facts) parts.push(`FACTS:\n${facts}`);
  if (references?.length) parts.push(`REFERENCE:\n${references.map((r) => `- ${r}`).join('\n')}`);
  parts.push(`QUESTION:\n${question}`);
  return parts.join('\n\n');
}

/** System prompt, the last few turns as plain text, then the grounded user turn. */
export function buildMessages(input: PromptInput): ChatMessage[] {
  const recent = input.history.slice(-HISTORY_TURNS).map<ChatMessage>((m) => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text.slice(0, MAX_TURN_CHARS) }));
  // Some chat templates require the first non-system turn to come from the user.
  while (recent.length && recent[0].role !== 'user') recent.shift();
  return [{ role: 'system', content: SYSTEM_PROMPT }, ...recent, { role: 'user', content: userTurn(input) }];
}
