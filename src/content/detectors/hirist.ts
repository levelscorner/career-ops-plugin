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
 * Hirist.tech detector. Hirist is the developer-focused Indian portal and
 * ships JSON-LD on detail pages. DOM fallback uses their historical class
 * naming. Detail URLs look like https://hirist.tech/j/<slug>-<id>.
 */
export const hiristDetector: Detector = {
  id: 'hirist',

  matches(url) {
    return url.hostname === 'hirist.tech' || url.hostname.endsWith('.hirist.tech');
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
          source: 'hirist',
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
      document.querySelector('.jdheader h1') ??
      document.querySelector('[class*="job-title"]') ??
      document.querySelector('h1');
    const companyEl =
      document.querySelector('.comp-name') ??
      document.querySelector('[class*="company"]');
    const locationEl =
      document.querySelector('.hirer-location') ??
      document.querySelector('[class*="location"]');
    const descriptionEl =
      document.querySelector('.jd-cont') ??
      document.querySelector('[class*="job-desc"]');

    const role = text(titleEl);
    const company = text(companyEl);
    if (!role || !company || !descriptionEl) return null;

    const descriptionMarkdown = markdownFromNode(descriptionEl);
    if (descriptionMarkdown.length < 80) return null;

    return {
      url: window.location.href.split('?')[0] ?? window.location.href,
      source: 'hirist',
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
