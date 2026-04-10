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
    return (
      url.hostname.endsWith('naukri.com') &&
      (/\/job-listings-/.test(url.pathname) ||
        /\/jobs\//.test(url.pathname) ||
        /\/job\//.test(url.pathname))
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

    // DOM fallback. Naukri rotates classnames behind a CSS-module hash, so
    // we query a set of stable-ish attributes and tag substrings.
    const titleEl =
      document.querySelector('[class*="jd-header-title"]') ??
      document.querySelector('h1');
    const companyEl =
      document.querySelector('[class*="jd-header-comp-name"] a') ??
      document.querySelector('[class*="jd-header-comp-name"]');
    const locationEl =
      document.querySelector('[class*="jhc__location"]') ??
      document.querySelector('[class*="loc"] span');
    const salaryEl = document.querySelector('[class*="salary"] span');
    const descriptionEl =
      document.querySelector('[class*="JDC__dang-inner-html"]') ??
      document.querySelector('.job-desc') ??
      document.querySelector('[class*="jobDescription"]');

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
