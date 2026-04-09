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
  const marketBlock = renderMarketContext(opts.profile);
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
    marketBlock,
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

/**
 * Market-specific framing appended after the profile block.
 *
 * Returns an empty string for `region === 'global'` so the current global
 * behaviour is bit-identical. For `region === 'india'`, injects a compact
 * block that teaches the model Indian comp idioms, notice-period norms,
 * company-type pattern recognition, metro relocation, and ESOP pitfalls.
 *
 * This is the ONLY place region-specific text lives. Adding a new region
 * later (`'us'`, `'uk'`, `'eu'`, `'sea'`) is a switch statement away.
 *
 * Deliberately kept as TypeScript (not a new file under src/assets/modes/)
 * because the plan is explicit: the block is small, it's derived from a
 * profile attribute, and a new markdown file would force a ModeName
 * widening + modes:bundle re-run for zero benefit.
 */
function renderMarketContext(profile: Profile): string {
  if (profile.region !== 'india') return '';
  return `## India Market Context

You are evaluating an Indian job market offer. Apply the following lenses
in addition to the global scoring rules. Use WebSearch for current comp
bands — these are framing notes, not hardcoded numbers.

### Compensation idioms
- Quote all comp in **LPA** (Lakhs Per Annum). 1 LPA = ₹100,000 / year.
- **Always decompose CTC** into: **base + variable + joining bonus +
  retention + ESOP notional**. Never fold variable into base when comparing
  offers. A "₹40 LPA CTC" with 30% variable and ₹8 LPA in ESOPs is very
  different from ₹40 LPA fixed base.
- Treat joining bonuses as one-time — subtract them before comparing
  year-over-year take-home.
- Flag **ESOP notional as illiquid** for private companies. Apply a mental
  discount proportional to funding-stage risk (Series A > Series C > late-
  stage growth > public).
- Indian income tax is steep above ₹15 LPA. "In-hand" after tax matters
  more than headline CTC — mention this when relevant.

### Notice period and joining
- **30 / 60 / 90 days** are the common notice-period bands. 90 days is
  standard at Indian IT services companies (TCS, Infosys, Wipro, Accenture
  India) and a real blocker for candidates negotiating start dates.
- **Buyout** is normal — employers frequently pay 1–3 months of salary to
  shorten notice. Flag this as a negotiation lever when the JD demands a
  <30-day joining.
- If the JD requires "immediate joiner" or "<15 days", flag it as either
  (a) a desperation signal about bench, or (b) an assumption that the
  candidate is already unemployed. Ask which.

### Company-type pattern recognition
- **Indian IT services** (TCS / Infosys / Wipro / HCL / LTI / Mindtree /
  Cognizant / Accenture India / Capgemini India) — large, predictable
  bands, bench risk, client-site deployment norms. Comp tops out fast
  unless in niche skills.
- **GCC / Captive** (Walmart Labs, Target, Lowe's India, Mastercard, JPMC,
  Goldman, Cisco, etc.) — Global Capability Centers of MNCs. Stronger
  bands, more stability, less ownership than startups.
- **Indian product startups** (Razorpay, Zerodha, Groww, CRED, Zepto,
  Zomato, Swiggy, Meesho, Dream11, PhonePe) — aggressive comp in cash +
  ESOPs, faster growth, higher volatility. Apply the ESOP illiquidity
  discount above.
- **US/EU-HQ product companies with India hubs** (Databricks, Stripe,
  Airbnb, Uber, Atlassian, Adobe India, Microsoft IDC) — typically pay
  top quartile INR, retain US-style total-comp structure.
- **Unicorns-in-trouble** — check news for layoffs, down-rounds, founder
  exits before scoring comp. Use WebSearch.

### Metro relocation
- The big six: **Bengaluru (BLR), Hyderabad (HYD), Gurugram (DEL-NCR),
  Mumbai (MUM), Pune (PNQ), Chennai (MAA)**. Bengaluru is the default for
  tech; HYD is #2 and rising; Gurugram for fintech/consulting.
- "Hybrid" often means **full relocation required** even if the JD says
  "3 days / week" — you still need to live in the metro. Flag as a red
  flag if the candidate's current location isn't the posting metro AND the
  role is mid-level or lower (not worth relocating for).
- Relocation assistance is common but rarely generous. Typical packages:
  ₹1-3 LPA lumpsum, 2-4 weeks temporary housing. Ask the candidate to
  negotiate.

### ESOP and equity norms
- Standard vesting: **4 years with a 1-year cliff**. Anything longer is a
  yellow flag.
- Ask about **strike price** (relevant for exercising before listing) and
  **ISO vs RSU vs "phantom stock"** (common in services companies —
  usually worthless).
- **Double-trigger vesting** (acceleration only on change-of-control +
  involuntary termination) is the candidate-friendly norm. Single-trigger
  or no acceleration is a dealbreaker for senior hires.
- If ESOPs are >40% of advertised CTC, explicitly warn the candidate and
  score comp using base + variable only as the primary number.

### Red flags specific to India
- "Competitive salary" with no band = below-market.
- Services-company posture: "minimum 3 years bond", "notice period buyback
  by candidate", "certification costs recovered from candidate" — all
  dealbreakers.
- Night shift / graveyard shift without 25%+ shift allowance.
- "Flexible hours" that actually mean "overlap with US EST" (= night shift).
- References to "NASSCOM guidelines" on comp = the company pays the
  absolute floor.
`;
}
