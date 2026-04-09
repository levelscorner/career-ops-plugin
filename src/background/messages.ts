// Background service worker message router.
// All chrome.runtime.onMessage traffic flows through here; handlers are
// exhaustive so TS ensures we don't forget a message type.

import type {
  AnyMessage,
  BackgroundEvent,
  ContentMessage,
  UiMessage,
} from '../shared/messages';
import { evaluateJob } from './pipeline/evaluate';
import { generateCvPdf } from './pipeline/pdf';
import { runHealthCheck } from './verify/pipeline';
import { AnthropicClient } from './llm/anthropic';

export function installMessageRouter(): void {
  chrome.runtime.onMessage.addListener((message: AnyMessage, _sender, sendResponse) => {
    void handle(message)
      .then((value) => sendResponse(value))
      .catch((err) => sendResponse({ __error: (err as Error).message ?? String(err) }));
    return true; // keep the channel open for async sendResponse
  });
}

async function handle(message: AnyMessage): Promise<unknown> {
  switch (message.type) {
    // ---- content script -------------------------------------------------
    case 'content:jobDetected':
      // Content scripts just tell us "I saw a job" — we stash it but don't
      // auto-evaluate. The UI (badge click or side panel) triggers eval.
      return { ok: true };

    case 'content:requestEvaluate':
      return evaluateJob(message.job, (event) => broadcast(event));

    // ---- side panel / popup --------------------------------------------
    case 'ui:ping':
      return { ok: true, at: Date.now() };

    case 'ui:evaluateJob':
      return evaluateJob(message.job, (event) => broadcast(event));

    case 'ui:evaluatePastedJd':
      // Delegated to the same pipeline; the synthesizer builds a pseudo-JobPosting.
      return evaluateJob(synthesizeJobFromPastedJd(message.jd, message.url), (event) =>
        broadcast(event),
      );

    case 'ui:generatePdf':
      return generateCvPdf(message.applicationId, (event) => broadcast(event));

    case 'ui:runScan':
      return { ok: false, error: 'scan not implemented yet' };

    case 'ui:runBatch':
      return { ok: false, error: 'batch not implemented yet' };

    case 'ui:healthCheck':
      return runHealthCheck();

    case 'ui:testApiKey':
      return testApiKey(message.apiKey);

    // ---- background events are broadcasts, not requests ----------------
    default:
      // Background events bubble through onMessage when sidepanel listens;
      // no-op from here.
      return undefined;
  }
}

function broadcast(event: BackgroundEvent): void {
  chrome.runtime.sendMessage(event).catch(() => {
    // No listener is OK (side panel closed) — swallow.
  });
}

function synthesizeJobFromPastedJd(jd: string, url: string | null) {
  return {
    url: url ?? 'local://pasted',
    source: 'custom' as const,
    company: '(pasted)',
    role: '(pasted)',
    location: null,
    remote: 'unknown' as const,
    salary: null,
    descriptionMarkdown: jd,
    language: 'en' as const,
    extractedAt: Date.now(),
  };
}

async function testApiKey(apiKey: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const client = new AnthropicClient({ apiKey });
    // Cheapest possible validation: single-token Haiku request.
    await client.streamText(
      {
        model: 'claude-haiku-4-5',
        maxTokens: 8,
        messages: [{ role: 'user', content: 'ok' }],
      },
      () => undefined,
    );
    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}
