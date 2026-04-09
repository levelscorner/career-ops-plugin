import type { JobPosting } from '../../shared/types';
import type { Detector } from './types';
import { markdownFromNode, pickLanguage, pickRemote } from './types';
import { findJobPostingLd, jsonLdCompany, jsonLdLocation } from './json-ld';

/**
 * Last-resort detector that looks for schema.org JobPosting JSON-LD.
 * This is what most well-behaved job boards ship for Google for Jobs.
 * Shares the JSON-LD walker with every Indian portal detector.
 */
export const genericDetector: Detector = {
  id: 'generic',

  matches() {
    return !!findJobPostingLd();
  },

  extract(): JobPosting | null {
    const ld = findJobPostingLd();
    if (!ld) return null;
    const title = String(ld.title ?? '').trim();
    const company = jsonLdCompany(ld);
    if (!title || !company) return null;
    const descriptionHtml = String(ld.description ?? '');
    const tmp = document.createElement('div');
    tmp.innerHTML = descriptionHtml;
    const descriptionMarkdown = markdownFromNode(tmp);
    if (descriptionMarkdown.length < 80) return null;

    return {
      url: window.location.href.split('?')[0] ?? window.location.href,
      source: 'custom',
      company,
      role: title,
      location: jsonLdLocation(ld),
      remote: pickRemote(`${title} ${descriptionMarkdown}`),
      salary: null,
      descriptionMarkdown,
      language: pickLanguage(descriptionMarkdown),
      extractedAt: Date.now(),
    };
  },
};
