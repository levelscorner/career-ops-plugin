// Dev fixture: pre-populated profile and CV for testing the evaluation
// pipeline without going through onboarding. Loaded when chrome.storage.local
// has no profile (dev mode only, never shipped to end users).
//
// Usage: import { seedDevFixtures } from '../fixtures/testProfile';
//        await seedDevFixtures(); // call once from background.ts in dev mode

import type { Profile, Cv, Customization } from '../shared/types';

export const DEV_PROFILE: Profile = {
  id: 'singleton',
  fullName: 'Dev User',
  email: 'dev@example.com',
  phone: '',
  location: 'Bengaluru, India',
  timezone: 'Asia/Kolkata',
  links: [{ label: 'GitHub', url: 'https://github.com/example' }],
  targetRoles: ['Frontend Engineer', 'Full Stack Engineer', 'React Developer'],
  salaryTarget: { min: 2000000, max: 3500000, currency: 'INR' },
  language: 'en',
  modesDir: 'en',
  region: 'india',
  updatedAt: Date.now(),
};

export const DEV_CV: Cv = {
  id: 'singleton',
  markdown: `# Dev User

## Summary
Full stack engineer with 4 years of experience building React/TypeScript
applications. Focused on performance, accessibility, and developer tooling.

## Experience

### Frontend Engineer — Acme Corp (2022–present)
- Built component library used by 12 teams
- Reduced bundle size by 40% via code splitting
- Led migration from JavaScript to TypeScript (98% coverage)

### Junior Developer — StartupCo (2020–2022)
- Shipped 3 customer-facing features per sprint
- Built internal admin dashboard (React + Node)

## Skills
React, TypeScript, Node.js, PostgreSQL, Redis, Docker, AWS, Tailwind CSS,
Vitest, Playwright, Git, CI/CD

## Education
B.Tech Computer Science — IIT Delhi (2020)
`,
  updatedAt: Date.now(),
};

export const DEV_CUSTOMIZATION: Partial<Customization> = {
  id: 'singleton',
  archetypeOrder: ['technical_pm', 'ai_platform', 'agentic'],
  proofPoints: 'Led TypeScript migration for 12-team org. Reduced bundle size 40%.',
  dealBreakers: ['mandatory relocation outside India', 'no remote option'],
  updatedAt: Date.now(),
};

/**
 * Seed Dexie with dev fixtures when no profile exists.
 * Safe to call multiple times — only writes if the profile table is empty.
 */
export async function seedDevFixtures(): Promise<boolean> {
  // Dynamic import to avoid pulling Dexie into the content script bundle.
  const { getDb } = await import('../background/storage/db');
  const db = getDb();

  const existing = await db.profile.get('singleton');
  if (existing) return false; // already has a profile, skip

  await Promise.all([
    db.profile.put(DEV_PROFILE),
    db.cv.put(DEV_CV),
    db.customization.put({
      ...DEV_CUSTOMIZATION,
      narrativeByArchetype: {},
      negotiationNotes: '',
      weightOverrides: {},
    } as Customization),
  ]);

  return true;
}
