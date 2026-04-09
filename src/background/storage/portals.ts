// Portals singleton — loaded at first run from
// knowledge-base/templates/portals.example.yml and then user-editable.

import yaml from 'js-yaml';
import type { PortalSource } from '../../shared/constants';
import type { PortalsConfig } from '../../shared/types';
import { getDb } from './db';

const EMPTY: PortalsConfig = Object.freeze({
  id: 'singleton',
  companies: [],
  titleFilter: { positive: [], negative: [] },
  queries: [],
  updatedAt: 0,
});

export async function getPortals(): Promise<PortalsConfig> {
  return (await getDb().portals.get('singleton')) ?? { ...EMPTY };
}

export async function savePortals(patch: Partial<PortalsConfig>): Promise<PortalsConfig> {
  const current = await getPortals();
  const next: PortalsConfig = {
    ...current,
    ...patch,
    id: 'singleton',
    updatedAt: Date.now(),
  };
  await getDb().portals.put(next);
  return next;
}

/**
 * Seed the portals table from the YAML shipped in knowledge-base.
 * The YAML is bundled into the extension as a raw text import so it
 * works inside the service worker. Called once from onboarding.
 */
export function parsePortalsYaml(raw: string): PortalsConfig {
  const doc = yaml.load(raw) as Record<string, unknown>;
  const companies = Array.isArray(doc?.companies) ? (doc.companies as unknown[]) : [];
  const titleFilter = (doc?.title_filter ?? doc?.titleFilter ?? {}) as {
    positive?: string[];
    negative?: string[];
  };
  return {
    id: 'singleton',
    companies: companies
      .map((c) => {
        const raw = c as Record<string, unknown>;
        const source = String(raw.source ?? 'custom') as PortalSource;
        return {
          name: String(raw.name ?? ''),
          source,
          slug: String(raw.slug ?? raw.name ?? ''),
          enabled: raw.enabled !== false,
        };
      })
      .filter((c) => c.name.length > 0),
    titleFilter: {
      positive: Array.isArray(titleFilter.positive) ? titleFilter.positive.map(String) : [],
      negative: Array.isArray(titleFilter.negative) ? titleFilter.negative.map(String) : [],
    },
    queries: Array.isArray(doc?.queries) ? (doc.queries as string[]).map(String) : [],
    updatedAt: Date.now(),
  };
}
