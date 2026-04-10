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
 * Naukri.com detector.
 *
 * Naukri is a React SPA. Detail pages URL-pattern is
 *   https://www.naukri.com/job-listings-<slug>-<6-8-digit-id>
 *
 * Primary extraction path is the embedded Google-for-Jobs JSON-LD block,
 * which Naukri keeps reliable because it's their source of SEO traffic.
 * If that's absent (A/B tests, logged-out state), fall back to the DOM.
 */
export const naukriDetector: Detector = {
  id: 'naukri',

  matches(url) {
    // Match any naukri.com page. The content script runs on all naukri.com
    // URLs; extract() returns null if no job posting is found on the page,
    // and the badge stays hidden.
    return url.hostname.endsWith('naukri.com');
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
        // Naukri's JSON-LD sometimes has baseSalary; prefer it, else fall
        // back to regex on the body.
        const salaryFromLd =
          salaryStringFromLd(ld) ?? extractSalary(descriptionMarkdown);
        return {
          url: window.location.href.split('?')[0] ?? window.location.href,
          source: 'naukri',
          company,
          role,
          location: jsonLdLocation(ld),
          remote: pickRemote(`${role} ${descriptionMarkdown}`),
          salary: salaryFromLd,
          descriptionMarkdown,
          language: pickLanguage(descriptionMarkdown),
          extractedAt: Date.now(),
        };
      }
    }

    // DOM fallback. Naukri's search results page is a split layout:
    // job list on the left, detail panel on the right. The detail panel
    // has .job-desc for the description. Title and company come from
    // the first visible job tuple (a.title, a.comp-name).
    //
    // On dedicated detail pages (/job-listings-*), similar selectors
    // work but with different class prefixes. We try multiple paths.
    const titleEl =
      document.querySelector('a.title') ??
      document.querySelector('[class*="jd-header-title"]') ??
      document.querySelector('.job-title a') ??
      document.querySelector('h1');
    const companyEl =
      document.querySelector('a[class*="comp-name"]') ??
      document.querySelector('[class*="jd-header-comp-name"] a') ??
      document.querySelector('[class*="comp-name"]');
    const locationEl =
      document.querySelector('[class*="loc-icon"] + span') ??
      document.querySelector('[class*="location"]') ??
      document.querySelector('[class*="jhc__location"]');
    const salaryEl =
      document.querySelector('[class*="salary"] span') ??
      document.querySelector('[class*="sal-icon"] + span');
    const descriptionEl =
      document.querySelector('.job-desc') ??
      document.querySelector('[class*="JDC__dang-inner-html"]') ??
      document.querySelector('[class*="job-desc"]') ??
      document.querySelector('[class*="jobDescription"]') ??
      document.querySelector('[class*="description"]');

    const role = text(titleEl);
    const company = text(companyEl);
    if (!role || !company || !descriptionEl) return null;

    const descriptionMarkdown = markdownFromNode(descriptionEl);
    if (descriptionMarkdown.length < 80) return null;

    return {
      url: window.location.href.split('?')[0] ?? window.location.href,
      source: 'naukri',
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

function salaryStringFromLd(ld: Record<string, unknown>): string | null {
  const bs = ld.baseSalary as
    | { value?: { minValue?: number; maxValue?: number; unitText?: string }; currency?: string }
    | undefined;
  if (!bs?.value) return null;
  const { minValue, maxValue, unitText } = bs.value;
  if (!minValue && !maxValue) return null;
  const currency = bs.currency ?? 'INR';
  const range =
    minValue && maxValue && minValue !== maxValue
      ? `${minValue}-${maxValue}`
      : String(minValue ?? maxValue);
  return `${currency} ${range}${unitText ? ` ${unitText.toLowerCase()}` : ''}`;
}
