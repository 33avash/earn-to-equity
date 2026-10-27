import { askGemini, coachStatus } from '../geminiClient';
import type { Availability, CoachEngine } from './types';

/** Google's Gemini through the optional server endpoint (local dev and preview, or a self-hosted deploy). */
export const geminiEngine: CoachEngine = {
  id: 'gemini',
  label: 'Gemini (server)',
  async availability(): Promise<Availability> {
    return (await coachStatus()) ? 'ready' : 'unavailable';
  },
  async ask({ messages, signal, onToken }) {
    const text = await askGemini(messages, signal);
    if (!text) throw new Error('gemini failed');
    onToken?.(text);
    return text;
  },
};
