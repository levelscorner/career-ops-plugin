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
 * Foundit.in (formerly Monster India) detector.
 *
 * Covers both the rebranded foundit.in and the legacy monsterindia.com
 * hostname that still redirects through to the same backend for some
 * postings. Foundit's detail pages reliably ship JSON-LD.
 */
export const founditDetector: Detector = {
  id: 'foundit',

  matches(url) {
    return (
      url.hostname.endsWith('foundit.in') || url.hostname.endsWith('monsterindia.com')
    );
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
          source: 'foundit',
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

    const titleEl =
      document.querySelector('.jobTuple h1') ??
      document.querySelector('[class*="job-title"]') ??
      document.querySelector('h1');
    const companyEl =
      document.querySelector('.jd-company-name') ??
      document.querySelector('[class*="company-name"]');
    const locationEl =
      document.querySelector('.jd-job-loc') ??
      document.querySelector('[class*="job-loc"]');
    const descriptionEl =
      document.querySelector('.jd-desc-content') ??
      document.querySelector('[class*="job-desc"]');

    const role = text(titleEl);
    const company = text(companyEl);
    if (!role || !company || !descriptionEl) return null;

    const descriptionMarkdown = markdownFromNode(descriptionEl);
    if (descriptionMarkdown.length < 80) return null;

    return {
      url: window.location.href.split('?')[0] ?? window.location.href,
      source: 'foundit',
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
