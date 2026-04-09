// PDF pipeline — coordinates the offscreen document to render a CV PDF.
//
// MV3 service workers have no DOM. The Offscreen Documents API lets us
// open a hidden page with a full DOM for DOM_PARSER operations (and,
// for our purposes, pdf-lib byte manipulation inside a regular page
// context).
//
// Flow:
//   1. Ensure an offscreen document exists (reuse if already open).
//   2. Send {type: 'offscreen:renderPdf', payload} to it.
//   3. Await a {type: 'offscreen:pdfReady'} response with bytes.
//   4. Store the bytes in the pdfBlobs table.
//   5. Attach the blob ID to the application row.

import type { BackgroundEvent, OffscreenCommand, OffscreenResponse } from '../../shared/messages';
import { getApplication, upsertApplication } from '../storage/applications';
import { latestReportFor } from '../storage/reports';
import { getProfile, getCv } from '../storage/profile';
import { storePdf } from '../storage/pdf-blobs';

const OFFSCREEN_URL = 'offscreen.html';

export async function generateCvPdf(
  applicationId: string,
  emit: (event: BackgroundEvent) => void,
): Promise<{ ok: true; pdfId: string } | { ok: false; error: string }> {
  emit({ type: 'bg:pdfStarted', applicationId });
  try {
    const application = await getApplication(applicationId);
    if (!application) throw new Error(`application not found: ${applicationId}`);
    const report = await latestReportFor(applicationId);
    if (!report) throw new Error(`no report for application: ${applicationId}`);
    const [profile, cv] = await Promise.all([getProfile(), getCv()]);

    await ensureOffscreen();

    const id = crypto.randomUUID();
    const command: OffscreenCommand = {
      type: 'offscreen:renderPdf',
      id,
      payload: {
        applicationId,
        evaluation: report.evaluation,
        cv: cv.markdown,
        profileJson: JSON.stringify(profile),
      },
    };

    const response = await sendToOffscreen(command);
    if (response.type === 'offscreen:pdfFailed') {
      throw new Error(response.error);
    }

    const bytes = new Uint8Array(response.bytes);
    const pdfBlob = await storePdf({
      applicationId,
      bytes,
      filename: response.filename,
    });

    await upsertApplication({
      company: application.company,
      role: application.role,
      url: application.url,
      score: application.score,
      status: application.status,
      reportId: application.reportId,
      pdfId: pdfBlob.id,
      archetype: application.archetype,
      language: application.language,
      notes: application.notes,
    });

    emit({ type: 'bg:pdfCompleted', applicationId, pdfId: pdfBlob.id });
    return { ok: true, pdfId: pdfBlob.id };
  } catch (err) {
    const message = (err as Error).message ?? String(err);
    emit({ type: 'bg:pdfFailed', applicationId, error: message });
    return { ok: false, error: message };
  }
}

async function ensureOffscreen(): Promise<void> {
  // chrome.offscreen.hasDocument() is Chrome-only.
  if (!chrome.offscreen) {
    throw new Error('chrome.offscreen API unavailable (Firefox: PDF path pending)');
  }
  const existing = await (chrome.offscreen as unknown as {
    hasDocument?: () => Promise<boolean>;
  }).hasDocument?.();
  if (existing) return;
  await chrome.offscreen.createDocument({
    url: OFFSCREEN_URL,
    reasons: [chrome.offscreen.Reason.DOM_PARSER],
    justification: 'Render CV PDF from markdown using pdf-lib.',
  });
}

async function sendToOffscreen(command: OffscreenCommand): Promise<OffscreenResponse> {
  return new Promise((resolve, reject) => {
    const handler = (message: unknown) => {
      const msg = message as OffscreenResponse;
      if (
        (msg.type === 'offscreen:pdfReady' || msg.type === 'offscreen:pdfFailed') &&
        msg.id === command.id
      ) {
        chrome.runtime.onMessage.removeListener(handler);
        resolve(msg);
      }
    };
    chrome.runtime.onMessage.addListener(handler);
    chrome.runtime.sendMessage(command).catch((err) => {
      chrome.runtime.onMessage.removeListener(handler);
      reject(err);
    });
    // Safety timeout.
    setTimeout(() => {
      chrome.runtime.onMessage.removeListener(handler);
      reject(new Error('offscreen PDF render timed out'));
    }, 30_000);
  });
}
