/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Optional Gemini coach endpoint (a deployed worker/coach.ts). Defaults to /api/coach. */
  readonly VITE_COACH_API_URL?: string;
}
