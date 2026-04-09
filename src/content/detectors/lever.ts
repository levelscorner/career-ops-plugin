import type { JobPosting } from '../../shared/types';
import type { Detector } from './types';
import { markdownFromNode, pickLanguage, pickRemote, text } from './types';

export const leverDetector: Detector = {
  id: 'lever',

  matches(url) {
    return url.hostname === 'jobs.lever.co';
  },

  extract(): JobPosting | null {
    const titleEl = document.querySelector('.posting-headline h2, h2');
    const companyEl = document.querySelector(
      '.main-header-logo img, .main-header-logo',
    );
    const locationEl = document.querySelector('.posting-categories .location, .location');
    const descriptionEl = document.querySelector(
      '.section-wrapper.page-full-width, .posting-page, .content-wrapper',
    );

    const title = text(titleEl);
    const company =
      companyEl instanceof HTMLImageElement
        ? companyEl.alt
        : text(companyEl) || companyFromUrl();
    if (!title || !company || !descriptionEl) return null;
    const descriptionMarkdown = markdownFromNode(descriptionEl);
    if (descriptionMarkdown.length < 80) return null;
    return {
      url: window.location.href.split('?')[0] ?? window.location.href,
      source: 'lever',
      company,
      role: title,
      location: text(locationEl) || null,
      remote: pickRemote(`${title} ${descriptionMarkdown}`),
      salary: null,
      descriptionMarkdown,
      language: pickLanguage(descriptionMarkdown),
      extractedAt: Date.now(),
    };
  },
};

function companyFromUrl(): string {
  const parts = window.location.pathname.split('/').filter(Boolean);
  return parts[0] ?? 'unknown';
}
