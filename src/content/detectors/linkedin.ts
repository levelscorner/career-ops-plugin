import type { JobPosting } from '../../shared/types';
import type { Detector } from './types';
import { markdownFromNode, pickLanguage, pickRemote, text } from './types';

export const linkedinDetector: Detector = {
  id: 'linkedin',

  matches(url) {
    return url.hostname.endsWith('linkedin.com') && /\/jobs\//.test(url.pathname);
  },

  extract(): JobPosting | null {
    // LinkedIn has two layouts:
    //   - /jobs/view/{id}      -> full page, job-details div
    //   - /jobs/search/?...    -> slide-in panel with top-card + description
    const titleEl =
      document.querySelector('.job-details-jobs-unified-top-card__job-title h1') ??
      document.querySelector('.jobs-unified-top-card__job-title') ??
      document.querySelector('h1[data-test-job-details-title]') ??
      document.querySelector('h1');

    const companyEl =
      document.querySelector('.job-details-jobs-unified-top-card__company-name a') ??
      document.querySelector('.job-details-jobs-unified-top-card__company-name') ??
      document.querySelector('.jobs-unified-top-card__company-name') ??
      document.querySelector('[data-test-job-details-company-name]');

    const locationEl =
      document.querySelector('.job-details-jobs-unified-top-card__primary-description-container span') ??
      document.querySelector('.jobs-unified-top-card__bullet') ??
      document.querySelector('[data-test-job-details-location]');

    const descriptionEl =
      document.querySelector('.jobs-description__content .jobs-description-content__text') ??
      document.querySelector('.jobs-description__container') ??
      document.querySelector('#job-details');

    const title = text(titleEl);
    const company = text(companyEl);
    if (!title || !company || !descriptionEl) return null;

    const descriptionMarkdown = markdownFromNode(descriptionEl);
    if (descriptionMarkdown.length < 80) return null;

    const location = text(locationEl) || null;

    // LinkedIn puts the canonical posting at /jobs/view/{id}/.
    const url = canonicalLinkedInUrl();

    return {
      url,
      source: 'linkedin',
      company,
      role: title,
      location,
      remote: pickRemote(`${title} ${location ?? ''} ${descriptionMarkdown}`),
      salary: extractSalaryFromDescription(descriptionMarkdown),
      descriptionMarkdown,
      language: pickLanguage(descriptionMarkdown),
      extractedAt: Date.now(),
    };
  },
};

function canonicalLinkedInUrl(): string {
  const currentJobId = new URLSearchParams(window.location.search).get('currentJobId');
  if (currentJobId) {
    return `https://www.linkedin.com/jobs/view/${currentJobId}/`;
  }
  const match = window.location.pathname.match(/\/jobs\/view\/(\d+)/);
  if (match) return `https://www.linkedin.com/jobs/view/${match[1]}/`;
  return window.location.origin + window.location.pathname;
}

function extractSalaryFromDescription(md: string): string | null {
  const m = md.match(
    /(\$|€|£|USD|EUR|GBP|CHF)\s?\d{2,3}[.,]?\d{0,3}(?:\s?[-–to]\s?(?:\$|€|£)?\d{2,3}[.,]?\d{0,3})?/i,
  );
  return m ? m[0] : null;
}
