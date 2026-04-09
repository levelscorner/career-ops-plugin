// PDF blob storage. Generated CVs live here and are linked from applications.

import type { PdfBlob } from '../../shared/types';
import { getDb } from './db';

function uuid(): string {
  return (
    globalThis.crypto?.randomUUID?.() ??
    Math.random().toString(36).slice(2) + Date.now().toString(36)
  );
}

export interface StorePdfInput {
  applicationId: string;
  bytes: Uint8Array;
  filename: string;
}

export async function storePdf(input: StorePdfInput): Promise<PdfBlob> {
  // Copy into a fresh, strictly-typed ArrayBuffer so TS's exact optional
  // check doesn't complain about SharedArrayBuffer backing store.
  const buffer = new ArrayBuffer(input.bytes.byteLength);
  new Uint8Array(buffer).set(input.bytes);
  const row: PdfBlob = {
    id: uuid(),
    applicationId: input.applicationId,
    bytes: new Blob([buffer], { type: 'application/pdf' }),
    filename: input.filename,
    createdAt: Date.now(),
  };
  await getDb().pdfBlobs.put(row);
  return row;
}

export async function getPdf(id: string): Promise<PdfBlob | undefined> {
  return getDb().pdfBlobs.get(id);
}

export async function listPdfsForApplication(applicationId: string): Promise<PdfBlob[]> {
  return getDb()
    .pdfBlobs.where('applicationId')
    .equals(applicationId)
    .reverse()
    .sortBy('createdAt');
}
