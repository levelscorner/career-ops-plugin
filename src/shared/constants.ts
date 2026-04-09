// Canonical constants for career-ops-plugin.
// Ported from knowledge-base/templates/states.yml and knowledge-base/modes/_shared.md.
// Editing here = editing a prompt. Do NOT put user-specific values in this file.

// ---- Application status --------------------------------------------------

export const STATUS_VALUES = [
  'evaluated',
  'applied',
  'responded',
  'interview',
  'offer',
  'rejected',
  'discarded',
  'skip',
] as const;

export type Status = (typeof STATUS_VALUES)[number];

export const STATUS_LABELS: Readonly<Record<Status, string>> = Object.freeze({
  evaluated: 'Evaluated',
  applied: 'Applied',
  responded: 'Responded',
  interview: 'Interview',
  offer: 'Offer',
  rejected: 'Rejected',
  discarded: 'Discarded',
  skip: 'SKIP',
});

export const STATUS_DESCRIPTIONS: Readonly<Record<Status, string>> = Object.freeze({
  evaluated: 'Offer evaluated with report, pending decision',
  applied: 'Application submitted',
  responded: 'Company has responded (not yet interview)',
  interview: 'Active interview process',
  offer: 'Offer received',
  rejected: 'Rejected by company',
  discarded: 'Discarded by candidate or offer closed',
  skip: "Doesn't fit, don't apply",
});

/**
 * Rank used for conflict resolution when merging two rows for the same
 * company+role. Higher rank wins. Ported from dedup-tracker.mjs.
 */
export const STATUS_RANK: Readonly<Record<Status, number>> = Object.freeze({
  offer: 7,
  interview: 6,
  responded: 5,
  applied: 4,
  evaluated: 3,
  rejected: 2,
  discarded: 1,
  skip: 0,
});

/**
 * Non-canonical → canonical status mapping. Ported from normalize-statuses.mjs.
 * Keys are lowercased, trimmed, punctuation-stripped versions.
 */
export const STATUS_ALIASES: Readonly<Record<string, Status>> = Object.freeze({
  // English canonicals (identity)
  evaluated: 'evaluated',
  applied: 'applied',
  responded: 'responded',
  interview: 'interview',
  offer: 'offer',
  rejected: 'rejected',
  discarded: 'discarded',
  skip: 'skip',

  // Spanish
  evaluada: 'evaluated',
  evaluado: 'evaluated',
  aplicado: 'applied',
  aplicada: 'applied',
  enviada: 'applied',
  enviado: 'applied',
  sent: 'applied',
  respondido: 'responded',
  respondida: 'responded',
  entrevista: 'interview',
  oferta: 'offer',
  rechazado: 'rejected',
  rechazada: 'rejected',
  descartado: 'discarded',
  descartada: 'discarded',
  cerrada: 'discarded',
  cancelada: 'discarded',
  'no aplicar': 'skip',
  no_aplicar: 'skip',
  monitor: 'skip',
  'geo blocker': 'skip',
  repost: 'discarded',
  duplicado: 'discarded',

  // German
  bewertet: 'evaluated',
  beworben: 'applied',
  geantwortet: 'responded',
  interviewphase: 'interview',
  angebot: 'offer',
  abgelehnt: 'rejected',
  verworfen: 'discarded',

  // French
  evaluee: 'evaluated',
  evalue: 'evaluated',
  postule: 'applied',
  postulee: 'applied',
  repondu: 'responded',
  entretien: 'interview',
  offre: 'offer',
  refuse: 'rejected',
  refusee: 'rejected',
  abandonne: 'discarded',

  // Portuguese
  avaliada: 'evaluated',
  avaliado: 'evaluated',
  enviadas: 'applied',
  respondeu: 'responded',
  rejeitada: 'rejected',
  rejeitado: 'rejected',
  descartada_pt: 'discarded',
});

