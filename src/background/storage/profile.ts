// Profile + customization + CV + article digest singletons.
// Each table has exactly one row keyed 'singleton'.

import type { ArticleDigest, Customization, Cv, Profile } from '../../shared/types';
import { DEFAULT_DIMENSION_WEIGHTS, type MarketRegion } from '../../shared/constants';
import { getDb } from './db';

/**
 * Guess the user's market region from their browser timezone so a first-run
 * Indian user lands in India mode (INR + LPA-aware prompts) without having
 * to touch Settings. Users outside India keep the global default.
 */
function detectRegion(): MarketRegion {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return tz === 'Asia/Kolkata' ? 'india' : 'global';
  } catch {
    return 'global';
  }
}

function defaultCurrency(region: MarketRegion): string {
  return region === 'india' ? 'INR' : 'USD';
}

function buildDefaultProfile(): Profile {
  const region = detectRegion();
  return {
    id: 'singleton',
    fullName: '',
    email: '',
    phone: '',
    location: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    links: [],
    targetRoles: [],
    salaryTarget: { min: 0, max: 0, currency: defaultCurrency(region) },
    language: 'en',
    modesDir: 'en',
    region,
    updatedAt: 0,
  };
}

const DEFAULT_CUSTOMIZATION: Customization = Object.freeze({
  id: 'singleton',
  archetypeOrder: [],
  narrativeByArchetype: {},
  proofPoints: '',
  negotiationNotes: '',
  weightOverrides: { ...DEFAULT_DIMENSION_WEIGHTS },
  dealBreakers: [],
  updatedAt: 0,
});

export async function getProfile(): Promise<Profile> {
  const db = getDb();
  const stored = await db.profile.get('singleton');
  if (stored) {
    // Backfill region for rows persisted before the India port. This is the
    // no-migration path described in the plan: schema default + getter
    // backfill means old rows keep working without a Dexie version bump.
    return stored.region ? stored : { ...stored, region: detectRegion() };
  }
  return buildDefaultProfile();
}

export async function saveProfile(patch: Partial<Profile>): Promise<Profile> {
  const db = getDb();
  const current = await getProfile();
  const next: Profile = { ...current, ...patch, id: 'singleton', updatedAt: Date.now() };
  await db.profile.put(next);
  return next;
}

export async function getCustomization(): Promise<Customization> {
  const db = getDb();
  const stored = await db.customization.get('singleton');
  return stored ?? { ...DEFAULT_CUSTOMIZATION };
}

export async function saveCustomization(
  patch: Partial<Customization>,
): Promise<Customization> {
  const db = getDb();
  const current = await getCustomization();
  const next: Customization = { ...current, ...patch, id: 'singleton', updatedAt: Date.now() };
  await db.customization.put(next);
  return next;
}

export async function getCv(): Promise<Cv> {
  const db = getDb();
  return (
    (await db.cv.get('singleton')) ?? { id: 'singleton', markdown: '', updatedAt: 0 }
  );
}

export async function saveCv(markdown: string): Promise<Cv> {
  const next: Cv = { id: 'singleton', markdown, updatedAt: Date.now() };
  await getDb().cv.put(next);
  return next;
}

export async function getArticleDigest(): Promise<ArticleDigest> {
  const db = getDb();
  return (
    (await db.articleDigest.get('singleton')) ?? {
      id: 'singleton',
      markdown: '',
      updatedAt: 0,
    }
  );
}

export async function saveArticleDigest(markdown: string): Promise<ArticleDigest> {
  const next: ArticleDigest = { id: 'singleton', markdown, updatedAt: Date.now() };
  await getDb().articleDigest.put(next);
  return next;
}
