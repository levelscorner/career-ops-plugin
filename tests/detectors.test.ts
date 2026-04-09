// Unit tests for the India portal detectors + shared salary/remote helpers.
// Runs under happy-dom via vitest.config.ts.
//
// Each fixture lives under tests/fixtures/<portal>/job.html and represents a
// realistic detail-page snapshot (either with JSON-LD, DOM-only, or both).
// The test loads the fixture into the document, sets window.location.href
// to a matching URL, and asserts the detector returns a JobPosting with the
// right source tag and non-empty required fields.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';

import { naukriDetector } from '../src/content/detectors/naukri';
import { founditDetector } from '../src/content/detectors/foundit';
import { instahyreDetector } from '../src/content/detectors/instahyre';
import { hiristDetector } from '../src/content/detectors/hirist';
import { extractSalary, pickRemote } from '../src/content/detectors/types';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadFixture(relative: string): string {
  return readFileSync(join(__dirname, 'fixtures', relative), 'utf8');
}

function mountPage(html: string, url: string): void {
  // happy-dom: replace the whole document and set location.
  // Parse out <body> to avoid duplicated <html> nodes.
  const body = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? html;
  const headMatch = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i)?.[1] ?? '';
  document.head.innerHTML = headMatch;
  document.body.innerHTML = body;
  // happy-dom allows setting location.href via assignment.
  (window as unknown as { location: Location }).location = new URL(url) as unknown as Location;
}

// ---- extractSalary --------------------------------------------------------

describe('extractSalary', () => {
  it('catches LPA shorthand', () => {
    expect(extractSalary('Comp: 30-45 LPA fixed')).toMatch(/30-45\s*LPA/i);
    expect(extractSalary('12 LPA')).toMatch(/12\s*LPA/i);
    expect(extractSalary('1.5 Cr per year')).toMatch(/1\.5\s*Cr/i);
    expect(extractSalary('₹25 lakhs')).toMatch(/lakhs?/i);
  });

  it('catches ₹ / Rs / INR amounts', () => {
    expect(extractSalary('Salary: ₹12,00,000 - ₹18,00,000')).toBeTruthy();
    expect(extractSalary('Rs. 15 lakh')).toBeTruthy();
    expect(extractSalary('INR 25,00,000')).toBeTruthy();
  });

  it('keeps the western path working', () => {
    expect(extractSalary('$120k - $150k')).toBeTruthy();
    expect(extractSalary('€80,000')).toBeTruthy();
    expect(extractSalary('USD 150,000')).toBeTruthy();
  });

  it('returns null for no match', () => {
    expect(extractSalary('Competitive salary based on experience')).toBeNull();
    expect(extractSalary('')).toBeNull();
  });
});

// ---- pickRemote (India-specific extensions) -------------------------------

describe('pickRemote', () => {
  it('recognises WFH variants', () => {
    expect(pickRemote('100% wfh, no office')).toBe('remote');
    expect(pickRemote('Work from home only')).toBe('remote');
  });

  it('recognises WFO and Indian hybrid phrasing', () => {
    expect(pickRemote('5 days wfo from Bengaluru office')).toBe('onsite');
    expect(pickRemote('Hybrid (3 days from office)')).toBe('hybrid');
    expect(pickRemote('2 days per week')).toBe('hybrid');
  });

  it('falls back to generic signals', () => {
    expect(pickRemote('Fully remote engineering team')).toBe('remote');
    expect(pickRemote('In-office role, Gurugram HQ')).toBe('onsite');
    // A JD that mentions nothing about location should return unknown.
    expect(pickRemote('Full-time engineering position')).toBe('unknown');
  });
});

// ---- Per-portal detectors -------------------------------------------------

