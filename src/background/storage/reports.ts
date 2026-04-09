// Reports table: one row per evaluation, linked to an application.

import type { EvaluationResult, Report } from '../../shared/types';
import { getDb } from './db';

function uuid(): string {
  return (
    globalThis.crypto?.randomUUID?.() ??
    Math.random().toString(36).slice(2) + Date.now().toString(36)
  );
}

function slug(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export interface CreateReportInput {
  applicationId: string;
  company: string;
  url: string;
  markdown: string;
  evaluation: EvaluationResult;
  date?: string;
}

export async function createReport(input: CreateReportInput): Promise<Report> {
  const db = getDb();
  const date = input.date ?? new Date().toISOString().slice(0, 10);
  // Bump version if a previous report exists for the same application.
  const prior = await db.reports
    .where('applicationId')
    .equals(input.applicationId)
    .sortBy('version');
  const version = (prior.at(-1)?.version ?? 0) + 1;
  const report: Report = {
    id: uuid(),
    applicationId: input.applicationId,
    date,
    company: input.company,
    slug: slug(input.company),
    url: input.url,
    markdown: input.markdown,
    evaluation: input.evaluation,
    version,
  };
  await db.reports.put(report);
  return report;
}

export async function getReport(id: string): Promise<Report | undefined> {
  return getDb().reports.get(id);
}

export async function listReportsByApplication(applicationId: string): Promise<Report[]> {
  return getDb().reports.where('applicationId').equals(applicationId).sortBy('version');
}

export async function latestReportFor(applicationId: string): Promise<Report | undefined> {
  const all = await listReportsByApplication(applicationId);
  return all.at(-1);
}
