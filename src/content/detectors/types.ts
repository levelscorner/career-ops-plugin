import type { JobPosting } from '../../shared/types';

export interface Detector {
  /** Stable id for logging / detector selection. */
  readonly id: string;
  /** Does this detector claim the current page? Cheap test. */
  matches(url: URL): boolean;
  /** Extract a JobPosting from the current DOM. Returns null if incomplete. */
  extract(): JobPosting | null;
}

// ---- Shared helpers ----------------------------------------------------

export function text(el: Element | null | undefined): string {
  return (el?.textContent ?? '').trim().replace(/\s+/g, ' ');
}

export function markdownFromNode(el: Element | null | undefined): string {
  if (!el) return '';
  // Very light HTML→markdown: preserve headings, paragraphs, list items.
  const lines: string[] = [];
  const walk = (node: Node, depth: number) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const t = (node.textContent ?? '').replace(/\s+/g, ' ').trim();
      if (t) lines.push(t);
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const tag = (node as Element).tagName.toLowerCase();
    if (tag === 'br') {
      lines.push('');
      return;
    }
    if (/^h[1-6]$/.test(tag)) {
      const level = Math.min(depth + 2, 4);
      lines.push('', `${'#'.repeat(level)} ${text(node as Element)}`, '');
      return;
    }
    if (tag === 'p') {
      lines.push('', text(node as Element), '');
      return;
    }
    if (tag === 'li') {
      lines.push(`- ${text(node as Element)}`);
      return;
    }
    if (tag === 'ul' || tag === 'ol') {
      for (const child of Array.from(node.childNodes)) walk(child, depth + 1);
      lines.push('');
      return;
    }
    for (const child of Array.from(node.childNodes)) walk(child, depth);
  };
  walk(el, 0);
  return lines
    .map((l) => l.trim())
    .filter((l, i, arr) => !(l === '' && arr[i - 1] === ''))
    .join('\n')
    .trim();
}

export function pickLanguage(raw: string): JobPosting['language'] {
  const s = raw.toLowerCase().slice(0, 500);
  if (/\b(der|die|das|und|wir suchen|mitarbeiter)\b/.test(s)) return 'de';
  if (/\b(nous|recherchons|poste|équipe|télétravail)\b/.test(s)) return 'fr';
  if (/\b(estamos|buscamos|equipo|puesto|nuestra)\b/.test(s)) return 'es';
  if (/\b(procuramos|equipe|nossa|vaga|brasil|português)\b/.test(s)) return 'pt';
  return 'en';
}

export function pickRemote(raw: string): JobPosting['remote'] {
  const s = raw.toLowerCase();
  // Priority order — more specific signals first.
  //
  //   1. Hard-remote idioms (100% remote, fully remote, WFH, remote-first).
  //      Indian JDs treat "WFH" as the primary remote marker, so it MUST
  //      beat any later "on-site" mention (which usually refers to
  //      quarterly meetups in an otherwise-remote role).
  //   2. Hybrid: 1-4 days / week, hybrid (N days), [1-4] days wfo.
  //      A 5-day week is not hybrid — it's onsite.
  //   3. Onsite: on-site / in-office / WFO only / 5 days wfo.
  //   4. Any remaining mention of "remote" as a catch-all.
  if (
    /\b(100% remote|fully remote|remote only|remote[- ]first|wfh|work from home)\b/.test(s)
  ) {
    return 'remote';
  }
  if (
    /\b(hybrid|[1-4] days? (?:in|per week|from office|wfo)|office [1-4] days|hybrid\s*\(\s*[1-4]\s*days?)\b/.test(
      s,
    )
  ) {
    return 'hybrid';
  }
  if (
    /\b(on-?site|in-?office|on-?premise|work from office|wfo|5 days? (?:in|per week|from office|wfo)|based (?:in|at) (?:our )?office)\b/.test(
      s,
    )
  ) {
    return 'onsite';
  }
  if (/\bremote\b/.test(s)) return 'remote';
  return 'unknown';
}

/**
 * Extract a salary string from free-form JD text.
 *
 * Matches, in order of precedence:
 *   1. Indian shorthand:  "12 LPA", "12-18 LPA", "12 lakhs", "1.5 Cr"
 *   2. ₹ / Rs / INR:      "₹12,00,000", "Rs. 15 lakh", "INR 25,00,000"
 *   3. Western currency:  "$120k", "€80,000", "£90k-£110k", "USD 150,000"
 *
 * Returns the raw matched substring so the downstream display can render it
 * as-shipped ("12-18 LPA") instead of normalizing it into a number the user
 * didn't write. Returns null if nothing matches.
 *
 * Shared by every detector via `./types` — each portal's extractor calls
 * this once on either the JD body or (better) on any salary-specific DOM
 * node the portal exposes.
 */
const LPA_RE =
  /\b\d+(?:\.\d+)?\s*(?:-\s*\d+(?:\.\d+)?)?\s*(?:lpa|l\s*pa|lakhs?|lac|lacs|crores?|cr)\b/i;
const INR_RE = /(?:₹|rs\.?|inr)\s?\d{1,3}(?:[,\s.]\d{2,3})*(?:\.\d+)?(?:\s*(?:lpa|lakhs?|cr))?/i;
const WESTERN_RE =
  /(?:\$|€|£|usd|eur|gbp|chf)\s?\d{1,3}(?:[.,]?\d{1,3})*(?:k)?(?:\s?[-–to]+\s?(?:\$|€|£)?\d{1,3}(?:[.,]?\d{1,3})*(?:k)?)?/i;

export function extractSalary(raw: string): string | null {
  if (!raw) return null;
  return (
    raw.match(LPA_RE)?.[0] ??
    raw.match(INR_RE)?.[0] ??
    raw.match(WESTERN_RE)?.[0] ??
    null
  );
}
