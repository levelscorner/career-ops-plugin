// Offscreen worker — receives render commands from the background service
// worker, hands them to the pdf renderer, and posts the bytes back.

import type { OffscreenCommand, OffscreenResponse } from '../shared/messages';
import { renderCvPdf } from './pdf-renderer';

export function runOffscreenWorker(): void {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    const msg = message as OffscreenCommand;
    if (msg?.type !== 'offscreen:renderPdf') return;
    void handleRender(msg)
      .then((response) => {
        sendResponse(response);
        // Also broadcast so the background's promise-based waiter picks it up.
        chrome.runtime.sendMessage(response).catch(() => undefined);
      })
      .catch((err) => {
        const response: OffscreenResponse = {
          type: 'offscreen:pdfFailed',
          id: msg.id,
          error: (err as Error).message ?? String(err),
        };
        sendResponse(response);
        chrome.runtime.sendMessage(response).catch(() => undefined);
      });
    return true;
  });
}

async function handleRender(command: OffscreenCommand): Promise<OffscreenResponse> {
  if (command.type !== 'offscreen:renderPdf') {
    return {
      type: 'offscreen:pdfFailed',
      id: (command as { id: string }).id,
      error: 'unknown offscreen command',
    };
  }
  const { bytes, filename } = await renderCvPdf({
    evaluation: command.payload.evaluation,
    cv: command.payload.cv,
    profileJson: command.payload.profileJson,
  });
  return {
    type: 'offscreen:pdfReady',
    id: command.id,
    bytes: bytes.buffer as ArrayBuffer,
    filename,
  };
}
