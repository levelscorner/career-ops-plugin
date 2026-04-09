// Shared message contract between content script, background service
// worker, side panel, popup, options, and offscreen document.
//
// All runtime messaging uses these discriminated unions. The background
// router (src/background/messages.ts) exhaustively matches on `type`
// so the TS compiler ensures no handler is forgotten.

import type { EvaluationResult, JobPosting, Application } from './types';

// ---- outgoing from content -> background -------------------------------

export type ContentMessage =
  | { type: 'content:jobDetected'; job: JobPosting }
  | { type: 'content:requestEvaluate'; job: JobPosting; source: 'badge' | 'shortcut' };

// ---- sidepanel -> background -------------------------------------------

export type UiMessage =
  | { type: 'ui:ping' }
  | { type: 'ui:evaluateJob'; job: JobPosting }
  | { type: 'ui:evaluatePastedJd'; jd: string; url: string | null }
  | { type: 'ui:generatePdf'; applicationId: string }
  | { type: 'ui:runScan' }
  | { type: 'ui:runBatch'; pipelineIds: string[] }
  | { type: 'ui:healthCheck' }
  | { type: 'ui:testApiKey'; apiKey: string };

// ---- background -> sidepanel/popup (via sendMessage or port) -----------

export type BackgroundEvent =
  | { type: 'bg:evalStarted'; jobUrl: string; tempId: string }
  | { type: 'bg:evalDelta'; tempId: string; delta: string }
  | { type: 'bg:evalCompleted'; tempId: string; application: Application; evaluation: EvaluationResult }
  | { type: 'bg:evalFailed'; tempId: string; error: string }
  | { type: 'bg:pdfStarted'; applicationId: string }
  | { type: 'bg:pdfCompleted'; applicationId: string; pdfId: string }
  | { type: 'bg:pdfFailed'; applicationId: string; error: string }
  | { type: 'bg:scanProgress'; company: string; found: number; total: number }
  | { type: 'bg:scanCompleted'; newItems: number }
  | { type: 'bg:batchProgress'; completed: number; total: number; lastError?: string };

// ---- background -> offscreen -------------------------------------------

export type OffscreenCommand =
  | {
      type: 'offscreen:renderPdf';
      id: string;
      payload: {
        applicationId: string;
        evaluation: EvaluationResult;
        cv: string;
        profileJson: string;
      };
    };

export type OffscreenResponse =
  | { type: 'offscreen:pdfReady'; id: string; bytes: ArrayBuffer; filename: string }
  | { type: 'offscreen:pdfFailed'; id: string; error: string };

// ---- helpers -----------------------------------------------------------

export type AnyMessage =
  | ContentMessage
  | UiMessage
  | BackgroundEvent
  | OffscreenCommand
  | OffscreenResponse;

/** Dispatch a message to the background worker and await the response. */
export async function sendToBackground<T = unknown>(
  message: ContentMessage | UiMessage,
): Promise<T> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response: T | { __error: string }) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      if (response && typeof response === 'object' && '__error' in response) {
        reject(new Error((response as { __error: string }).__error));
        return;
      }
      resolve(response as T);
    });
  });
}
