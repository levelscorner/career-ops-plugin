// Dispatcher: picks the first detector that claims the current page.
// Detectors are tried in specificity order (most specific first).

import type { JobPosting } from '../shared/types';
import type { Detector } from './detectors/types';
import { linkedinDetector } from './detectors/linkedin';
import { greenhouseDetector } from './detectors/greenhouse';
import { ashbyDetector } from './detectors/ashby';
import { leverDetector } from './detectors/lever';
import { genericDetector } from './detectors/generic';

const DETECTORS: readonly Detector[] = [
  linkedinDetector,
  greenhouseDetector,
  ashbyDetector,
  leverDetector,
  genericDetector,
];

export function pickDetector(url: URL): Detector | null {
  return DETECTORS.find((d) => d.matches(url)) ?? null;
}

export function extractCurrentJob(): JobPosting | null {
  const url = new URL(window.location.href);
  const detector = pickDetector(url);
  if (!detector) return null;
  try {
    return detector.extract();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(`[career-ops] ${detector.id} detector failed`, err);
    return null;
  }
}
