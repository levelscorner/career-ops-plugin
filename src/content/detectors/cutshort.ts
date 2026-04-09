import type { JobPosting } from '../../shared/types';
import type { Detector } from './types';
import {
  extractSalary,
  markdownFromNode,
  pickLanguage,
  pickRemote,
  text,
} from './types';
import { findJobPostingLd, jsonLdCompany, jsonLdLocation } from './json-ld';

/**
 * Cutshort.io detector. JSON-LD is the primary path; DOM fallback covers
 * logged-out views that render a teaser card without the full schema.
 */
export const cutshortDetector: Detector = {
  id: 'cutshort',

  matches(url) {
    return url.hostname === 'cutshort.io' || url.hostname.endsWith('.cutshort.io');
  },

  extract(): JobPosting | null {
    const ld = findJobPostingLd();
    if (ld) {
      const role = String(ld.title ?? '').trim();
      const company = jsonLdCompany(ld);
      const description = String(ld.description ?? '');
      if (role && company && description.length > 50) {
        const tmp = document.createElement('div');
        tmp.innerHTML = description;
        const descriptionMarkdown = markdownFromNode(tmp);
        return {
          url: window.location.href.split('?')[0] ?? window.location.href,
          source: 'cutshort',
          company,
          role,
          location: jsonLdLocation(ld),
          remote: pickRemote(`${role} ${descriptionMarkdown}`),
          salary: extractSalary(descriptionMarkdown),
          descriptionMarkdown,
          language: pickLanguage(descriptionMarkdown),
          extractedAt: Date.now(),
        };
      }
    }

    const titleEl = document.querySelector('h1, [class*="job-title"]');
    const companyEl = document.querySelector('[class*="company"], [class*="employer"]');
    const descriptionEl = document.querySelector(
      '[class*="job-description"], [class*="description"]',
    );
    const locationEl = document.querySelector('[class*="location"]');

    const role = text(titleEl);
    const company = text(companyEl);
    if (!role || !company || !descriptionEl) return null;
    const descriptionMarkdown = markdownFromNode(descriptionEl);
    if (descriptionMarkdown.length < 80) return null;

    return {
      url: window.location.href.split('?')[0] ?? window.location.href,
      source: 'cutshort',
      company,
      role,
      location: text(locationEl) || null,
      remote: pickRemote(`${role} ${descriptionMarkdown}`),
      salary: extractSalary(descriptionMarkdown),
      descriptionMarkdown,
      language: pickLanguage(descriptionMarkdown),
      extractedAt: Date.now(),
    };
  },
};
