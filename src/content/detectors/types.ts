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
  if (/\b(100% remote|fully remote|remote only|remote-first)\b/.test(s)) return 'remote';
  if (/\b(hybrid|3 days? (?:in|per week)|office [123] days)\b/.test(s)) return 'hybrid';
  if (/\b(on-?site|in-?office|on-?premise)\b/.test(s)) return 'onsite';
  if (/\bremote\b/.test(s)) return 'remote';
  return 'unknown';
}
