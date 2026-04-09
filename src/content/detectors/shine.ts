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
 * Shine.com detector. Like the other Indian boards, the primary path is
 * Google-for-Jobs JSON-LD.
 */
export const shineDetector: Detector = {
  id: 'shine',

  matches(url) {
    return url.hostname.endsWith('shine.com');
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
          source: 'shine',
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
      document.querySelector('.jobDetailHeader h1') ??
      document.querySelector('[class*="jobTitle"]') ??
      document.querySelector('h1');
    const companyEl =
      document.querySelector('.jobDetailHeader [class*="company"]') ??
      document.querySelector('[class*="companyName"]');
    const locationEl = document.querySelector('[class*="jobLocation"]');
    const descriptionEl =
      document.querySelector('.jobDescription') ??
      document.querySelector('[class*="jobDescription"]');

    const role = text(titleEl);
    const company = text(companyEl);
    if (!role || !company || !descriptionEl) return null;
    const descriptionMarkdown = markdownFromNode(descriptionEl);
    if (descriptionMarkdown.length < 80) return null;

    return {
      url: window.location.href.split('?')[0] ?? window.location.href,
      source: 'shine',
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
