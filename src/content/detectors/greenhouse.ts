import type { JobPosting } from '../../shared/types';
import type { Detector } from './types';
import { markdownFromNode, pickLanguage, pickRemote, text } from './types';

export const greenhouseDetector: Detector = {
  id: 'greenhouse',

  matches(url) {
    return url.hostname === 'boards.greenhouse.io' || url.hostname.endsWith('.greenhouse.io');
  },

  extract(): JobPosting | null {
    const titleEl = document.querySelector('h1.app-title, h1');
    const companyEl = document.querySelector('.company-name, .main-header a');
    const locationEl = document.querySelector('.location');
    const descriptionEl = document.querySelector('#content, .opening, #main');

    const title = text(titleEl);
    const companyRaw = text(companyEl);
    const company = companyRaw.replace(/^at\s+/i, '').trim() || slugFromUrl();
    if (!title || !company || !descriptionEl) return null;

    const descriptionMarkdown = markdownFromNode(descriptionEl);
    if (descriptionMarkdown.length < 80) return null;

    return {
      url: window.location.href.split('?')[0] ?? window.location.href,
      source: 'greenhouse',
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

function slugFromUrl(): string {
  const parts = window.location.pathname.split('/').filter(Boolean);
  return parts[0] ?? 'unknown';
}
