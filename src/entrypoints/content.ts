// WXT content script entrypoint. One script, many detectors — see ../content/*.
import { defineContentScript } from 'wxt/utils/define-content-script';
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
    // India market port — narrow to detail-page paths where possible so
    // the content script doesn't run on landing/search pages.
    'https://*.naukri.com/job-listings-*',
    'https://*.naukri.com/jobs/*',
    'https://*.naukri.com/job/*',
    'https://*.foundit.in/job/*',
    'https://*.foundit.in/seeker/*',
    'https://*.monsterindia.com/job/*',
    'https://www.instahyre.com/job-*',
    'https://www.instahyre.com/job/*',
    'https://hirist.tech/j/*',
    'https://hirist.tech/job/*',
    'https://cutshort.io/job/*',
    'https://cutshort.io/jobs/*',
    'https://*.shine.com/jobs/*',
    'https://*.shine.com/job/*',
  ],
  runAt: 'document_idle',
  allFrames: false,
  main(ctx) {
    mountContent(ctx);
  },
});
