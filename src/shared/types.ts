// Core domain types for career-ops-plugin.
// These are the shape of data inside Dexie, not yet validated with zod.
// See src/shared/schemas.ts for runtime zod equivalents.

import type {
  Archetype,
  DimensionKey,
  MarketRegion,
  ModelId,
  PortalSource,
  Status,
  UiLanguage,
} from './constants';

// ---- Job data ------------------------------------------------------------

export interface JobPosting {
  /** Canonical URL of the job posting (no query noise). */
  url: string;
  source: PortalSource;
  company: string;
  role: string;
  location: string | null;
  remote: 'remote' | 'hybrid' | 'onsite' | 'unknown';
  salary: string | null;
  descriptionMarkdown: string;
  /** Detected language of the JD (best-effort). */
  language: UiLanguage;
  /** Unix timestamp when the content script extracted it. */
  extractedAt: number;
  /** Any structured extras the detector picked up (level, team, etc.). */
  extras?: Record<string, string>;
}

// ---- Evaluation result (structured output from Claude) ------------------

export interface DimensionScore {
  score: number; // 1..5
  rationale: string;
  evidence: string[]; // cited lines from CV / JD / proof points
}

export interface EvaluationResult {
  archetype: Archetype;
  archetypeSecondary?: Archetype;
  dimensions: Record<DimensionKey, DimensionScore>;
  globalScore: number; // 1..5
  verdict: 'strong' | 'good' | 'borderline' | 'weak';
  tldr: string;
  gaps: Array<{
    requirement: string;
    severity: 'blocker' | 'significant' | 'minor';
    mitigation: string;
  }>;
  dealBreakers: string[];
  keywords: string[];
  reportMarkdown: string;
}

// ---- Persisted tables ----------------------------------------------------

export interface Application {
  id: string; // uuid
  number: number; // sequential display number
  date: string; // YYYY-MM-DD
  company: string;
  role: string;
  url: string;
  score: number;
  status: Status;
  pdfId?: string;
  reportId: string;
  notes: string;
  archetype: Archetype;
  language: UiLanguage;
  createdAt: number;
  updatedAt: number;
}

export interface Report {
  id: string;
  applicationId: string;
  date: string;
  company: string;
  slug: string;
  url: string;
  markdown: string;
  evaluation: EvaluationResult;
  version: number; // for re-evaluations of the same role
}

export interface PipelineItem {
  id: string;
  url: string;
  source: PortalSource;
  notes: string;
  status: 'pending' | 'processing' | 'done' | 'failed';
  lastError?: string;
  createdAt: number;
}

export interface ScanHistoryItem {
  id: string;
  url: string;
  company: string;
  title: string;
  hash: string;
  firstSeenAt: number;
}

export interface InterviewIntel {
  id: string;
  applicationId: string;
  company: string;
  role: string;
  markdown: string;
  storiesUsed: string[];
  createdAt: number;
  updatedAt: number;
}

export interface StarRStory {
  id: string;
  title: string;
  tags: string[];
  situation: string;
  task: string;
  action: string;
  result: string;
  reflection: string;
  createdAt: number;
  updatedAt: number;
}

export interface Profile {
  id: 'singleton';
  fullName: string;
  email: string;
  phone: string;
  location: string;
  timezone: string;
  links: Array<{ label: string; url: string }>;
  targetRoles: string[];
  salaryTarget: { min: number; max: number; currency: string };
  language: UiLanguage;
  /** Which directory of bundled modes/*.md to use. Narrower than UiLanguage because 'es' modes aren't bundled yet. */
  modesDir: 'en' | 'de' | 'fr' | 'pt';
  /**
   * Market region. Controls prompt framing (LPA/CTC, notice period, ESOP
   * norms for India) and default currency. Defaults to 'india' when the
   * detected timezone is Asia/Kolkata — see DEFAULT_PROFILE.
   */
  region: MarketRegion;
  updatedAt: number;
}

export interface OutputToggles {
  gaps: boolean;
  keywords: boolean;
  dealBreakers: boolean;
  rawOutput: boolean;
  salary: boolean;
  interviewTips: boolean;
}

export interface Customization {
  id: 'singleton';
  /** User's own archetype ranking (most → least preferred). */
  archetypeOrder: Archetype[];
  /** Per-archetype narrative the user wants the LLM to emphasize. */
  narrativeByArchetype: Partial<Record<Archetype, string>>;
  /** User-provided proof points (copied verbatim into prompts). */
  proofPoints: string;
  /** Non-standard negotiation scripts or rules. */
  negotiationNotes: string;
  /** Per-dimension weight overrides. */
  weightOverrides: Partial<Record<DimensionKey, number>>;
  /** Deal-breakers the LLM should auto-SKIP. */
  dealBreakers: string[];
  /** Which evaluation output sections are visible in Evaluate/Report views. */
  outputToggles?: OutputToggles;
  updatedAt: number;
}

export interface Cv {
  id: 'singleton';
  markdown: string;
  updatedAt: number;
}

export interface ArticleDigest {
  id: 'singleton';
  markdown: string;
  updatedAt: number;
}

export interface PortalsConfig {
  id: 'singleton';
  companies: Array<{
    name: string;
    source: PortalSource;
    slug: string;
    enabled: boolean;
  }>;
  titleFilter: {
    positive: string[];
    negative: string[];
  };
  queries: string[];
  updatedAt: number;
}

export interface PdfBlob {
  id: string;
  applicationId: string;
  bytes: Blob;
  filename: string;
  createdAt: number;
}

// ---- Settings (chrome.storage.local) ------------------------------------

export interface ExtensionSettings {
  anthropicApiKey: string;
  selectedModel: ModelId;
  language: UiLanguage;
  theme: 'light' | 'dark' | 'auto';
  onboardingComplete: boolean;
  lastUpdateCheck?: number;
}
