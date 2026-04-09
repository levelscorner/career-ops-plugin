// CRUD + fuzzy-match + status normalization for the applications table.
// Ported from the source repo's merge-tracker.mjs, dedup-tracker.mjs,
// and normalize-statuses.mjs into a single module backed by Dexie.

import type { Application } from '../../shared/types';
import {
  STATUS_RANK,
  normalizeStatus,
  type Status,
} from '../../shared/constants';
import { getDb } from './db';

// ---- helpers ------------------------------------------------------------

function uuid(): string {
  return (
    globalThis.crypto?.randomUUID?.() ??
    Math.random().toString(36).slice(2) + Date.now().toString(36)
  );
}

function now(): number {
  return Date.now();
}

function slug(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Fuzzy company+role match ported from merge-tracker.mjs.
 * Two rows are considered the same application when:
 *   - company slug matches exactly, AND
 *   - roles share at least 2 words of length >= 4 (case-insensitive)
 *
 * This prevents "Senior AI Engineer" colliding with "Junior AI Engineer"
 * while still catching "Senior AI Engineer" vs "AI Engineer (Senior)".
 */
export function rolesMatch(a: string, b: string): boolean {
  const words = (s: string) =>
    new Set(
      s
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length >= 4),
    );
  const aw = words(a);
  const bw = words(b);
  let overlap = 0;
  for (const w of aw) if (bw.has(w)) overlap += 1;
  return overlap >= 2;
}

export function isDuplicate(a: Application, b: Application): boolean {
  return slug(a.company) === slug(b.company) && rolesMatch(a.role, b.role);
}

/**
 * When two rows collide, pick the winner per source repo's dedup rule:
 *   1. Higher status rank wins (offer > interview > ... > skip)
 *   2. Tie → higher score wins
 *   3. Tie → more recent updatedAt wins
 */
export function pickWinner(a: Application, b: Application): Application {
  const ra = STATUS_RANK[a.status];
  const rb = STATUS_RANK[b.status];
  if (ra !== rb) return ra > rb ? a : b;
  if (a.score !== b.score) return a.score > b.score ? a : b;
  return a.updatedAt >= b.updatedAt ? a : b;
}

// ---- CRUD ---------------------------------------------------------------

export async function nextApplicationNumber(): Promise<number> {
  const db = getDb();
  const max = await db.applications.orderBy('number').last();
  return (max?.number ?? 0) + 1;
}

export async function listApplications(): Promise<Application[]> {
  return getDb()
    .applications.orderBy('number')
    .reverse()
    .toArray();
}

export async function getApplication(id: string): Promise<Application | undefined> {
  return getDb().applications.get(id);
}

export async function findByCompanyRole(
  company: string,
  role: string,
): Promise<Application | undefined> {
  const db = getDb();
  // company is indexed, role needs fuzzy match in JS.
  const candidates = await db.applications
    .where('company')
    .equalsIgnoreCase(company)
    .toArray();
  return candidates.find((c) => rolesMatch(c.role, role));
}

export interface UpsertInput {
  company: string;
  role: string;
  url: string;
  score: number;
  status: Status | string;
  reportId: string;
  pdfId?: string;
  notes?: string;
  archetype: Application['archetype'];
  language: Application['language'];
  date?: string;
}

/**
 * Insert-or-update an application by fuzzy company+role match.
 * This is the golden rule enforcer: NEVER creates a duplicate for the
 * same company+role. Instead it picks the winner under pickWinner().
 */
export async function upsertApplication(input: UpsertInput): Promise<Application> {
  const db = getDb();
  const canonicalStatus = normalizeStatus(String(input.status));
  if (!canonicalStatus) {
    throw new Error(`Non-canonical status: ${input.status}`);
  }
  const existing = await findByCompanyRole(input.company, input.role);
  const ts = now();
  if (existing) {
    const candidate: Application = {
      ...existing,
      url: input.url || existing.url,
      score: input.score,
      status: canonicalStatus,
      reportId: input.reportId,
      ...(input.pdfId !== undefined ? { pdfId: input.pdfId } : {}),
      notes: input.notes ?? existing.notes,
      archetype: input.archetype,
      language: input.language,
      updatedAt: ts,
    };
    const winner = pickWinner(existing, candidate);
    // Merge: keep the winner's status, but take fresh content from the candidate.
    const merged: Application = {
      ...candidate,
      status: winner.status,
      score: Math.max(candidate.score, existing.score),
    };
    await db.applications.put(merged);
    return merged;
  }
  const fresh: Application = {
    id: uuid(),
    number: await nextApplicationNumber(),
    date: input.date ?? new Date().toISOString().slice(0, 10),
    company: input.company,
    role: input.role,
    url: input.url,
    score: input.score,
    status: canonicalStatus,
    ...(input.pdfId !== undefined ? { pdfId: input.pdfId } : {}),
    reportId: input.reportId,
    notes: input.notes ?? '',
    archetype: input.archetype,
    language: input.language,
    createdAt: ts,
    updatedAt: ts,
  };
  await db.applications.put(fresh);
  return fresh;
}

export async function updateStatus(id: string, status: Status): Promise<void> {
  await getDb().applications.update(id, { status, updatedAt: now() });
}

export async function updateNotes(id: string, notes: string): Promise<void> {
  await getDb().applications.update(id, { notes, updatedAt: now() });
}

export async function deleteApplication(id: string): Promise<void> {
  const db = getDb();
  await db.transaction('rw', db.applications, db.reports, db.pdfBlobs, async () => {
    await db.applications.delete(id);
    await db.reports.where('applicationId').equals(id).delete();
    await db.pdfBlobs.where('applicationId').equals(id).delete();
  });
}
