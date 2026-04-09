// Mode loader + user customization interpolation.
//
// At build time, scripts/bundle-modes.mjs writes every .md file under
// src/assets/modes/ into a typed bundle at src/assets/modes.generated.ts.
// This module loads by `${language}:${name}` key and then does a
// mustache-ish replacement for customization fields, so the user's
// archetype ordering / narrative / proof points / weights / dealbreakers
// end up inside the final system prompt without the user ever editing
// the bundled prompt files.

import { MODES, type Mode, type ModeLanguage, type ModeName } from '../../assets/modes.generated';
import type { Customization, Profile } from '../../shared/types';
import {
  ARCHETYPE_LABELS,
  DEFAULT_DIMENSION_WEIGHTS,
  DIMENSION_KEYS,
  DIMENSION_LABELS,
  type DimensionKey,
} from '../../shared/constants';

export interface LoadModeOptions {
  name: ModeName;
  language?: ModeLanguage;
  profile: Profile;
  customization: Customization;
  cvMarkdown: string;
  articleDigestMarkdown: string;
}

export interface BuiltPrompt {
  system: string;
  mode: Mode;
  weights: Record<DimensionKey, number>;
}

/**
 * Build the final system prompt for a mode.
 *
 * Precedence:
 *   1. Bundled _shared.md (always loaded first)
 *   2. Bundled mode prompt
 *   3. User customization (narrative, archetypes, weights, dealbreakers)
 *   4. User data (CV, article digest, profile)
 */
export function buildSystemPrompt(opts: LoadModeOptions): BuiltPrompt {
  const language = opts.language ?? (opts.profile.modesDir as ModeLanguage) ?? 'en';
  const mode = findMode(opts.name, language);
  if (!mode) {
    throw new Error(
      `[modes] mode '${opts.name}' not found for language '${language}' — rerun npm run modes:bundle`,
    );
  }
  const shared = findMode('_shared' as ModeName, language) ?? findMode('_shared' as ModeName, 'en');
  if (!shared) {
    throw new Error(`[modes] _shared.md not found in bundle — rerun npm run modes:bundle`);
  }

  const weights = mergeWeights(opts.customization.weightOverrides);

  const customizationBlock = renderCustomization(opts.customization, weights);
  const profileBlock = renderProfile(opts.profile);
  const cvBlock = opts.cvMarkdown.trim()
    ? `## User CV\n\n${opts.cvMarkdown.trim()}\n`
    : '';
  const digestBlock = opts.articleDigestMarkdown.trim()
    ? `## Proof Points (article-digest)\n\n${opts.articleDigestMarkdown.trim()}\n`
    : '';

  const system = [
    shared.markdown,
    '---',
    mode.markdown,
    '---',
    customizationBlock,
    profileBlock,
    cvBlock,
    digestBlock,
  ]
    .filter(Boolean)
    .join('\n\n');

  return { system, mode, weights };
}

// ---- private ------------------------------------------------------------

function findMode(name: ModeName, language: ModeLanguage): Mode | undefined {
  return (
    MODES[`${language}:${name}`] ??
    (language !== 'en' ? MODES[`en:${name}`] : undefined) ??
    undefined
  );
}

function mergeWeights(
  overrides: Partial<Record<DimensionKey, number>>,
): Record<DimensionKey, number> {
  const merged = { ...DEFAULT_DIMENSION_WEIGHTS } as Record<DimensionKey, number>;
  let sum = 0;
  for (const key of DIMENSION_KEYS) {
    const override = overrides[key];
    if (typeof override === 'number' && Number.isFinite(override) && override >= 0) {
      merged[key] = override;
    }
    sum += merged[key];
  }
  // Renormalize so weights sum to 1 even if user overrides are off-spec.
  if (sum > 0 && Math.abs(sum - 1) > 0.001) {
    for (const key of DIMENSION_KEYS) merged[key] = merged[key] / sum;
  }
  return merged;
}

function renderCustomization(
  customization: Customization,
  weights: Record<DimensionKey, number>,
): string {
  const lines: string[] = ['## User Customization'];

  if (customization.archetypeOrder.length > 0) {
    lines.push('### Archetype Priority (most → least preferred)');
    customization.archetypeOrder.forEach((arch, i) => {
      lines.push(`${i + 1}. ${ARCHETYPE_LABELS[arch]}`);
    });
  }

  const narrative = customization.narrativeByArchetype;
  const narrativeEntries = Object.entries(narrative).filter(([, v]) => v && v.trim());
  if (narrativeEntries.length > 0) {
    lines.push('', '### Narrative by Archetype');
    for (const [arch, text] of narrativeEntries) {
      lines.push(`#### ${ARCHETYPE_LABELS[arch as keyof typeof ARCHETYPE_LABELS] ?? arch}`);
      lines.push(text);
      lines.push('');
    }
  }

  if (customization.proofPoints.trim()) {
    lines.push('### User Proof Points', customization.proofPoints.trim());
  }

  if (customization.negotiationNotes.trim()) {
    lines.push('### Negotiation Notes', customization.negotiationNotes.trim());
  }

  if (customization.dealBreakers.length > 0) {
    lines.push(
      '### Deal-breakers (auto-SKIP if any match)',
      ...customization.dealBreakers.map((d) => `- ${d}`),
    );
  }

  lines.push(
    '',
    '### Scoring Weights',
    ...DIMENSION_KEYS.map((k) => `- ${DIMENSION_LABELS[k]}: ${(weights[k] * 100).toFixed(0)}%`),
  );

  return lines.join('\n');
}

function renderProfile(profile: Profile): string {
  const lines: string[] = ['## Candidate Profile', `**Name:** ${profile.fullName || '(not set)'}`];
  if (profile.email) lines.push(`**Email:** ${profile.email}`);
  if (profile.location) lines.push(`**Location:** ${profile.location}`);
  if (profile.targetRoles.length > 0) {
    lines.push(`**Target roles:** ${profile.targetRoles.join(', ')}`);
  }
  if (profile.salaryTarget.min > 0 || profile.salaryTarget.max > 0) {
    lines.push(
      `**Salary target:** ${profile.salaryTarget.currency} ${profile.salaryTarget.min}–${profile.salaryTarget.max}`,
    );
  }
  if (profile.links.length > 0) {
    lines.push('**Links:**');
    for (const l of profile.links) lines.push(`- ${l.label}: ${l.url}`);
  }
  return lines.join('\n');
}
