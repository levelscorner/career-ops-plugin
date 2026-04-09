// zod schemas for runtime validation of data coming from the LLM,
// from content scripts, or being imported from disk.
// The static types in ./types.ts are the source of truth for shapes;
// these schemas ensure data we don't trust actually matches.

import { z } from 'zod';
import {
  ARCHETYPE_VALUES,
  DIMENSION_KEYS,
  MODELS,
  PORTAL_SOURCES,
  STATUS_VALUES,
  UI_LANGUAGES,
} from './constants';

// ---- enums --------------------------------------------------------------

export const zStatus = z.enum(STATUS_VALUES);
export const zArchetype = z.enum(ARCHETYPE_VALUES);
export const zPortalSource = z.enum(PORTAL_SOURCES);
export const zUiLanguage = z.enum(UI_LANGUAGES);
export const zModelId = z.enum(MODELS.map((m) => m.id) as [string, ...string[]]);

// ---- Job posting --------------------------------------------------------

export const zJobPosting = z.object({
  url: z.string().url(),
  source: zPortalSource,
  company: z.string().min(1),
  role: z.string().min(1),
  location: z.string().nullable(),
  remote: z.enum(['remote', 'hybrid', 'onsite', 'unknown']),
  salary: z.string().nullable(),
  descriptionMarkdown: z.string().min(20, 'JD is suspiciously short'),
  language: zUiLanguage,
  extractedAt: z.number().int(),
  extras: z.record(z.string()).optional(),
});

// ---- Evaluation result (structured LLM output) --------------------------

const zDimensionScore = z.object({
  score: z.number().min(1).max(5),
  rationale: z.string(),
  evidence: z.array(z.string()).default([]),
});

const zGap = z.object({
  requirement: z.string(),
  severity: z.enum(['blocker', 'significant', 'minor']),
  mitigation: z.string(),
});

export const zEvaluationResult = z.object({
  archetype: zArchetype,
  archetypeSecondary: zArchetype.optional(),
  dimensions: z
    .object(Object.fromEntries(DIMENSION_KEYS.map((k) => [k, zDimensionScore])) as Record<
      (typeof DIMENSION_KEYS)[number],
      typeof zDimensionScore
    >)
    .strict(),
  globalScore: z.number().min(1).max(5),
  verdict: z.enum(['strong', 'good', 'borderline', 'weak']),
  tldr: z.string(),
  gaps: z.array(zGap).default([]),
  dealBreakers: z.array(z.string()).default([]),
  keywords: z.array(z.string()).default([]),
  reportMarkdown: z.string().min(50, 'report markdown is suspiciously short'),
});

export type EvaluationResultInput = z.input<typeof zEvaluationResult>;

// ---- Application (tracker row) ------------------------------------------

export const zApplication = z.object({
  id: z.string(),
  number: z.number().int().nonnegative(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  company: z.string(),
  role: z.string(),
  url: z.string().url(),
  score: z.number().min(0).max(5),
  status: zStatus,
  pdfId: z.string().optional(),
  reportId: z.string(),
  notes: z.string().default(''),
  archetype: zArchetype,
  language: zUiLanguage,
  createdAt: z.number(),
  updatedAt: z.number(),
});

// ---- Profile ------------------------------------------------------------

export const zProfile = z.object({
  id: z.literal('singleton'),
  fullName: z.string(),
  email: z.string().email().or(z.literal('')),
  phone: z.string(),
  location: z.string(),
  timezone: z.string(),
  links: z
    .array(z.object({ label: z.string(), url: z.string().url() }))
    .default([]),
  targetRoles: z.array(z.string()).default([]),
  salaryTarget: z.object({
    min: z.number().nonnegative(),
    max: z.number().nonnegative(),
    currency: z.string().length(3),
  }),
  language: zUiLanguage,
  modesDir: z.enum(['en', 'de', 'fr', 'pt']),
  updatedAt: z.number(),
});

// ---- Customization ------------------------------------------------------

export const zCustomization = z.object({
  id: z.literal('singleton'),
  archetypeOrder: z.array(zArchetype).default([]),
  narrativeByArchetype: z.record(zArchetype, z.string()).default({}),
  proofPoints: z.string().default(''),
  negotiationNotes: z.string().default(''),
  weightOverrides: z
    .object(
      Object.fromEntries(DIMENSION_KEYS.map((k) => [k, z.number().min(0).max(1).optional()])) as Record<
        (typeof DIMENSION_KEYS)[number],
        z.ZodOptional<z.ZodNumber>
      >,
    )
    .default({}),
  dealBreakers: z.array(z.string()).default([]),
  updatedAt: z.number(),
});

// ---- Portals ------------------------------------------------------------

export const zPortalsConfig = z.object({
  id: z.literal('singleton'),
  companies: z
    .array(
      z.object({
        name: z.string(),
        source: zPortalSource,
        slug: z.string(),
        enabled: z.boolean().default(true),
      }),
    )
    .default([]),
  titleFilter: z.object({
    positive: z.array(z.string()).default([]),
    negative: z.array(z.string()).default([]),
  }),
  queries: z.array(z.string()).default([]),
  updatedAt: z.number(),
});

// ---- Settings -----------------------------------------------------------

export const zExtensionSettings = z.object({
  anthropicApiKey: z.string().default(''),
  selectedModel: zModelId,
  language: zUiLanguage,
  theme: z.enum(['light', 'dark', 'auto']),
  onboardingComplete: z.boolean().default(false),
  lastUpdateCheck: z.number().optional(),
});

export type ExtensionSettingsInput = z.input<typeof zExtensionSettings>;
