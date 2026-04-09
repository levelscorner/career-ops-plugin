// Pipeline health checks — ported from verify-pipeline.mjs.
//
// Runs on-demand from the Settings page. Returns a structured report the
// UI can render as a checklist. Every check is read-only.

import { getDb } from '../storage/db';
import { STATUS_VALUES, type Status } from '../../shared/constants';
import { rolesMatch } from '../storage/applications';

export interface HealthCheck {
  id: string;
  label: string;
  ok: boolean;
  message: string;
  details?: string[];
}

export interface HealthReport {
  at: number;
  summary: { passed: number; failed: number };
  checks: HealthCheck[];
}

export async function runHealthCheck(): Promise<HealthReport> {
  const db = getDb();

  const [apps, reports, pdfs] = await Promise.all([
    db.applications.toArray(),
    db.reports.toArray(),
    db.pdfBlobs.toArray(),
  ]);

  const checks: HealthCheck[] = [];

  // 1. all statuses are canonical
  const statusSet = new Set<Status>(STATUS_VALUES);
  const nonCanonical = apps.filter((a) => !statusSet.has(a.status as Status));
  checks.push({
    id: 'canonical-statuses',
    label: 'All application statuses are canonical',
    ok: nonCanonical.length === 0,
    message:
      nonCanonical.length === 0
        ? `${apps.length} applications, all statuses valid`
        : `${nonCanonical.length} applications with invalid status`,
    details: nonCanonical.map((a) => `${a.company} / ${a.role}: "${a.status}"`),
  });

  // 2. every application has a linked report
  const reportIds = new Set(reports.map((r) => r.id));
  const orphanApps = apps.filter((a) => a.reportId !== 'pending' && !reportIds.has(a.reportId));
  checks.push({
    id: 'reports-linked',
    label: 'Every application links to an existing report',
    ok: orphanApps.length === 0,
    message:
      orphanApps.length === 0
        ? `${apps.length} applications, all report links valid`
        : `${orphanApps.length} applications with missing report`,
    details: orphanApps.map((a) => `${a.company} / ${a.role}`),
  });

  // 3. every report links back to an existing application
  const appIds = new Set(apps.map((a) => a.id));
  const orphanReports = reports.filter((r) => !appIds.has(r.applicationId));
  checks.push({
    id: 'reports-reverse',
    label: 'Every report points to a real application',
    ok: orphanReports.length === 0,
    message:
      orphanReports.length === 0
        ? `${reports.length} reports, all application links valid`
        : `${orphanReports.length} orphaned reports`,
    details: orphanReports.map((r) => `${r.company} @ ${r.date}`),
  });

  // 4. no duplicate company+role pairs via fuzzy match
  const dupes: string[] = [];
  const seen: typeof apps = [];
  for (const a of apps) {
    const hit = seen.find(
      (s) =>
        s.company.toLowerCase().trim() === a.company.toLowerCase().trim() &&
        rolesMatch(s.role, a.role),
    );
    if (hit) {
      dupes.push(`${a.company} / ${a.role} (collides with ${hit.company} / ${hit.role})`);
    } else {
      seen.push(a);
    }
  }
  checks.push({
    id: 'no-duplicates',
    label: 'No duplicate applications by fuzzy company+role match',
    ok: dupes.length === 0,
    message:
      dupes.length === 0
        ? `${apps.length} applications, no duplicates`
        : `${dupes.length} potential duplicates found`,
    details: dupes,
  });

  // 5. scores in [0, 5]
  const badScores = apps.filter((a) => a.score < 0 || a.score > 5);
  checks.push({
    id: 'scores-in-range',
    label: 'All scores are in [0, 5]',
    ok: badScores.length === 0,
    message:
      badScores.length === 0
        ? 'all scores valid'
        : `${badScores.length} applications with out-of-range scores`,
    details: badScores.map((a) => `${a.company} / ${a.role}: ${a.score}`),
  });

  // 6. orphaned PDF blobs
  const orphanPdfs = pdfs.filter((p) => !appIds.has(p.applicationId));
  checks.push({
    id: 'no-orphan-pdfs',
    label: 'No orphaned PDF blobs',
    ok: orphanPdfs.length === 0,
    message:
      orphanPdfs.length === 0
        ? `${pdfs.length} PDFs, all linked`
        : `${orphanPdfs.length} orphaned PDFs`,
    details: orphanPdfs.map((p) => p.filename),
  });

  const passed = checks.filter((c) => c.ok).length;
  const failed = checks.length - passed;
  return { at: Date.now(), summary: { passed, failed }, checks };
}
