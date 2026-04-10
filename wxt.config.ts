import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

// WXT config for Ronin. Cross-browser MV3 extension with React.
// https://wxt.dev/api/config.html
export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Ronin',
    short_name: 'Ronin',
    description:
      'AI-powered job evaluation — score, track, and generate tailored CVs from any job posting.',
    version: '0.1.0',

    permissions: [
      'storage',
      'sidePanel',
      'offscreen',
      'alarms',
      'clipboardRead',
      'scripting',
      'activeTab',
    ],
    host_permissions: [
      'https://*.linkedin.com/*',
      'https://boards.greenhouse.io/*',
      'https://boards-api.greenhouse.io/*',
      'https://jobs.ashbyhq.com/*',
      'https://api.ashbyhq.com/*',
      'https://jobs.lever.co/*',
      'https://api.lever.co/*',
      'https://wellfound.com/*',
      'https://*.workable.com/*',
      'https://jobs.smartrecruiters.com/*',
      'https://api.smartrecruiters.com/*',
      // India market port
      'https://*.naukri.com/*',
      'https://*.foundit.in/*',
      'https://*.monsterindia.com/*',
      'https://www.instahyre.com/*',
      'https://instahyre.com/*',
      'https://hirist.tech/*',
      'https://*.hirist.tech/*',
      'https://cutshort.io/*',
      'https://*.cutshort.io/*',
      'https://*.shine.com/*',
      // LLM endpoint
      'https://api.anthropic.com/*',
    ],
    action: {
      default_title: 'Ronin',
      default_popup: 'popup.html',
    },
    side_panel: {
      default_path: 'sidepanel.html',
    },
    // icons intentionally omitted until real PNGs land in src/public/icons/.
    // Chrome uses a default puzzle-piece icon meanwhile.
    web_accessible_resources: [
      {
        resources: ['fonts/*.woff2'],
        matches: ['<all_urls>'],
      },
    ],
  },
  vite: () => ({
    plugins: [tailwindcss()],
  }),
});
