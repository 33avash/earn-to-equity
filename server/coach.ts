import type { IncomingMessage, ServerResponse } from 'node:http';
import { handleCoach, MAX_BODY } from './handler';

/**
 * The Gemini coach endpoint for the Vite dev and preview servers, mounted at /api/coach (see vite.config.ts).
 * The key is read from GEMINI_API_KEY in .env. For the hosted site, deploy worker/coach.ts instead.
 */

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => {
      size += c.length;
      if (size > MAX_BODY) {
        reject(new Error('Payload too large'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function send(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

export function coachMiddleware(apiKey: string | undefined, model?: string) {
  return async (req: IncomingMessage, res: ServerResponse) => {
    let raw = '';
    if (req.method === 'POST') {
      try {
        raw = await readBody(req);
      } catch {
        return send(res, 413, { error: 'payload-too-large' });
      }
    }
    const { status, body } = await handleCoach(req.method ?? 'GET', raw, apiKey, model);
    send(res, status, body);
  };
}