describe('naukriDetector', () => {
  beforeEach(() => {
    mountPage(
      loadFixture('naukri/job.html'),
      'https://www.naukri.com/job-listings-senior-ai-engineer-acme-labs-bengaluru-12345',
    );
  });

  it('matches naukri.com URLs with detail path', () => {
    expect(
      naukriDetector.matches(
        new URL('https://www.naukri.com/job-listings-senior-ai-engineer-acme-labs-bengaluru-12345'),
      ),
    ).toBe(true);
  });

  it('prefers JSON-LD over DOM fallback', () => {
    const job = naukriDetector.extract();
    expect(job).not.toBeNull();
    expect(job?.source).toBe('naukri');
    expect(job?.role).toBe('Senior AI Engineer');
    expect(job?.company).toContain('Acme Labs');
    expect(job?.location).toBe('Bengaluru');
    expect(job?.descriptionMarkdown).toContain('LPA');
    expect(job?.descriptionMarkdown.length).toBeGreaterThan(80);
    // baseSalary projection from JSON-LD should beat the LPA regex fallback.
    expect(job?.salary).toMatch(/INR/);
  });
});

describe('founditDetector', () => {
  beforeEach(() => {
    mountPage(
      loadFixture('foundit/job.html'),
      'https://www.foundit.in/job/full-stack-engineer-beta-corp-hyderabad-54321',
    );
  });

  it('matches foundit.in and monsterindia.com', () => {
    expect(founditDetector.matches(new URL('https://www.foundit.in/job/12345'))).toBe(true);
    expect(founditDetector.matches(new URL('https://www.monsterindia.com/job/12345'))).toBe(true);
    expect(founditDetector.matches(new URL('https://www.linkedin.com/jobs/view/12345'))).toBe(false);
  });

  it('extracts JSON-LD JobPosting', () => {
    const job = founditDetector.extract();
    expect(job).not.toBeNull();
    expect(job?.source).toBe('foundit');
    expect(job?.role).toBe('Full Stack Engineer');
    expect(job?.company).toBe('Beta Corp');
    expect(job?.location).toBe('Hyderabad');
    expect(job?.salary).toMatch(/LPA/i);
    expect(job?.remote).toBe('hybrid');
  });
});

describe('instahyreDetector', () => {
  beforeEach(() => {
    mountPage(
      loadFixture('instahyre/job.html'),
      'https://www.instahyre.com/job-98765/principal-ml-engineer',
    );
  });

  it('matches instahyre.com', () => {
    expect(instahyreDetector.matches(new URL('https://www.instahyre.com/job-1'))).toBe(true);
    expect(instahyreDetector.matches(new URL('https://hirist.tech/j/foo'))).toBe(false);
  });

  it('extracts from DOM (no JSON-LD)', () => {
    const job = instahyreDetector.extract();
    expect(job).not.toBeNull();
    expect(job?.source).toBe('instahyre');
    expect(job?.role).toBe('Principal ML Engineer');
    expect(job?.company).toBe('Gamma Fintech');
    expect(job?.location).toBe('Gurugram');
    expect(job?.salary).toMatch(/50-70 LPA/);
    expect(job?.remote).toBe('hybrid');
  });

  it('returns null when .job-details is missing (login wall)', () => {
    document.body.innerHTML = '<div class="login-wall">Please log in</div>';
    expect(instahyreDetector.extract()).toBeNull();
  });
});

describe('hiristDetector', () => {
  beforeEach(() => {
    mountPage(
      loadFixture('hirist/job.html'),
      'https://hirist.tech/j/backend-engineer-golang-delta-platforms-pune-67890',
    );
  });

  it('matches hirist.tech', () => {
    expect(hiristDetector.matches(new URL('https://hirist.tech/j/foo'))).toBe(true);
  });

  it('extracts JSON-LD JobPosting', () => {
    const job = hiristDetector.extract();
    expect(job).not.toBeNull();
    expect(job?.source).toBe('hirist');
    expect(job?.role).toContain('Backend Engineer');
    expect(job?.company).toBe('Delta Platforms');
    expect(job?.location).toBe('Pune');
    expect(job?.salary).toMatch(/lakhs?/i);
    // "WFH with quarterly on-site meetups" → pickRemote sees "wfh"
    expect(job?.remote).toBe('remote');
  });
});
