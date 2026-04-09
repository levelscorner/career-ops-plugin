import type { JobPosting } from '../../shared/types';
import type { Detector } from './types';
import {
  extractSalary,
  markdownFromNode,
  pickLanguage,
  pickRemote,
  text,
} from './types';

/**
 * Instahyre detector.
 *
 * Instahyre gates detail pages behind a login. The content script only runs
 * if the user is authenticated in the active tab, which means by the time
 * extract() fires, either the .job-details panel is populated or the page
 * is showing a login wall — in which case we short-circuit to null and
 * the badge won't appear.
 *
 * No reliable JSON-LD block is present on Instahyre (their SEO strategy is
 * the public /job-list/ listing, not the detail pages). DOM-only extraction.
 */
export const instahyreDetector: Detector = {
  id: 'instahyre',

  matches(url) {
    return url.hostname === 'www.instahyre.com' || url.hostname === 'instahyre.com';
  },

  extract(): JobPosting | null {
    const gate = document.querySelector('.job-details, [class*="jobDetails"]');
    if (!gate) return null;

    const titleEl =
      document.querySelector('.job-details .job-title') ??
      document.querySelector('[class*="jobTitle"]') ??
      document.querySelector('h1');
    const companyEl =
      document.querySelector('.job-details .company-name') ??
      document.querySelector('[class*="companyName"]');
    const locationEl =
      document.querySelector('.job-details .location') ??
      document.querySelector('[class*="jobLocation"]');
    const salaryEl =
      document.querySelector('.job-details .salary') ??
      document.querySelector('[class*="salary"]');
    const descriptionEl =
      document.querySelector('.job-details .job-description') ??
      document.querySelector('[class*="jobDescription"]');

    const role = text(titleEl);
    const company = text(companyEl);
    if (!role || !company || !descriptionEl) return null;

    const descriptionMarkdown = markdownFromNode(descriptionEl);
    if (descriptionMarkdown.length < 80) return null;

    return {
      url: window.location.href.split('?')[0] ?? window.location.href,
      source: 'instahyre',
      company,
      role,
      location: text(locationEl) || null,
      remote: pickRemote(`${role} ${descriptionMarkdown}`),
      salary: text(salaryEl) || extractSalary(descriptionMarkdown),
      descriptionMarkdown,
      language: pickLanguage(descriptionMarkdown),
      extractedAt: Date.now(),
    };
  },
};
