// Pipeline (inbox) + scan history storage helpers.

import type { PipelineItem, ScanHistoryItem } from '../../shared/types';
import { getDb } from './db';

function uuid(): string {
  return (
    globalThis.crypto?.randomUUID?.() ??
    Math.random().toString(36).slice(2) + Date.now().toString(36)
  );
}

async function sha256(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input);
  const hash = await globalThis.crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// ---- Pipeline inbox -----------------------------------------------------

export async function addPipelineItems(
  items: Array<Omit<PipelineItem, 'id' | 'status' | 'createdAt'>>,
): Promise<PipelineItem[]> {
  const db = getDb();
  const now = Date.now();
  const rows: PipelineItem[] = items.map((it) => ({
    id: uuid(),
    url: it.url,
    source: it.source,
    notes: it.notes,
    status: 'pending',
    createdAt: now,
  }));
  await db.pipeline.bulkPut(rows);
  return rows;
}

export async function listPipelinePending(): Promise<PipelineItem[]> {
  return getDb().pipeline.where('status').equals('pending').toArray();
}

export async function markPipelineItem(
  id: string,
  status: PipelineItem['status'],
  lastError?: string,
): Promise<void> {
  const patch: Partial<PipelineItem> = { status };
  if (lastError !== undefined) patch.lastError = lastError;
  await getDb().pipeline.update(id, patch);
}

// ---- Scan history (dedup) -----------------------------------------------

export async function hasBeenScanned(url: string, title: string): Promise<boolean> {
  const hash = await sha256(`${url}::${title}`);
  const row = await getDb().scanHistory.where('hash').equals(hash).first();
  return !!row;
}

export async function recordScanned(
  url: string,
  company: string,
  title: string,
): Promise<ScanHistoryItem> {
  const hash = await sha256(`${url}::${title}`);
  const row: ScanHistoryItem = {
    id: uuid(),
    url,
    company,
    title,
    hash,
    firstSeenAt: Date.now(),
  };
  await getDb().scanHistory.put(row);
  return row;
}
