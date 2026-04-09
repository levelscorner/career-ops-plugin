// WXT content script entrypoint. One script, many detectors — see ../content/*.
import { defineContentScript } from 'wxt/sandbox';
import { mountContent } from '../content';

export default defineContentScript({
  matches: [
    'https://*.linkedin.com/jobs/*',
    'https://boards.greenhouse.io/*',
    'https://jobs.ashbyhq.com/*',
    'https://jobs.lever.co/*',
    'https://wellfound.com/jobs/*',
    'https://wellfound.com/company/*',
    'https://*.workable.com/j/*',
    'https://jobs.smartrecruiters.com/*',
  ],
  runAt: 'document_idle',
  allFrames: false,
  main(ctx) {
    mountContent(ctx);
  },
});
