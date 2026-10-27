/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Optional Gemini coach endpoint (a deployed worker/coach.ts). Defaults to /api/coach. */
  readonly VITE_COACH_API_URL?: string;
  /** Optional headlines endpoint. Defaults to /news on the coach worker, or /api/news. */
  readonly VITE_NEWS_API_URL?: string;
}
