// Shared JSON-LD JobPosting parser.
//
// Most Indian portals (Naukri, Foundit, Hirist, Cutshort, Shine) ship a
// Google-for-Jobs <script type="application/ld+json"> block on their detail
// pages. This helper walks every such script, looks for an @type=JobPosting
// object anywhere inside (including @graph nests and array wrappers), and
// returns it so the per-portal detector can project it into a JobPosting.
//
// The same walker powers genericDetector as a last-resort fallback.

export function findJobPostingLd(): Record<string, unknown> | null {
  const scripts = document.querySelectorAll<HTMLScriptElement>(
    'script[type="application/ld+json"]',
  );
  for (const script of scripts) {
    if (!script.textContent) continue;
    try {
      const parsed = JSON.parse(script.textContent) as unknown;
      const found = walk(parsed);
      if (found) return found;
    } catch {
      // malformed JSON-LD is surprisingly common on third-party sites — skip
    }
  }
  return null;
}

function walk(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') return null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const hit = walk(item);
      if (hit) return hit;
    }
    return null;
  }
  const obj = value as Record<string, unknown>;
  const type = obj['@type'];
  if (
    type === 'JobPosting' ||
    (Array.isArray(type) && (type as unknown[]).includes('JobPosting'))
  ) {
    return obj;
  }
  const graph = obj['@graph'];
  if (graph) return walk(graph);
  return null;
}

/**
 * Pull the display name out of the possibly-nested hiringOrganization field.
 * Handles the three shapes that appear in the wild:
 *   { hiringOrganization: "Acme" }
 *   { hiringOrganization: { name: "Acme" } }
 *   { hiringOrganization: [{ name: "Acme" }] }
 */
export function jsonLdCompany(ld: Record<string, unknown>): string {
  const org = ld.hiringOrganization;
  if (!org) return '';
  if (typeof org === 'string') return org.trim();
  if (Array.isArray(org)) {
    const first = org[0] as { name?: string } | undefined;
    return String(first?.name ?? '').trim();
  }
  return String((org as { name?: string }).name ?? '').trim();
}

/**
 * Pull a locality out of jobLocation. JobPosting allows either a single
 * Place object or an array of them.
 */
export function jsonLdLocation(ld: Record<string, unknown>): string | null {
  const loc = ld.jobLocation;
  if (!loc) return null;
  const first = Array.isArray(loc) ? loc[0] : loc;
  const address = (first as { address?: { addressLocality?: string } })?.address;
  return address?.addressLocality ?? null;
}