/** Normalize any user-supplied status string to a canonical Status, or null. */
export function normalizeStatus(raw: string | null | undefined): Status | null {
  if (!raw) return null;
  const cleaned = raw
    .toLowerCase()
    .replace(/\*+/g, '')
    .replace(/\d{4}-\d{2}-\d{2}/g, '')
    .replace(/[^a-z\s_]/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
  if (!cleaned) return null;
  return STATUS_ALIASES[cleaned] ?? null;
}

// ---- Archetypes ----------------------------------------------------------

export const ARCHETYPE_VALUES = [
  'ai_platform',
  'agentic',
  'technical_pm',
  'solutions_architect',
  'forward_deployed',
  'transformation',
] as const;

export type Archetype = (typeof ARCHETYPE_VALUES)[number];

export const ARCHETYPE_LABELS: Readonly<Record<Archetype, string>> = Object.freeze({
  ai_platform: 'AI Platform / LLMOps',
  agentic: 'Agentic / Automation',
  technical_pm: 'Technical AI PM',
  solutions_architect: 'AI Solutions Architect',
  forward_deployed: 'AI Forward Deployed',
  transformation: 'AI Transformation',
});

export const ARCHETYPE_KEYWORDS: Readonly<Record<Archetype, readonly string[]>> = Object.freeze({
  ai_platform: ['observability', 'evals', 'pipelines', 'monitoring', 'reliability', 'llmops'],
  agentic: ['agent', 'hitl', 'orchestration', 'workflow', 'multi-agent', 'autonomous'],
  technical_pm: ['prd', 'roadmap', 'discovery', 'stakeholder', 'product manager', 'product owner'],
  solutions_architect: [
    'architecture',
    'enterprise',
    'integration',
    'systems design',
    'solution design',
  ],
  forward_deployed: ['client-facing', 'deploy', 'prototype', 'fast delivery', 'forward deployed'],
  transformation: ['change management', 'adoption', 'enablement', 'transformation'],
});

// ---- Scoring dimensions --------------------------------------------------

export const DIMENSION_KEYS = [
  'matchCv',
  'northStar',
  'comp',
  'cultural',
  'redFlags',
] as const;

export type DimensionKey = (typeof DIMENSION_KEYS)[number];

export const DIMENSION_LABELS: Readonly<Record<DimensionKey, string>> = Object.freeze({
  matchCv: 'Match with CV',
  northStar: 'North Star alignment',
  comp: 'Compensation',
  cultural: 'Cultural signals',
  redFlags: 'Red flags',
});

/** Default weights for the global score. Users can override in customization. */
export const DEFAULT_DIMENSION_WEIGHTS: Readonly<Record<DimensionKey, number>> = Object.freeze({
  matchCv: 0.35,
  northStar: 0.25,
  comp: 0.15,
  cultural: 0.15,
  redFlags: 0.1,
});

// ---- Score bands ---------------------------------------------------------

export function scoreBand(score: number): 'strong' | 'good' | 'borderline' | 'weak' {
  if (score >= 4.5) return 'strong';
  if (score >= 4.0) return 'good';
  if (score >= 3.5) return 'borderline';
  return 'weak';
}

export const SCORE_BAND_LABELS = Object.freeze({
  strong: 'Strong match — apply',
  good: 'Good match — worth applying',
  borderline: 'Decent but not ideal',
  weak: 'Recommend against applying',
});

// ---- Claude models -------------------------------------------------------

export const MODELS = [
  {
    id: 'claude-opus-4-6',
    label: 'Claude Opus 4.6',
    family: 'opus',
    contextWindow: 200_000,
    description: 'Deepest reasoning. Use for ambiguous or high-stakes evaluations.',
  },
  {
    id: 'claude-sonnet-4-6',
    label: 'Claude Sonnet 4.6',
    family: 'sonnet',
    contextWindow: 200_000,
    description: 'Default. Best balance of capability, latency, and cost.',
  },
  {
    id: 'claude-haiku-4-5',
    label: 'Claude Haiku 4.5',
    family: 'haiku',
    contextWindow: 200_000,
    description: 'Fastest. Use for batch runs and scans.',
  },
] as const;

export type ModelId = (typeof MODELS)[number]['id'];
export const DEFAULT_MODEL_ID: ModelId = 'claude-sonnet-4-6';

// ---- Languages -----------------------------------------------------------

export const UI_LANGUAGES = ['en', 'es', 'de', 'fr', 'pt'] as const;
export type UiLanguage = (typeof UI_LANGUAGES)[number];

// ---- Portal sources ------------------------------------------------------

export const PORTAL_SOURCES = [
  'greenhouse',
  'lever',
  'ashby',
  'wellfound',
  'smartrecruiters',
  'linkedin',
  'workable',
  // India-specific portals — added in the India market port.
  'naukri',
  'foundit',
  'instahyre',
  'hirist',
  'cutshort',
  'shine',
  'custom',
] as const;

export type PortalSource = (typeof PORTAL_SOURCES)[number];

// ---- Market region -------------------------------------------------------
//
// Controls prompt framing, currency default, and (later) i18n detector hints.
// Adding a new region here means: (1) extending renderMarketContext in
// src/background/llm/modes.ts, (2) adding a tile in the Onboarding market
// step, (3) wiring a currency default in src/background/storage/profile.ts.

export const MARKET_REGIONS = ['global', 'india'] as const;
export type MarketRegion = (typeof MARKET_REGIONS)[number];

export const MARKET_REGION_LABELS: Readonly<Record<MarketRegion, string>> = Object.freeze({
  global: 'Global',
  india: 'India',
});
